import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { SITE_URL, siteUrl, WHATSAPP, EMAIL, PRICE_AED } from "./config";

const sheet = { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, controlsColor: "#0436DC" } as const;
export const openWeb = (path: string) => WebBrowser.openBrowserAsync(siteUrl(path), { ...sheet, dismissButtonStyle: "close" });
export const shareUrl = (path = "/") => siteUrl(path);
export const whatsapp = (msg = "Hi EZvisa, I need help with my Schengen visa.") =>
  Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`);
/** How an application is named in support messages: the reference customers see plus the full id staff search by.
 *  Nothing personal (no passport number, name or dates). */
export const appTag = (a: { id: string; reference: string }) => `${a.reference} (ID ${a.id})`;
export const email = async () => {
  const { lastCrash } = require("./crash") as typeof import("./crash"); const c = await lastCrash();
  const body = c ? `\n\n---\nApp error (${new Date(c.at).toISOString()}): ${c.message}` : "";
  return Linking.openURL(`mailto:${EMAIL}?subject=EZvisa%20enquiry${body ? `&body=${encodeURIComponent(body)}` : ""}`);
};

export type { WizardForm as ApplicationForm } from "./wizard";

/** Website price: 249 AED, doubled when the spouse travels (web components/apply/payment-step.tsx). */
export const priceFor = (spouse: boolean) => PRICE_AED * (spouse ? 2 : 1);

/** Ziina checkout in an in-app auth session. Success/cancel go to www.ezvisa.net/app-return, which deep-links back to
 *  this app (ezvisa:// in builds, exp:// in Expo Go). The outcome is NOT trusted: the result screen checks the database.
 *  A module-level lock guards against double taps. */
let paying = false;
export type PayOutcome = { paymentId: string | null; returned: "success" | "cancel" | "closed" };
export async function startPayment(a: { id: string; destination_country: string | null; total_amount?: number }, spouse: boolean): Promise<PayOutcome> {
  if (paying) throw Object.assign(new Error("Payment is already open."), { busy: true });
  paying = true;
  try {
    const back = ExpoLinking.createURL("payment-return");
    const ret = (r: "success" | "cancel") => { const u = new URL("/app-return", "https://www.ezvisa.net"); u.searchParams.set("r", r); u.searchParams.set("appId", a.id); u.searchParams.set("to", back); return u.toString(); };
    const amount = a.total_amount ?? priceFor(spouse); // ignored by the server, which prices the application itself
    const r = await fetch(siteUrl("/api/create-payment"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: a.id, amount, currency: "AED", success_url: ret("success"), cancel_url: ret("cancel"), test: false }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || !j.redirect_url) {
      const e: any = new Error(r.status === 409 ? "This application is already paid." : r.status >= 500 ? "Online card payment isn't available right now. You can pay on WhatsApp and we'll send a secure link." : j.error || `Could not create the payment link (${r.status})`);
      e.fallbackWhatsApp = r.status !== 409; e.alreadyPaid = r.status === 409; e.detail = j.error; throw e;
    }
    const res = await WebBrowser.openAuthSessionAsync(j.redirect_url, back, { preferEphemeralSession: false });
    const url = res.type === "success" ? res.url : "";
    const returned: PayOutcome["returned"] = !url ? "closed" : /[?&]r=cancel\b/.test(url) ? "cancel" : "success";
    return { paymentId: String(j.id), returned };
  } finally { paying = false; }
}

/** The Ziina payment intent as returned by the website's GET /api/check-payment?id=… (a passthrough of Ziina's
 *  /payment_intent/{id}). Amount is in fils. Null when the route or Ziina can't be reached. */
export type PaymentIntent = { id: string; status: string; amount: number | null; currency: string | null; created_at: string | null };
export async function paymentIntent(paymentId: string): Promise<PaymentIntent | null> {
  try {
    const r = await fetch(siteUrl(`/api/check-payment?id=${encodeURIComponent(paymentId)}`));
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || typeof j.status !== "string") return null;
    const amount = Number(j.amount); const raw = j.created_at; const num = typeof raw === "number" || /^\d+$/.test(String(raw ?? "")) ? Number(raw) : NaN;
    const at = raw ? new Date(Number.isFinite(num) ? (num < 1e12 ? num * 1000 : num) : raw) : null; // epoch s / ms or ISO
    return { id: String(j.id ?? paymentId), status: j.status, amount: Number.isFinite(amount) && amount > 0 ? amount : null, currency: typeof j.currency_code === "string" ? j.currency_code.toUpperCase() : null, created_at: at && !isNaN(at.getTime()) ? at.toISOString() : null };
  } catch { return null; }
}
/** Ziina statuses where money may still move: deleting the account now could orphan a payment. */
export const PAYMENT_IN_FLIGHT = ["pending", "requires_user_action", "processing"];

/** Ziina status through the website's GET /api/check-payment?id=… (completed | pending | failed | …). */
export async function checkPayment(paymentId: string): Promise<string | null> {
  try {
    const r = await fetch(siteUrl(`/api/check-payment?id=${encodeURIComponent(paymentId)}`));
    const j: any = await r.json().catch(() => ({}));
    return r.ok && typeof j.status === "string" ? j.status : null;
  } catch { return null; }
}
