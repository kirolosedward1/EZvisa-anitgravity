// Startup timing. Cold start = from the start of JS (or native process start when React Native reports it) to the
// moment the first screen is ready and the splash leaves. Kept on this phone (last 10) and sent as an anonymous
// app_start event. Shown by long-pressing the version row in Account.
import AsyncStorage from "@react-native-async-storage/async-storage";

const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
const KEY = "ezvisa.startup.v1";
let done = false;
export type Startup = { at: number; js: number; native: number | null };

export function markReady() {
  if (done || typeof performance === "undefined") return; done = true;
  const now = performance.now();
  const js = Math.round(now - t0);
  const st = (performance as any).rnStartupTiming as { startTime?: number } | undefined;
  const native = st?.startTime != null && st.startTime > 0 && st.startTime <= now ? Math.round(now - st.startTime) : null;
  import("./analytics").then((a) => a.track("app_start", { ms: native ?? js })).catch(() => {}); // lazy: keeps this module first to load
  if (__DEV__) console.log(`[perf] first screen ready: js ${js} ms${native != null ? `, native ${native} ms` : ""}`);
  AsyncStorage.getItem(KEY).then((r) => {
    const list: Startup[] = (() => { try { return JSON.parse(r ?? "[]"); } catch { return []; } })();
    list.push({ at: Date.now(), js, native }); AsyncStorage.setItem(KEY, JSON.stringify(list.slice(-10))).catch(() => {});
  }).catch(() => {});
}
export async function startupHistory(): Promise<Startup[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]"); } catch { return []; }
}
