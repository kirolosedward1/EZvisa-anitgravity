// Exercises the real route handlers with fetch mocked for Ziina + Supabase (PostgREST). Run from the web repo root:
//   npx tsx scripts/test-ziina-payment.mts
import assert from "node:assert/strict"
import crypto from "node:crypto"

process.env.ZIINA_API_KEY = "test-key"
process.env.SUPABASE_URL = "https://fake.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
delete process.env.ZIINA_WEBHOOK_SECRET

const APP = "11111111-2222-4333-8444-555555555555"
const rows: Record<string, any>[] = []
const intents: Record<string, any> = {}
let created = 0
let dbUnavailable = false
let providerFailure = false
const reset = (row: Record<string, any> = {}) => {
  dbUnavailable = false; providerFailure = false
  rows.length = 0; created = 0; for (const k in intents) delete intents[k]
  rows.push({ id: APP, email: "t@example.com", full_name: "T U", payment_id: null, payment_status: "pending", payment_amount: null, application_status: "submitted", additional_notes: "{}", ...row })
}

// Minimal PostgREST filters: eq, gte, not.is.null, not.in.(...); other params (select, order, limit) are ignored.
const match = (u: URL) => (r: Record<string, any>) => [...u.searchParams].every(([k, v]) => {
  if (v.startsWith("eq.")) return String(r[k]) === v.slice(3)
  if (v.startsWith("gte.")) return String(r[k] ?? "") >= v.slice(4)
  if (v === "is.null") return r[k] == null
  if (v === "not.is.null") return r[k] != null
  if (v.startsWith("not.in.(")) return !v.slice(8, -1).split(",").includes(String(r[k]))
  return true
})
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } })
globalThis.fetch = (async (input: any, init: any = {}) => {
  const u = new URL(typeof input === "string" ? input : input.url)
  const method = (init.method ?? "GET").toUpperCase()
  if (u.hostname === "api-v2.ziina.com") {
    if (method === "POST") {
      if (providerFailure) return json({ error: "provider unavailable" }, 503)
      const b = JSON.parse(init.body); const id = `pi_${++created}`
      intents[id] = { id, status: "requires_payment_instrument", amount: b.amount, currency_code: b.currency_code, redirect_url: `https://pay.ziina.com/${id}`, success_url: b.success_url, cancel_url: b.cancel_url, failure_url: b.failure_url, _test: b.test }
      return json(intents[id])
    }
    const id = decodeURIComponent(u.pathname.split("/").pop()!)
    return intents[id] ? json(intents[id]) : json({ error: "not found" }, 404)
  }
  if (u.hostname === "fake.supabase.co") {
    if (dbUnavailable) return json({ code: "unavailable" }, 503)
    const hit = rows.filter(match(u))
    if (method === "PATCH") { const patch = JSON.parse(init.body); hit.forEach((r) => Object.assign(r, patch)) }
    const accept = new Headers(init.headers).get("accept") ?? ""
    if (accept.includes("vnd.pgrst.object")) return hit.length ? json(structuredClone(hit[0])) : json({ code: "PGRST116", message: "0 rows" }, 406)
    return json(structuredClone(hit))
  }
  throw new Error(`unexpected fetch ${u}`)
}) as typeof fetch

const { POST: createPayment } = await import("../app/api/create-payment/route")
const { GET: checkPayment } = await import("../app/api/check-payment/route")
const { OPTIONS: paymentOptions } = await import("../app/api/create-payment/route")
const { POST: webhook } = await import("../app/api/webhooks/ziina/route")
// Each request gets its own client IP so the (in-memory) rate limiter doesn't interfere; it is tested on its own below.
let ip = 0
const nextIp = () => `10.0.${Math.floor(++ip / 250)}.${ip % 250}`
const req = (url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(url, body === undefined ? { headers: { "x-forwarded-for": nextIp(), ...headers } } : { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...headers } }) as any
const nreq = async (url: string, headers: Record<string, string> = {}) => { const { NextRequest } = await import("next/server"); return new NextRequest(url, { headers: { "x-forwarded-for": nextIp(), ...headers } }) }
const pay = () => createPayment(req("https://www.ezvisa.net/api/create-payment", { applicationId: APP, amount: 1, success_url: "https://www.ezvisa.net/app-return?r=success", cancel_url: "https://www.ezvisa.net/app-return?r=cancel" }))
const status = async () => (await checkPayment(await nreq(`https://www.ezvisa.net/api/check-payment?applicationId=${APP}`))).json()

