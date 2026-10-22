// Fakes for scripts/test-push.ts, installed on globalThis before lib/push.ts and lib/data.ts load (imported first).
// The phase (process.argv[2]) picks the platform: "ios" (a store build), "android-expo-go" or "web".
declare const process: any;
const phase: string = process.argv[2] ?? "ios";
const os = phase === "web" ? "web" : phase.startsWith("android") ? "android" : "ios";
type Resp = { actionIdentifier: string; notification: { date: number; request: { identifier: string; content: { data: unknown } } } };

export const F = {
  phase,
  // expo-notifications
  perm: { status: "undetermined", canAskAgain: true }, requestTo: "granted", requests: 0, handlerSet: 0, token: "ExpoPushToken[t1]",
  last: null as Resp | null, cleared: 0, responseListeners: [] as ((r: Resp) => void)[], tokenListeners: [] as ((t: { type: string; data: string }) => void)[], fetches: 0,
  // expo-router
  pushed: [] as string[],
  // supabase
  session: { user: { id: "a" }, access_token: "jwt-a1" } as object | null, rpcError: null as { code?: string } | null, insertError: null as { code?: string } | null,
  deleteError: null as object | null, deleteThrows: false, ops: [] as unknown[][], rpcDelay: 0,
};

// A tiny hook runtime: enough for useRef/useEffect with deps, so a hook can be "rendered" and re-rendered in node.
let cell: { refs: Record<number, { current: unknown }>; effects: Record<number, { deps?: unknown[]; cleanup?: unknown }>; idx: number; pending: (() => void)[] } | null = null;
export function render<A extends unknown[]>(hook: (...a: A) => void, ...args: A) {
  cell ??= { refs: {}, effects: {}, idx: 0, pending: [] };
  cell.idx = 0; cell.pending = [];
  hook(...args);
  const run = cell.pending; run.forEach((f) => f());
}
export function unmount() {
  if (cell) Object.values(cell.effects).forEach((e) => typeof e.cleanup === "function" && (e.cleanup as () => void)());
  cell = null;
}
const react = {
  useRef(v: unknown) { const c = cell!; const i = c.idx++; if (!(i in c.refs)) c.refs[i] = { current: v }; return c.refs[i]; },
  useEffect(fn: () => unknown, deps?: unknown[]) {
    const c = cell!; const i = c.idx++; const prev = c.effects[i];
    if (prev && deps && prev.deps && deps.every((d, k) => Object.is(d, prev.deps![k]))) return;
    c.pending.push(() => { if (typeof prev?.cleanup === "function") (prev.cleanup as () => void)(); c.effects[i] = { deps, cleanup: fn() }; });
  },
};

export const tap = (id: string, data: unknown, date = Date.now()): Resp =>
  ({ actionIdentifier: "expo.modules.notifications.actions.DEFAULT", notification: { date, request: { identifier: id, content: { data } } } });

const notifications = {
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  setNotificationHandler() { F.handlerSet++; },
  async getPermissionsAsync() { return { ...F.perm }; },
  // Android 13+ lets the app ask a second time after the first "Don't allow" (canAskAgain stays true); iOS does not.
  async requestPermissionsAsync() { F.requests++; F.perm = { status: F.requestTo, canAskAgain: F.requestTo !== "denied" || os === "android" }; return { ...F.perm }; },
  // Like the SDK: without a devicePushToken it fetches one, and every fetch also fires the push-token event
  // (PushTokenModule didRegister/onNewToken), which is how a listener that fetches again loops.
  async getExpoPushTokenAsync(o: { projectId?: string; devicePushToken?: { type: string; data: string } }) {
    if (o.projectId !== "pid") throw new Error("no projectId");
    if (!o.devicePushToken) {
      F.fetches++; // a native device-token fetch, which also fires the event
      const t = { type: os, data: F.token.replace("ExpoPushToken", "device") };
      setTimeout(() => F.tokenListeners.forEach((l) => l(t)), 0);
    }
    return { data: o.devicePushToken ? o.devicePushToken.data.replace("device", "ExpoPushToken") : F.token };
  },
  addPushTokenListener(cb: (t: { type: string; data: string }) => void) {
    if (F.phase === "android-expo-go") throw new Error("Android push was removed from Expo Go"); // what the SDK 57 code does
    F.tokenListeners.push(cb); return { remove() {} };
  },
  addNotificationResponseReceivedListener(cb: (r: Resp) => void) {
    F.responseListeners.push(cb); return { remove() { F.responseListeners = F.responseListeners.filter((x) => x !== cb); } };
  },
  getLastNotificationResponse() { return F.last; },
  clearLastNotificationResponse() { F.cleared++; F.last = null; },
};

// The Supabase client lib/data.ts uses for tokens: auth.getSession, rpc, from("device_tokens").insert / update().eq / delete().eq.
const result = (r: object) => ({ then: (ok: (v: object) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(r).then(ok, bad) });
const supabase = {
  auth: { async getSession() { return { data: { session: F.session && { ...F.session } } }; } },
  async rpc(name: string, args: object) {
    const err = F.rpcError; if (F.rpcDelay) await new Promise((r) => setTimeout(r, F.rpcDelay));
    F.ops.push(["rpc", name, args]); return { error: err };
  },
  from(table: string) {
    return {
      insert(v: object) { F.ops.push(["insert", table, v]); return result({ error: F.insertError }); },
      update(v: object) { return { eq(c: string, x: string) { F.ops.push(["update", table, v, c, x]); return result({ error: null }); } }; },
      delete() {
        return { eq(c: string, x: string) {
          F.ops.push(["delete", table, c, x]);
          if (F.deleteThrows) return { then: (_: unknown, bad?: (e: unknown) => unknown) => Promise.reject(new TypeError("Network request failed")).then(undefined, bad) };
          return result({ error: F.deleteError });
        } };
      },
    };
  },
};

(globalThis as any).__push = {
  supabase,
  fakes: {
    react,
    "react-native": { Platform: { OS: os, select: (o: Record<string, unknown>) => o[os] ?? o.default } },
    "expo-constants": { __esModule: true, default: { executionEnvironment: phase === "android-expo-go" ? "storeClient" : "standalone", expoConfig: { extra: { eas: { projectId: "pid" } } } }, ExecutionEnvironment: { StoreClient: "storeClient", Standalone: "standalone" } },
    "expo-router": { router: { push: (u: string) => { F.pushed.push(u); } } },
    "expo-device": { isDevice: true },
    "expo-notifications": notifications,
  },
};
