// Ziina checkout through www.ezvisa.net. The app never sees a Ziina key and never decides "paid" itself:
// - the payment link comes from the website's POST /api/create-payment (the server prices the application);
// - the result comes from the server: visa_applications.payment_status (Supabase, set by the Ziina webhook),
//   GET /api/check-payment?applicationId= (server sync, once deployed) and GET /api/check-payment?id= for the
//   payment id the server returned to this device. Deep-link / URL parameters are never used to decide success.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { siteUrl } from "./config";

/** Ziina payment intent statuses that can still be paid (docs.ziina.com/api-reference/payment-intent). */
export const OPEN_INTENT = ["requires_payment_instrument", "requires_user_action", "pending"];
const KEY = "ezvisa.payments.v1";
const REUSE_FOR = 60 * 60 * 1000; // reopen the same checkout for an hour instead of creating a new payment
const KEEP_FOR = 7 * 24 * 60 * 60 * 1000; // keep the id this long to verify a payment after the app was killed

/** A checkout this device opened. Every field comes from the website's create-payment response. */
export type OpenPayment = { appId: string; paymentId: string; redirectUrl: string; back: string; amount: number | null; currency: string; at: number; shown?: string };
export type Quote = { amount: number; currency: string };
export type ServerStatus = { payment_status: string; open: boolean; amount: number | null; currency: string };
export type PayOutcome = { returned: "success" | "cancel" | "closed" };

async function readAll(): Promise<Record<string, OpenPayment>> {
  try { const m = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}"); return m && typeof m === "object" ? m : {}; } catch { return {}; }
}
async function update(fn: (m: Record<string, OpenPayment>) => void) {
  const m = await readAll(); fn(m);
  for (const k of Object.keys(m)) if (Date.now() - m[k].at > KEEP_FOR) delete m[k];
  try { await AsyncStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable: verification falls back to the server row */ }
}
export async function knownPayment(appId: string): Promise<OpenPayment | null> {
  const p = (await readAll())[appId]; return p && Date.now() - p.at < KEEP_FOR ? p : null;
}
export async function knownPayments(): Promise<OpenPayment[]> {
  return Object.values(await readAll()).filter((p) => Date.now() - p.at < KEEP_FOR);
}
export const forgetPayment = (appId: string) => update((m) => { delete m[appId]; });

const getJson = async (path: string) => {
  const r = await fetch(siteUrl(path), { headers: { "Cache-Control": "no-cache" } }); // network errors throw (offline)
  return { ok: r.ok, status: r.status, j: (await r.json().catch(() => ({}))) as any };
};

/** Ziina status of a payment id this device received from create-payment (website proxy; null if unknown). Throws offline. */
export async function intentStatus(paymentId: string): Promise<string | null> {
  const { ok, j } = await getJson(`/api/check-payment?id=${encodeURIComponent(paymentId)}`);
  return ok && typeof j.status === "string" ? j.status : null;
}

/** Server-verified state of one application (GET /api/check-payment?applicationId=). Null until that endpoint is
 *  deployed or when it is unavailable. Throws offline. */
export async function serverStatus(appId: string): Promise<ServerStatus | null> {
  const { ok, j } = await getJson(`/api/check-payment?applicationId=${encodeURIComponent(appId)}`);
  if (!ok || typeof j.payment_status !== "string") return null;
  return { payment_status: j.payment_status, open: !!j.open, amount: typeof j.amount === "number" ? j.amount : null, currency: typeof j.currency === "string" ? j.currency : "AED" };
}

/** Price to show before paying: only a server number (check-payment quote, or the amount of this device's open
 *  checkout from create-payment). Null means "don't show a price". */
export async function getQuote(appId: string): Promise<Quote | null> {
  try { const s = await serverStatus(appId); if (s?.amount != null) return { amount: s.amount, currency: s.currency }; } catch { /* offline */ }
  const p = await knownPayment(appId);
  return p?.amount != null ? { amount: p.amount, currency: p.currency } : null;
}