// 1. Price comes from the server and ignores the client amount; spouse doubles it.
reset(); let r = await pay(); let j: any = await r.json()
assert.equal(r.status, 200); assert.equal(j.amount, 24900); assert.equal(rows[0].payment_id, "pi_1")
reset({ additional_notes: JSON.stringify({ wizard: { spouseAccompanying: "yes" } }) }); j = await (await pay()).json(); assert.equal(j.amount, 49800)
console.log("ok  price is server-computed (249 / 498 AED), client amount ignored")

// 2. Concurrent requests serialize through the database, without relying on Redis.
reset(); const [a, b] = await Promise.all([pay(), pay()]);
assert.deepEqual([a.status, b.status].sort(), [200, 423])
assert.equal(created, 1)
const again: any = await (await pay()).json()
assert.equal(created, 1); assert.equal(again.id, "pi_1"); assert.equal(again.reused, true)
assert.equal(JSON.parse(rows[0].additional_notes).paymentCreationLock, undefined)
console.log("ok  concurrent checkout creates one intent; retry reuses it and releases its lock")

reset({ additional_notes: JSON.stringify({ wizard: { spouseAccompanying: "yes" }, paymentCreationLock: { token: "crashed", expiresAt: Date.now() - 1 } }) })
assert.equal((await pay()).status, 200)
assert.equal(created, 1)
assert.equal(JSON.parse(rows[0].additional_notes).wizard.spouseAccompanying, "yes")
console.log("ok  expired checkout lock recovers and preserves application answers")

reset(); dbUnavailable = true
assert.equal((await pay()).status, 503); assert.equal(created, 0)
reset(); providerFailure = true
assert.equal((await pay()).status, 502)
assert.equal(JSON.parse(rows[0].additional_notes).paymentCreationLock, undefined)
providerFailure = false
assert.equal((await pay()).status, 200); assert.equal(created, 1)
console.log("ok  database failure cannot create a checkout; provider failure releases the lock for retry")

// 3. Forged webhook (no secret configured) cannot mark paid: status is re-fetched from Ziina.
reset(); await pay()
r = await webhook(req("https://www.ezvisa.net/api/webhooks/ziina", { event: "payment_intent.status.updated", data: { id: "pi_1", status: "completed" } }))
assert.equal(rows[0].payment_status, "pending"); console.log("ok  forged 'completed' webhook for an unpaid intent -> still pending", r.status)
r = await webhook(req("https://www.ezvisa.net/api/webhooks/ziina", { id: "pi_999", status: "completed" }))
assert.equal(r.status, 502); assert.equal(rows[0].payment_status, "pending"); console.log("ok  webhook for an unknown intent id -> 502, nothing written")

// 4. Real completion (documented {event,data} body) marks paid with the Ziina amount.
intents.pi_1.status = "completed"
r = await webhook(req("https://www.ezvisa.net/api/webhooks/ziina", { event: "payment_intent.status.updated", data: { id: "pi_1", status: "completed" } }))
assert.equal(r.status, 200); assert.equal(rows[0].payment_status, "paid"); assert.equal(rows[0].payment_amount, 249)
console.log("ok  documented webhook body -> paid, payment_amount 249")
r = await pay(); assert.equal(r.status, 409); console.log("ok  paying again after paid -> 409, no new intent", created)

// 5. Webhook delayed/missing: check-payment syncs from Ziina.
reset(); await pay(); assert.deepEqual(await status(), { applicationId: APP, payment_status: "pending", open: true, amount: 249, currency: "AED" })
intents.pi_1.status = "completed"; const s: any = await status()
assert.equal(s.payment_status, "paid"); assert.equal(rows[0].payment_status, "paid"); console.log("ok  check-payment without webhook -> paid in DB", JSON.stringify(s))
reset(); await pay(); intents.pi_1.status = "failed"; assert.equal((await status()).payment_status, "failed"); console.log("ok  failed intent -> failed")

