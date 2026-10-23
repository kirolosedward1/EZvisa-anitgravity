// Runs migrations/functions/notify-status/index.ts (the Deno edge function) in node: esbuild bundles it with the jsr:
// Supabase import replaced by fake-supabase.mjs, Deno.serve captured, and fetch to Expo faked. Nothing is sent anywhere.
// Usage: node scripts/push-server/run-fn.mjs
import assert from "node:assert/strict"; import os from "os"; import path from "path"; import fs from "fs";
const here = new URL(".", import.meta.url).pathname;
const { build } = await import(process.env.ESBUILD || "esbuild");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ezvisa-fn-"));
fs.copyFileSync(here + "fake-supabase.mjs", path.join(tmp, "fake-supabase.mjs"));
await build({ entryPoints: [here + "../../migrations/functions/notify-status/index.ts"], bundle: true, platform: "node", format: "esm",
  outfile: path.join(tmp, "fn.mjs"), logLevel: "error",
  // external, so the test and the function share one fake database
  plugins: [{ name: "jsr", setup(b) { b.onResolve({ filter: /^jsr:/ }, () => ({ path: "./fake-supabase.mjs", external: true })); } }] });

let handler; const sent = [];
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => ({ SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "k" })[k] } };
globalThis.fetch = async (url, init) => { const batch = JSON.parse(init.body); sent.push({ url, batch });
  return { json: async () => ({ data: batch.map((m) => (m.to === "ExpoPushToken[dead]" ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok" })) }) }; };
const { db } = await import(path.join(tmp, "fake-supabase.mjs"));
await import(path.join(tmp, "fn.mjs"));

const ID = "3f2b8c1e-9a4d-4c2b-8f1e-0a1b2c3d4e5f";
db.apps.push({ id: ID, email: "A@x.com" });
db.tokens.push({ token: "ExpoPushToken[a1]", email: "a@x.com", updated_at: "2026-10-22T10:00:00+00:00" },
  { token: "ExpoPushToken[shared]", email: "a@x.com", updated_at: "2026-10-20T10:00:00+00:00" },
  { token: "ExpoPushToken[shared]", email: "b@x.com", updated_at: "2026-10-21T10:00:00+00:00" },
  { token: "ExpoPushToken[dead]", email: "a@x.com", updated_at: "2026-10-22T09:00:00+00:00" });
const call = (body, secret = "s3cret", method = "POST") => handler(new Request("http://fn", { method, headers: { "x-ezvisa-hook": secret }, body: method === "POST" ? JSON.stringify(body) : undefined }));
let n = 0, failed = 0;
const ok = async (name, fn) => { try { await fn(); n++; console.log("PASS", name); } catch (e) { failed++; console.log("FAIL", name, e.message); } };
await ok("GET -> 405", async () => assert.equal((await call(null, "s3cret", "GET")).status, 405));
await ok("wrong secret -> 401, nothing sent", async () => { assert.equal((await call({ application_id: ID, new_status: "ready" }, "nope")).status, 401); assert.equal(sent.length, 0); });
await ok("no secret -> 401", async () => assert.equal((await call({ application_id: ID }, "")).status, 401));
await ok("bad JSON -> 400", async () => { const r = await handler(new Request("http://fn", { method: "POST", headers: { "x-ezvisa-hook": "s3cret" }, body: "{" })); assert.equal(r.status, 400); });
await ok("customer submit sends nothing", async () => { const j = await (await call({ application_id: ID, old_status: "draft", new_status: "submitted", rejected: [] })).json(); assert.equal(j.sent, 0); assert.equal(sent.length, 0); });
await ok("staff status change: generic text to latest-owner tokens only; dead token dropped", async () => {
  const j = await (await call({ application_id: ID, old_status: "submitted", new_status: "reviewing", rejected: [] })).json();
  const b = sent.at(-1).batch;
  assert.deepEqual(b.map((m) => m.to).sort(), ["ExpoPushToken[a1]", "ExpoPushToken[dead]"]); // the shared token's latest owner is b@x.com
  for (const m of b) { assert.equal(m.body, "There's an update on your application."); assert.equal(m.title, undefined); assert.deepEqual(m.data, { type: "status", applicationId: ID, url: `/applications/${ID}` }); }
  assert.equal(sent.at(-1).url, "https://exp.host/--/api/v2/push/send");
  assert.deepEqual(j, { sent: 1, dropped: 1 }); assert.deepEqual(db.deleted, ["ExpoPushToken[dead]"]);
});
await ok("rejected documents: one document push", async () => { await call({ application_id: ID, old_status: "reviewing", new_status: "reviewing", rejected: ["passportCopy", "photo"] }); const b = sent.at(-1).batch; assert.equal(b.length, 1); assert.equal(b[0].body, "A document needs your attention."); });
await ok("unknown application -> sent 0", async () => { const j = await (await call({ application_id: "11111111-1111-4111-8111-111111111111", old_status: "submitted", new_status: "ready" })).json(); assert.equal(j.sent, 0); });
await ok("no email, country, reference or document name in any push", async () => { for (const s of sent) assert.doesNotMatch(JSON.stringify(s.batch), /@|EZ-|France|passport/i); });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${n} function checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
