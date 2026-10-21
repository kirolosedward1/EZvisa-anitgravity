// Crash capture WITHOUT a service key: the last JS fatal error is kept on this phone and can be attached to a
// support email. Real crash reporting (native crashes, symbolication, alerts) needs a service such as Sentry: [KEY].
import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "ezvisa.crash.v1";
export function installCrashHandler() {
  const EU: any = (globalThis as any).ErrorUtils; if (!EU?.setGlobalHandler) return;
  const prev = EU.getGlobalHandler?.();
  EU.setGlobalHandler((err: any, fatal?: boolean) => {
    AsyncStorage.setItem(KEY, JSON.stringify({ at: Date.now(), fatal: !!fatal, message: String(err?.message ?? err).slice(0, 500), stack: String(err?.stack ?? "").slice(0, 3000) })).catch(() => {});
    prev?.(err, fatal);
  });
}
export async function lastCrash(): Promise<{ at: number; fatal: boolean; message: string; stack: string } | null> {
  try { const r = await AsyncStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
