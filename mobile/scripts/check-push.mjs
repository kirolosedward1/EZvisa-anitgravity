// Checks the pure push logic without a device: node scripts/check-push.mjs (Node 22.18+ runs the .ts imports directly).
import assert from "node:assert/strict";
import { notificationRoute, needsSession } from "../lib/notifyRoute.ts";
import { buildMessage, latestOwnerTokens, TEXT } from "../migrations/functions/notify-status/messages.ts";

const id = "3f2b8c1e-9a4d-4c2b-8f1e-0a1b2c3d4e5f";
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok -", name); };

ok("tap route: application url from a push", () => assert.equal(notificationRoute({ type: "status", applicationId: id, url: `/applications/${id}` }), `/applications/${id}`));
ok("tap route: reminder urls", () => { assert.equal(notificationRoute({ url: "/account" }), "/account"); assert.equal(notificationRoute({ url: "/apply" }), "/apply"); });
ok("tap route: every push opens its own screen (appointment, continue, trip, receipt)", () => { for (const p of ["appointment", "continue", "trip", "receipt"]) { assert.equal(notificationRoute({ url: `/${p}/${id}` }), `/${p}/${id}`); assert.ok(needsSession(`/${p}/${id}`)); } });
ok("tap route: rejects anything else", () => {
  for (const url of ["/applications/abc", "/applications/../account", "https://evil.example", "/payment/" + id, `/applications/${id}?x=1`, 42, null]) assert.equal(notificationRoute({ url }), null);
  assert.equal(notificationRoute(null), null); assert.equal(notificationRoute("x"), null);
});
ok("tap route: application screens wait for a session", () => { assert.equal(needsSession(`/applications/${id}`), true); assert.equal(needsSession("/account"), false); });

ok("message: staff status change -> generic status text", () => {
  const m = buildMessage({ application_id: id, old_status: "submitted", new_status: "reviewing", rejected: [] });
  assert.deepEqual(m, { body: TEXT.status, data: { type: "status", applicationId: id, url: `/applications/${id}` } });
});
ok("message: rejected documents -> one document push", () => {
  const m = buildMessage({ application_id: id, old_status: "reviewing", new_status: "reviewing", rejected: ["passportCopy", "photo"] });
  assert.equal(m.body, TEXT.document); assert.equal(m.data.type, "document");
});
ok("message: awaiting_documents -> document push", () => assert.equal(buildMessage({ application_id: id, old_status: "reviewing", new_status: "awaiting_documents" }).data.type, "document"));
ok("message: customer's own steps send nothing", () => {
  assert.equal(buildMessage({ application_id: id, old_status: "draft", new_status: "submitted" }), null);
  assert.equal(buildMessage({ application_id: id, old_status: "submitted", new_status: "cancelled" }), null);
  assert.equal(buildMessage({ application_id: id, old_status: "draft", new_status: "cancelled" }), null);
  assert.equal(buildMessage({ application_id: id, old_status: "ready", new_status: "ready", rejected: [] }), null);
});
ok("message: staff cancel of a case in review is sent", () => assert.equal(buildMessage({ application_id: id, old_status: "reviewing", new_status: "cancelled" }).body, TEXT.status));
ok("message: bad id sends nothing", () => assert.equal(buildMessage({ application_id: "x", new_status: "ready" }), null));
ok("message: text and data carry no personal data", () => {
  const m = buildMessage({ application_id: id, old_status: "reviewing", new_status: "rejected" });
  assert.deepEqual(Object.keys(m.data).sort(), ["applicationId", "type", "url"]);
  for (const s of Object.values(TEXT)) assert.doesNotMatch(s, /EZ-|passport|refused|rejected|approved|france|germany|\d/i);
});

ok("tokens: a token shared by two accounts goes only to its latest owner", () => {
  const rows = [
    { token: "ExpoPushToken[A]", email: "a@x.com", updated_at: "2026-10-20T10:00:00+00:00" },
    { token: "ExpoPushToken[A]", email: "B@x.com", updated_at: "2026-10-21T10:00:00+00:00" },
    { token: "ExpoPushToken[C]", email: "a@x.com", updated_at: "2026-10-19T10:00:00+00:00" },
  ];
  assert.deepEqual(latestOwnerTokens(rows, "A@x.com"), ["ExpoPushToken[C]"]);
  assert.deepEqual(latestOwnerTokens(rows, "b@x.com"), ["ExpoPushToken[A]"]);
});
console.log(`\n${n} checks passed`);
