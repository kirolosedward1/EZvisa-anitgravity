// Anonymous product analytics. No personal data: every event and property is on an allowlist below (fixed ids,
// enums, numbers, booleans; no free text). Nothing is recorded when the user has turned off "Share anonymous usage data".
//
// Where events go:
// - A ring buffer on this phone (drop-off diagnostics, last 300 events).
// - An outbox (AsyncStorage) that is flushed to public.wizard_events (migrations/0004: insert-only, anonymous session id)
//   when online. Offline events wait in the outbox and are sent later; the outbox survives restarts.
// - The 4 original events always work. The funnel events (step viewed/completed, payment, upload, app_start) need
//   migrations/0008 (approved 2026-10-22). If the server rejects them (0008 not applied yet), the app drops them, re-sends
//   the original events alone and tries the funnel again 24 hours later, so it starts working without an app update.
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { COUNTRY_LIST } from "./countries";
import { loadUsageSharing, usageSharingAllowed, onUsageSharingChange } from "./privacy";

type Step = "personal" | "spouse" | "employment" | "trip-details" | "payment" | "review";
type DocType = "passportCopy" | "residencyCopy" | "photo" | "bankStatement" | "nocCertificate" | "salaryCertificate" | "other";
/** The complete event catalogue. Adding an event means adding it here, with only safe properties. */
export type Events = {
  wizard_open: Record<string, never>;
  wizard_close: Record<string, never>;
  /** One question shown (`page` is the question id, e.g. "passportNumber"; never the answer). */
  wizard_page: { page: string; destination?: string; signedIn?: boolean };
  wizard_step_viewed: { step: Step };
  wizard_step_completed: { step: Step };
  /** Wizard finished (application submitted). */
  wizard_submit: { guest?: boolean };
  payment_started: { retry?: boolean };
  /** Outcome as verified by the result screen (database / Ziina status), not the return URL. */
  payment_finished: { outcome: "paid" | "pending" | "failed" | "cancelled" };
  upload_done: { docType: DocType; ok: boolean };
  /** Cold start: JS start to first screen, in ms. */
  app_start: { ms: number };
};
export type EventName = keyof Events;

const LEGACY = new Set<EventName>(["wizard_open", "wizard_page", "wizard_submit", "wizard_close"]);
const FUNNEL_KEY = "ezvisa.funnel.v1"; const FUNNEL_RETRY_MS = 24 * 3600_000;
/** null until loaded; false for 24 h after the server rejected funnel events (table without migrations/0008). */
let funnelOn: boolean | null = null;
const loadFunnel = () => AsyncStorage.getItem(FUNNEL_KEY).then((v) => { funnelOn = !(v && Date.now() - Number(v) < FUNNEL_RETRY_MS); }, () => { funnelOn = true; });
const STEPS = new Set(["personal", "spouse", "employment", "trip-details", "payment", "review"]);
const DOCS = new Set(["passportCopy", "residencyCopy", "photo", "bankStatement", "nocCertificate", "salaryCertificate"]);
const OUTCOMES = new Set(["paid", "pending", "failed", "cancelled"]);
const DESTINATIONS = new Set(COUNTRY_LIST);
const ID = /^[a-zA-Z][a-zA-Z-]{0,47}$/; // code identifiers only (letters and hyphens, no digits)

type Props = Record<string, string | number | boolean>;
/** Keeps only allowlisted keys with valid values; everything else is dropped. Exported for tests. */
export function safeProps(e: string, p: Record<string, unknown> = {}): Props {
  const out: Props = {};
  const str = (k: string, ok: (v: string) => boolean) => { const v = p[k]; if (typeof v === "string" && ok(v)) out[k] = v; };
  const bool = (k: string) => { if (typeof p[k] === "boolean") out[k] = p[k] as boolean; };
  if (e === "wizard_page") { str("page", (v) => ID.test(v)); str("destination", (v) => DESTINATIONS.has(v)); bool("signedIn"); }
  if (e === "wizard_step_viewed" || e === "wizard_step_completed") str("step", (v) => STEPS.has(v));
  if (e === "wizard_submit") bool("guest");
  if (e === "payment_started") bool("retry");
  if (e === "payment_finished") str("outcome", (v) => OUTCOMES.has(v));
  if (e === "upload_done") { const d = p.docType; out.docType = typeof d === "string" && DOCS.has(d) ? d : "other"; bool("ok"); }
  if (e === "app_start" && typeof p.ms === "number" && isFinite(p.ms)) out.ms = Math.max(0, Math.min(120_000, Math.round(p.ms)));
  return out;
}

// ---- session (anonymous, random, new per wizard run) ----
let session = "";
const newSession = () => { session = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; };

// ---- local ring buffer ----
const KEY = "ezvisa.events.v1"; const MAX = 300;
export type Ev = { e: string; at: number; p?: Props };
let buf: Ev[] | null = null; let bufP: Promise<Ev[]> | null = null; let saveT: ReturnType<typeof setTimeout> | null = null;
/** One shared load, so events tracked before storage has been read all land in the same array. */
function load() { if (buf) return Promise.resolve(buf); return (bufP ??= AsyncStorage.getItem(KEY).then((r) => JSON.parse(r ?? "[]") as Ev[]).catch(() => [] as Ev[]).then((b) => (buf ??= Array.isArray(b) ? b : []))); }

