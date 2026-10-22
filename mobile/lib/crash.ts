// Crash capture. The last JS error is kept on this phone, scrubbed of personal data (lib/scrub.ts) BEFORE it is stored,
// so the note a user can attach to a support email never carries names, emails, passport numbers or file names.
// The crash service (Sentry, lib/sentry.ts) plugs in with setCrashSink(); it receives the same scrubbed report and
// only when "Share usage data" is on.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scrubText } from "./scrub";
import { usageSharingAllowed } from "./privacy";

const KEY = "ezvisa.crash.v1";
export type CrashReport = { at: number; fatal: boolean; message: string; stack: string };
let sink: ((r: CrashReport) => void) | null = null;
export function setCrashSink(fn: ((r: CrashReport) => void) | null) { sink = fn; }

export function toReport(err: unknown, fatal: boolean): CrashReport {
  const e = err as { name?: string; message?: string; stack?: string } | undefined;
  return { at: Date.now(), fatal, message: scrubText(`${e?.name && e.name !== "Error" ? `${e.name}: ` : ""}${e?.message ?? String(err)}`, 500), stack: scrubText(e?.stack ?? "", 3000) };
}

export function recordError(err: unknown, fatal = false) {
  const r = toReport(err, fatal);
  AsyncStorage.setItem(KEY, JSON.stringify(r)).catch(() => {});
  if (sink && usageSharingAllowed()) { try { sink(r); } catch { /* never let reporting crash the app */ } }
  return r;
}

let installed = false;
export function installCrashHandler() {
  const EU: any = (globalThis as any).ErrorUtils; if (installed || !EU?.setGlobalHandler) return;
  installed = true;
  const prev = EU.getGlobalHandler?.();
  EU.setGlobalHandler((err: any, fatal?: boolean) => { recordError(err, !!fatal); prev?.(err, fatal); });
}

export async function lastCrash(): Promise<CrashReport | null> {
  try {
    const r = await AsyncStorage.getItem(KEY); if (!r) return null;
    const c = JSON.parse(r) as CrashReport;
    return { ...c, message: scrubText(c.message, 500), stack: scrubText(c.stack, 3000) }; // also cleans reports saved by older versions
  } catch { return null; }
}