/** An open checkout for this application that can be reopened instead of creating a second payment. */
async function reusable(appId: string, back: string): Promise<OpenPayment | "paid" | null> {
  const p = await knownPayment(appId);
  if (!p || p.back !== back || Date.now() - p.at > REUSE_FOR) return null;
  const s = await intentStatus(p.paymentId).catch(() => null);
  if (s === "completed") return "paid";
  return s && OPEN_INTENT.includes(s) ? p : null;
}

const payError = (status: number, j: any) => {
  const e: any = new Error(status === 409 ? "This application is already paid." : status >= 500 ? "Online card payment isn't available right now. You can pay on WhatsApp and we'll send a secure link." : j?.error || `Could not create the payment link (${status})`);
  e.fallbackWhatsApp = status !== 409; e.alreadyPaid = status === 409; e.detail = j?.error; return e;
};

/** One payment at a time across the whole app (double taps, two buttons, retry while open). */
let paying = false;
const listeners = new Set<(b: boolean) => void>();
const setPaying = (b: boolean) => { paying = b; listeners.forEach((l) => l(b)); };
export const isPaying = () => paying;
export function onPayingChange(l: (b: boolean) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/** Ziina checkout in an in-app auth session. Success/cancel go to www.ezvisa.net/app-return, which deep-links back
 *  (ezvisa:// in builds, exp:// in Expo Go). `returned` only says how the browser closed, never whether it was paid. */
export async function startPayment(appId: string): Promise<PayOutcome> {
  if (paying) throw Object.assign(new Error("Payment is already open."), { busy: true });
  setPaying(true);
  try {
    const back = ExpoLinking.createURL("payment-return");
    const ret = (r: "success" | "cancel") => { const u = new URL("/app-return", siteUrl("/")); u.searchParams.set("r", r); u.searchParams.set("appId", appId); u.searchParams.set("to", back); return u.toString(); };
    let open = await reusable(appId, back);
    if (open === "paid") return { returned: "success" };
    if (!open) {
      // The server prices the application; the app sends no amount.
      const r = await fetch(siteUrl("/api/create-payment"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, success_url: ret("success"), cancel_url: ret("cancel") }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || !j.redirect_url || !j.id) throw payError(r.status, j);
      const created: OpenPayment = { appId, paymentId: String(j.id), redirectUrl: String(j.redirect_url), back, amount: typeof j.amount === "number" ? j.amount / 100 : null, currency: typeof j.currency_code === "string" ? j.currency_code : "AED", at: Date.now() };
      open = created;
      await update((m) => { m[appId] = created; });
    }
    const res = await WebBrowser.openAuthSessionAsync(open.redirectUrl, back, { preferEphemeralSession: false });
    const url = res.type === "success" ? res.url : "";
    return { returned: !url ? "closed" : /[?&]r=cancel\b/.test(url) ? "cancel" : "success" };
  } finally { setPaying(false); }
}

/** After a relaunch: an application whose checkout this device opened and Ziina now reports as paid or processing,
 *  so its result can be shown again. Null when there is nothing to show or the network is down. */
export async function paymentToResume(isPaidInDb: (appId: string) => Promise<boolean | null>): Promise<string | null> {
  for (const p of (await knownPayments()).sort((a, b) => b.at - a.at)) {
    const s = await intentStatus(p.paymentId).catch(() => null);
    if ((s === "completed" || s === "pending" || s === "requires_user_action") && p.shown !== s) {
      if ((await isPaidInDb(p.appId).catch(() => null)) === true) { await forgetPayment(p.appId); continue; }
      await update((m) => { if (m[p.appId]) m[p.appId].shown = s; }); // once per status, not on every launch
      return p.appId;
    }
  }
  return null;
}

/** Server price for an application (see getQuote), refreshed when `key` changes. */
export function useQuote(appId: string | null | undefined, key?: unknown): Quote | null {
  const [q, setQ] = useState<Quote | null>(null);
  useEffect(() => { let on = true; if (appId) getQuote(appId).then((x) => on && setQ(x)).catch(() => {}); return () => { on = false; }; }, [appId, key]);
  return q;
}
export function usePaying() {
  const [b, setB] = useState(paying);
  useEffect(() => onPayingChange(setB), []);
  return b;
}
export const money = (q: Quote | null) => (q ? `${Number(q.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${q.currency}` : "");