// ---- outbox (offline-safe) ----
type Row = { session_id: string; event: string; page: string | null; destination: string | null; platform: string; app_version: string | null; signed_in: boolean | null; outcome?: string | null; ms?: number | null };
const OUT = "ezvisa.outbox.v1"; const OUT_MAX = 200;
let outbox: Row[] | null = null; let outP: Promise<Row[]> | null = null; let flushing = false; let flushT: ReturnType<typeof setTimeout> | null = null; let failures = 0;
function loadOut() { if (outbox) return Promise.resolve(outbox); return (outP ??= AsyncStorage.getItem(OUT).then((r) => JSON.parse(r ?? "[]") as Row[]).catch(() => [] as Row[]).then((q) => (outbox ??= Array.isArray(q) ? q : []))); }
const saveOut = () => AsyncStorage.setItem(OUT, JSON.stringify(outbox ?? [])).catch(() => {});
function scheduleFlush(ms = 2000) { if (flushT) clearTimeout(flushT); flushT = setTimeout(() => { flushT = null; flush(); }, ms); }

/** Sends queued rows in one insert. Network or server errors keep them for later (backoff); a rejected row is dropped. */
export async function flush() {
  if (flushing || !supabase || !usageSharingAllowed()) return;
  const q = await loadOut(); if (!q.length) return;
  const net = await NetInfo.fetch().catch(() => null);
  if (net && net.isConnected === false) return; // NetInfo listener flushes when back online
  flushing = true;
  const batch = q.slice(0, 50);
  try {
    const { error, status } = await supabase.from("wizard_events" as any).insert(batch as any);
    if (!error) { outbox = q.slice(batch.length); failures = 0; await saveOut(); if (outbox.length) scheduleFlush(500); return; }
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      if (batch.some((r) => !LEGACY.has(r.event as EventName))) {
        // The table doesn't take the funnel events yet: keep the original events, retry the funnel tomorrow.
        funnelOn = false; AsyncStorage.setItem(FUNNEL_KEY, String(Date.now())).catch(() => {});
        outbox = q.filter((r) => LEGACY.has(r.event as EventName)).map(({ outcome: _o, ms: _m, ...r }) => r); await saveOut(); if (outbox.length) scheduleFlush(500); return;
      }
      outbox = q.slice(batch.length); await saveOut(); return; // rejected: don't retry forever
    }
    throw error;
  } catch {
    failures++; scheduleFlush(Math.min(5 * 60_000, 2000 * 2 ** failures));
  } finally { flushing = false; }
}

/** Record an event. Typed: only catalogued events and properties compile, and values are re-checked at runtime. */
export function track<E extends EventName>(e: E, p?: Events[E]) {
  if (!usageSharingAllowed()) return;
  const props = safeProps(e, p as Record<string, unknown>);
  if (e === "wizard_open" || !session) newSession();
  load().then((b) => {
    b.push({ e, at: Date.now(), ...(Object.keys(props).length ? { p: props } : {}) }); if (b.length > MAX) b.splice(0, b.length - MAX);
    if (saveT) clearTimeout(saveT); saveT = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(b)).catch(() => {}), 500);
  });
  if (!LEGACY.has(e) && funnelOn === false) return; // phone only until the table takes funnel events
  const row: Row = { session_id: session, event: e, page: ((props.page ?? props.step ?? props.docType) as string) ?? null, destination: (props.destination as string) ?? null,
    platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web", app_version: (Constants.expoConfig?.version ?? "").slice(0, 32) || null,
    signed_in: typeof props.signedIn === "boolean" ? props.signedIn : null };
  // outcome / ms exist only after migrations/0008; legacy events never carry them, so today's inserts are unchanged.
  if (!LEGACY.has(e)) { row.outcome = (props.outcome as string) ?? (typeof props.ok === "boolean" ? (props.ok ? "ok" : "failed") : props.retry === true ? "retry" : null); row.ms = (props.ms as number) ?? null; }
  loadOut().then((q) => { q.push(row); if (q.length > OUT_MAX) q.splice(0, q.length - OUT_MAX); saveOut(); scheduleFlush(); });
}

/** Deletes everything recorded on this phone (used when the user turns sharing off). */
export async function clearAnalytics() {
  buf = []; outbox = [];
  await AsyncStorage.multiRemove([KEY, OUT]).catch(() => {});
}

let started = false;
/** Called once from the root layout: loads the user's choice, flushes on reconnect and when the app comes to the front. */
export function startAnalytics() {
  if (started) return; started = true;
  loadFunnel();
  loadUsageSharing().then((on) => { if (on) flush(); else clearAnalytics(); });
  onUsageSharingChange((on) => { if (!on) clearAnalytics(); });
  let online = true;
  NetInfo.addEventListener((s) => { const was = online; online = s.isConnected !== false; if (online && !was) { failures = 0; flush(); } });
  AppState.addEventListener("change", (s) => { if (s === "active") flush(); });
}

export async function events() { return [...(await load())]; }
export async function pendingEvents() { return (await loadOut()).length; }
/** Last question seen per wizard session that did not end in a submit = the drop-off point. */
export async function dropOff(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}; let last: string | null = null;
  for (const ev of await load()) {
    if (ev.e === "wizard_open") { if (last) out[last] = (out[last] ?? 0) + 1; last = null; }
    if (ev.e === "wizard_page") last = String(ev.p?.page ?? "");
    if (ev.e === "wizard_submit") last = null;
  }
  if (last) out[last] = (out[last] ?? 0) + 1;
  return out;
}
