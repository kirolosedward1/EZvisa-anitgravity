// Push and notification-tap checks without a device: node scripts/run-push-tests.mjs (bundles this file with fakes).
// Covers lib/push.ts (permission, token save, token rotation, tap routing on warm and cold start) and the token functions in
// lib/data.ts (claim RPC, fallback insert, sign-out delete). Real delivery still needs a phone: QA-CHECKLIST §11.
import { F, render, unmount, tap } from "./push-fakes";
import { setupPush, useNotificationRouting, notifications } from "../lib/push";
import { registerPushToken, unregisterPushToken } from "../lib/data";
import { planReminders } from "../lib/reminders";
import AsyncStorage from "@react-native-async-storage/async-storage";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = async (name: string, fn: () => unknown) => {
  try { await fn(); pass++; console.log(`PASS  [${F.phase}] ${name}`); }
  catch (e: any) { fail++; console.log(`FAIL  [${F.phase}] ${name}: ${e?.message ?? e}`); }
};
const eq = (a: unknown, b: unknown, what = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const APP = "/applications/3f2b8c1e-9a4d-4c2b-8f1e-0a1b2c3d4e5f";
const reset = () => { unmount(); F.pushed = []; F.last = null; F.cleared = 0; F.responseListeners = []; F.ops = []; };
const fire = (r: ReturnType<typeof tap>) => F.responseListeners.forEach((l) => l(r));
// The hook as app/_layout.tsx renders it: ready = session known, signedIn = session, inApp = session or guest.
const show = (ready: boolean, signedIn: boolean, inApp = signedIn) => render(useNotificationRouting, ready, signedIn, inApp);

async function routing() {
  await check("cold start: application tap waits for the session, then opens once", () => {
    reset(); F.last = tap("n1", { type: "status", applicationId: "x", url: APP });
    show(false, false); eq(F.pushed, [], "while loading");
    show(true, false, false); eq(F.pushed, [], "signed out");
    show(true, true); eq(F.pushed, [APP], "after sign-in");
    if (F.cleared < 1) throw new Error("last response not cleared");
  });
  await check("cold start: the same tap reported again by the listener does not open twice", () => {
    reset(); const r = tap("n1", { url: APP }); F.last = r; show(true, true); fire(r); eq(F.pushed, [APP]);
  });
  await check("warm start: a tap opens the screen right away", () => {
    reset(); show(true, true); fire(tap("n2", { url: APP })); eq(F.pushed, [APP]);
  });
  await check("a reminder delivered again with the same identifier opens again", () => {
    reset(); show(true, true);
    fire(tap("ezvisa-rem-draft", { url: "/apply" }, 1000)); fire(tap("ezvisa-rem-draft", { url: "/apply" }, 2000));
    eq(F.pushed, ["/apply", "/apply"]);
  });
  await check("guest reminder at cold start waits until the app is open (Welcome first), then opens", () => {
    reset(); F.last = tap("ezvisa-rem-draft", { url: "/apply" });
    show(true, false, false); eq(F.pushed, [], "on Welcome");
    show(true, false, true); eq(F.pushed, ["/apply"], "after Continue without an account");
  });
  await check("unknown or unsafe urls are ignored", () => {
    reset(); show(true, true);
    for (const url of ["/payment/abc", "https://evil.example", "/applications/../account", 7]) fire(tap(`u${url}`, { url }));
    fire(tap("nodata", undefined)); eq(F.pushed, []);
  });
  await check("a dismissed notification (not the default action) opens nothing", () => {
    reset(); show(true, true); const r = tap("d1", { url: APP }); (r as any).actionIdentifier = "expo.modules.notifications.actions.DISMISS"; fire(r); eq(F.pushed, []);
  });
  await check("unmount removes the listener", () => { reset(); show(true, true); unmount(); eq(F.responseListeners.length, 0); });
}

async function tokens() {
  await check("ask=false never shows the prompt", async () => {
    F.perm = { status: "undetermined", canAskAgain: true }; F.requests = 0; F.ops = [];
    eq(await setupPush(false), "not-asked"); eq(F.requests, 0); eq(F.ops, []);
  });
  await check("ask=true after payment: prompt, allow, token claimed for the signed-in user", async () => {
    F.requestTo = "granted"; F.ops = []; await AsyncStorage.removeItem("ezvisa.push.token");
    eq(await setupPush(true), "registered"); eq(F.requests, 1);
    eq(F.ops, [["rpc", "claim_device_token", { p_token: "ExpoPushToken[t1]", p_platform: "ios" }]]);
    eq(await AsyncStorage.getItem("ezvisa.push.token"), "ExpoPushToken[t1]");
  });
  await check("a denied permission is never asked again", async () => {
    F.perm = { status: "denied", canAskAgain: false }; F.requests = 0; F.ops = [];
    eq(await setupPush(true), "denied"); eq(F.requests, 0); eq(F.ops, []);
    F.perm = { status: "granted", canAskAgain: true };
  });
  await check("the token listener does not loop (every token fetch fires the event, as in the SDK)", async () => {
    await wait(20); F.ops = []; F.fetches = 0;
    eq(await setupPush(true), "registered"); await wait(50);
    if (F.fetches > 1) throw new Error(`${F.fetches} token fetches after one setupPush`);
    const claims = F.ops.filter((o) => o[0] === "rpc").length; if (claims < 1 || claims > 2) throw new Error(`${claims} claims after one setupPush`); // the listener may re-claim once (idempotent)
  });
  await check("token rotation: the new token is claimed first, then the old row deleted", async () => {
    F.ops = []; F.tokenListeners.forEach((l) => l({ type: "ios", data: "device[t2]" })); await wait(20);
    eq(F.ops, [["rpc", "claim_device_token", { p_token: "ExpoPushToken[t2]", p_platform: "ios" }], ["delete", "device_tokens", "token", "ExpoPushToken[t1]"]]);
    eq(F.tokenListeners.length, 1, "one listener");
  });
  await check("rotation whose claim fails keeps the old row", async () => {
    F.ops = []; F.rpcError = { code: "57014" }; F.tokenListeners.forEach((l) => l({ type: "ios", data: "device[t3]" })); await wait(20); F.rpcError = null;
    eq(F.ops.filter((o) => o[0] === "delete"), [], "no delete");
    F.ops = []; F.tokenListeners.forEach((l) => l({ type: "ios", data: "device[t2]" })); await wait(20); // back to t2 for the next checks
  });
  await check("before migration 0013: claim RPC missing (PGRST202) -> plain insert", async () => {
    F.ops = []; F.rpcError = { code: "PGRST202" }; await registerPushToken("ExpoPushToken[t2]");
    eq(F.ops.map((o) => o[0]), ["rpc", "insert"]); F.rpcError = null;
  });
  await check("fallback insert hits the existing row (23505) -> updated_at bumped instead", async () => {
    F.ops = []; F.rpcError = { code: "PGRST202" }; F.insertError = { code: "23505" }; const before = Date.now();
    await registerPushToken("ExpoPushToken[t2]"); F.rpcError = null; F.insertError = null;
    eq(F.ops.map((o) => o[0]), ["rpc", "insert", "update"]);
    // notify-status picks a shared token's latest owner by updated_at, so the bump must be a fresh time on this token's row.
    const [, table, values, col, val] = F.ops[2] as [string, string, { updated_at?: string }, string, string];
    eq([table, Object.keys(values), col, val], ["device_tokens", ["updated_at"], "token", "ExpoPushToken[t2]"], "update");
    const at = Date.parse(values.updated_at ?? ""); if (!(at >= before - 1000 && at <= Date.now() + 1000)) throw new Error(`updated_at ${values.updated_at} is not now`);
  });
  await check("any other server error: setupPush reports it and does not throw", async () => {
    F.rpcError = { code: "57014" }; const s = await setupPush(true); F.rpcError = null;
    if (!s.startsWith("unavailable")) throw new Error(s);
  });
  await check("signed out: nothing is sent", async () => {
    F.ops = []; const keep = F.session; F.session = null; await registerPushToken("ExpoPushToken[t2]"); eq(F.ops, []); F.session = keep;
  });
  await check("a save in flight when sign-out starts cannot re-create the row afterwards", async () => {
    F.ops = []; F.rpcDelay = 30;
    const save = registerPushToken("ExpoPushToken[t2]"); await wait(5);
    eq(await unregisterPushToken(), true); await save; F.rpcDelay = 0;
    const kinds = F.ops.map((o) => o[0]); if (kinds.lastIndexOf("delete") < kinds.lastIndexOf("rpc")) throw new Error(`order ${kinds}`);
    F.ops = []; await registerPushToken("ExpoPushToken[t2]"); eq(F.ops, [], "same session after sign-out sends nothing");
    F.session = { user: { id: "a" }, access_token: "jwt-a2" }; F.ops = []; await registerPushToken("ExpoPushToken[t2]");
    eq(F.ops.map((o) => o[0]), ["rpc"], "the next sign-in saves again");
  });
  await check("sign-out deletes this phone's token", async () => {
    F.ops = []; eq(await unregisterPushToken(), true); eq(F.ops, [["delete", "device_tokens", "token", "ExpoPushToken[t2]"]]);
  });
  await check("sign-out offline: reports false, never throws", async () => { F.deleteThrows = true; eq(await unregisterPushToken(), false); F.deleteThrows = false; });
  await check("sign-out with a server error: reports false", async () => { F.deleteError = { message: "x" }; eq(await unregisterPushToken(), false); F.deleteError = null; });
  await check("no stored token: nothing to delete", async () => { F.ops = []; await AsyncStorage.removeItem("ezvisa.push.token"); eq(await unregisterPushToken(), true); eq(F.ops, []); });
  await check("the foreground handler is set once", () => { notifications(); notifications(); eq(F.handlerSet, 1); });
  await check("reminder text has no destination or name (lock screen)", () => {
    const plan = planReminders([{ id: "3f2b8c1e-9a4d-4c2b-8f1e-0a1b2c3d4e5f", status: "submitted", entry_date: "2030-06-01", countries: { name: "France" },
      applicants: [{ id: "p1", is_primary: true, first_name: "Sara", passport_expiry_date: "2031-01-15" }, { id: "p2", is_primary: false, first_name: "Omar", passport_expiry_date: "2031-02-15" }] } as any], new Date("2026-10-22T00:00:00"));
    if (plan.length < 6) throw new Error(`only ${plan.length} reminders`);
    for (const r of plan) if (/France|Sara|Omar/.test(r.title + r.body)) throw new Error(`"${r.title}: ${r.body}"`);
  });
}

async function main() {
  if (F.phase === "ios") { await routing(); await tokens(); }
  if (F.phase === "android") {
    await check("Android: after one \"Don't allow\" the next payment does not ask again", async () => {
      F.perm = { status: "undetermined", canAskAgain: true }; F.requestTo = "denied"; F.requests = 0;
      eq(await setupPush(true), "denied"); eq(F.requests, 1);
      eq(await setupPush(true), "denied"); eq(F.requests, 1, "asked again");
    });
  }
  if (F.phase === "android-expo-go") {
    await check("Expo Go on Android: no prompt, no token, no throw", async () => { F.requests = 0; eq(await setupPush(true), "unsupported-expo-go-android"); eq(F.requests, 0); eq(F.ops, []); });
    await check("Expo Go on Android: reminder taps still open their screen", () => { reset(); show(true, true); fire(tap("r1", { url: "/account" })); eq(F.pushed, ["/account"]); });
  }
  if (F.phase === "web") {
    await check("web: push unsupported, notifications() is null, the hook does nothing", async () => {
      eq(await setupPush(true), "unsupported-web"); eq(notifications(), null); reset(); show(true, true); eq(F.responseListeners.length, 0);
    });
  }
  console.log(`[${F.phase}] ${pass} passed, ${fail} failed`);
  if (fail) (globalThis as any).process.exit(1);
}
main();