// 6. Signature: with a secret set, unsigned/incorrect requests are rejected; X-Hmac-Signature accepted.
process.env.ZIINA_WEBHOOK_SECRET = "whsec"
reset(); await pay(); intents.pi_1.status = "completed"
const body = JSON.stringify({ event: "payment_intent.status.updated", data: { id: "pi_1" } })
assert.equal((await webhook(req("https://x/api/webhooks/ziina", body))).status, 401)
assert.equal((await webhook(req("https://x/api/webhooks/ziina", body, { "x-hmac-signature": "00" }))).status, 401)
const sig = crypto.createHmac("sha256", "whsec").update(body).digest("hex")
assert.equal((await webhook(req("https://x/api/webhooks/ziina", body, { "x-hmac-signature": sig }))).status, 200)
assert.equal(rows[0].payment_status, "paid"); console.log("ok  HMAC: missing/bad signature 401, valid X-Hmac-Signature -> paid")

// 7. Legacy ?id= returns only id + status.
assert.deepEqual(await (await checkPayment(await nreq("https://www.ezvisa.net/api/check-payment?id=pi_1"))).json(), { id: "pi_1", status: "completed" })
console.log("ok  legacy check-payment?id= returns only {id,status}")
// 8. Rate limiting works without Redis: the 6th create-payment from one IP in a minute is refused.
{ reset(); const codes: number[] = []
  for (let i = 0; i < 6; i++) codes.push((await createPayment(req("https://www.ezvisa.net/api/create-payment", { applicationId: APP }, { "x-forwarded-for": "203.0.113.7" }))).status)
  assert.deepEqual(codes.slice(0, 5).every((c) => c !== 429), true); assert.equal(codes[5], 429)
  console.log("ok  rate limit without Redis: 6th create-payment from one IP in a minute -> 429", codes.join(",")) }

// 9. Reconcile cron: refuses without CRON_SECRET; with it, pending applications are synced from Ziina.
{ const { GET: reconcile } = await import("../app/api/cron/reconcile-payments/route")
  delete process.env.CRON_SECRET
  assert.equal((await reconcile(req("https://www.ezvisa.net/api/cron/reconcile-payments"))).status, 401)
  process.env.CRON_SECRET = "cron-test"
  assert.equal((await reconcile(req("https://www.ezvisa.net/api/cron/reconcile-payments", undefined, { authorization: "Bearer wrong" }))).status, 401)
  reset(); await pay(); intents.pi_1.status = "completed"; rows[0].updated_at = new Date().toISOString()
  const r = await reconcile(req("https://www.ezvisa.net/api/cron/reconcile-payments", undefined, { authorization: "Bearer cron-test" }))
  const j: any = await r.json()
  assert.equal(r.status, 200); assert.equal(rows[0].payment_status, "paid")
  console.log("ok  reconcile cron: 401 without/with wrong secret; with secret a completed payment is stored as paid", JSON.stringify(j)) }

// 10. Test mode: a live checkout created before the switch is never reopened; the new one is created with test: true
//     and its return URLs carry zmode=test. Switching back to live does not reopen the test checkout either.
{ delete process.env.ZIINA_TEST_MODE
  reset(); await pay(); assert.equal(intents.pi_1._test, false)
  process.env.ZIINA_TEST_MODE = "true"
  const t: any = await (await pay()).json()
  assert.equal(created, 2); assert.equal(t.id, "pi_2"); assert.equal(intents.pi_2._test, true); assert.ok(String(intents.pi_2.success_url).includes("zmode=test"))
  const again: any = await (await pay()).json(); assert.equal(again.id, "pi_2"); assert.equal(again.reused, true)
  delete process.env.ZIINA_TEST_MODE
  const live: any = await (await pay()).json(); assert.equal(live.id, "pi_3"); assert.equal(intents.pi_3._test, false); assert.ok(!String(intents.pi_3.success_url).includes("zmode"))
  console.log("ok  test mode: live checkout not reopened (new test intent, zmode=test), test checkout reused in test mode, not after switching back") }

// Both owned website hosts can check out; lookalike domains cannot.
for (const origin of ["https://www.ezvisa.net", "https://new.ezvisa.net"]) {
  const preflight = await paymentOptions(req(`${origin}/api/create-payment`, undefined, { origin }))
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin)
}
const denied = await createPayment(req("https://new.ezvisa.net/api/create-payment", { applicationId: APP }, { origin: "https://new.ezvisa.net.evil.example" }))
assert.equal(denied.status, 403)
console.log("ok  main/new checkout origins accepted; lookalike origin rejected")

console.log("ALL PASSED")
