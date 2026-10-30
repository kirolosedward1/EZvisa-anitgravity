// Crash reporting to Sentry (approved 2026-10-22) with a small built-in client instead of @sentry/react-native.
// Why: in Expo Go the SDK can only report JavaScript errors anyway, and it cost +1.4 MB of bundle and 160-260 ms of cold
// start in our measurements (docs/PERFORMANCE-CHAT14.md). This client sends the same Sentry events (envelope API v7) for
// JS errors. Switch to @sentry/react-native (npx expo install) with the first development build to get native crashes.
//
// Off until EXPO_PUBLIC_SENTRY_DSN is set (.env and the EAS environment). Nothing is sent while "Share usage data" is off.
// Every event is built from the already-scrubbed crash report (lib/crash.ts) and scrubbed again (scrubCrashEvent).
// No user, IP, device name, screenshots or breadcrumbs. Reports wait in a small queue when offline or when the app dies
// before the request finishes, and are sent on the next start.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { setCrashSink, recordError, type CrashReport } from "./crash";
import { scrubCrashEvent } from "./scrub";
import { usageSharingAllowed, loadUsageSharing } from "./privacy";

const DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN || "").trim();
const M = DSN.match(/^https:\/\/([0-9a-f]{16,64})@([\w.-]+)\/(\d+)$/);
export const SENTRY_ENABLED = !!M;
const ENDPOINT = M ? `https://${M[2]}/api/${M[3]}/envelope/?sentry_key=${M[1]}&sentry_version=7&sentry_client=ezvisa-app%2F1` : "";
const QUEUE = "ezvisa.crashq.v1"; const QUEUE_MAX = 10;

type Frame = { function?: string; filename?: string; lineno?: number; colno?: number; in_app: boolean };
/** Hermes / V8 / JSC stack text -> Sentry frames (oldest call first, as Sentry expects). */
export function parseStack(stack: string): Frame[] {
  const frames: Frame[] = [];
  for (const line of stack.split("\n").slice(0, 50)) {
    const m = line.trim().match(/^(?:at )?(?:(.*?) ?\()?(?:address at )?([^()\s]+?):(\d+):(\d+)\)?$/) ?? line.trim().match(/^(.*?)@(.+?):(\d+):(\d+)$/);
    if (!m) continue;
    const file = m[2];
    frames.push({ function: m[1] || "?", filename: file, lineno: Number(m[3]), colno: Number(m[4]), in_app: !/node_modules|\[native code\]/.test(file) });
  }
  return frames.reverse();
}

const hex32 = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
export function buildEvent(r: CrashReport) {
  const [, type = "Error", value = r.message] = r.message.match(/^([A-Za-z]*Error): (.*)$/s) ?? [];
  return scrubCrashEvent({
    event_id: hex32(), timestamp: r.at / 1000, platform: "javascript", level: r.fatal ? "fatal" : "error",
    release: `ezvisa@${Constants.expoConfig?.version ?? "0"}`, environment: __DEV__ ? "development" : ((Constants.expoConfig?.extra as { variant?: string } | undefined)?.variant ?? "preview"),
    exception: { values: [{ type, value, mechanism: { type: r.fatal ? "onerror" : "generic", handled: !r.fatal }, stacktrace: { frames: parseStack(r.stack) } }] },
    contexts: { os: { name: Platform.OS, version: String(Platform.Version ?? "") }, app: { app_version: Constants.expoConfig?.version ?? "" } },
    tags: { runtime: Constants.executionEnvironment ?? "unknown" },
  });
}
export const buildEnvelope = (event: { event_id: string }) =>
  `${JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`;

async function readQueue(): Promise<object[]> { try { const q = JSON.parse((await AsyncStorage.getItem(QUEUE)) ?? "[]"); return Array.isArray(q) ? q : []; } catch { return []; } }
const writeQueue = (q: object[]) => AsyncStorage.setItem(QUEUE, JSON.stringify(q.slice(-QUEUE_MAX))).catch(() => {});
let sending = false;
/** Sends queued events; keeps them on network errors, drops them on any HTTP answer (accepted or rejected). */
export async function flushCrashes() {
  if (!SENTRY_ENABLED || sending || !(await loadUsageSharing())) return;
  sending = true;
  try {
    const q = await readQueue(); const left: object[] = [];
    for (const ev of q) {
      try { await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: buildEnvelope(ev as { event_id: string }) }); }
      catch { left.push(ev); }
    }
    await writeQueue(left);
  } finally { sending = false; }
}
async function enqueue(r: CrashReport) {
  if (!usageSharingAllowed()) return;
  await writeQueue([...(await readQueue()), buildEvent(r)]); // stored first: a fatal error can end the app before fetch finishes
  flushCrashes();
}

let started = false;
export function initSentry() {
  if (!SENTRY_ENABLED || started) return;
  started = true;
  setCrashSink((r) => { enqueue(r); });
  flushCrashes(); // anything left from the last run
}

/** Non-fatal test report from Account › Diagnostics. The message deliberately contains the user's own name and email,
 *  so the Sentry dashboard (and the diagnostics "Last error") shows that they were removed. */
export function sendTestError(personal: string[]) {
  if (!SENTRY_ENABLED) return false;
  recordError(new Error(`EZvisa test error (diagnostics) for ${personal.filter(Boolean).join(" ")}`), false);
  return true;
}
