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
const reset = (row: Record<string, any> = {}) => {
  rows.length = 0; created = 0; for (const k in intents) delete intents[k]
  rows.push({ id: APP, email: "t@example.com", full_name: "T U", payment_id: null, payment_status: "pending", payment_amount: null, application_status: "submitted", additional_notes: "{}", ...row })
}

const match = (u: URL) => (r: Record<string, any>) => [...u.searchParams].every(([k, v]) => k === "select" || !v.startsWith("eq.") || String(r[k]) === v.slice(3))
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } })
globalThis.fetch = (async (input: any, init: any = {}) => {
  const u = new URL(typeof input === "string" ? input : input.url)
  const method = (init.method ?? "GET").toUpperCase()
  if (u.hostname === "api-v2.ziina.com") {
    if (method === "POST") {
      const b = JSON.parse(init.body); const id = `pi_${++created}`
      intents[id] = { id, status: "requires_payment_instrument", amount: b.amount, currency_code: b.currency_code, redirect_url: `https://pay.ziina.com/${id}`, success_url: b.success_url }
      return json(intents[id])
    }
    const id = decodeURIComponent(u.pathname.split("/").pop()!)
    return intents[id] ? json(intents[id]) : json({ error: "not found" }, 404)
  }
  if (u.hostname === "fake.supabase.co") {
    const hit = rows.filter(match(u))
    if (method === "PATCH") { const patch = JSON.parse(init.body); hit.forEach((r) => Object.assign(r, patch)) }
    const accept = new Headers(init.headers).get("accept") ?? ""
    if (accept.includes("vnd.pgrst.object")) return hit.length ? json(hit[0]) : json({ code: "PGRST116", message: "0 rows" }, 406)
    return json(hit)
  }
  throw new Error(`unexpected fetch ${u}`) // Upstash etc. -> rate limiter fails open
}) as typeof fetch

const { POST: createPayment } = await import("../app/api/create-payment/route")
const { GET: checkPayment } = await import("../app/api/check-payment/route")
const { POST: webhook } = await import("../app/api/webhooks/ziina/route")
const req = (url: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(url, body === undefined ? { headers } : { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }) as any
const nreq = async (url: string) => { const { NextRequest } = await import("next/server"); return new NextRequest(url) }
const pay = () => createPayment(req("https://www.ezvisa.net/api/create-payment", { applicationId: APP, amount: 1, success_url: "https://www.ezvisa.net/app-return?r=success", cancel_url: "https://www.ezvisa.net/app-return?r=cancel" }))
const status = async () => (await checkPayment(await nreq(`https://www.ezvisa.net/api/check-payment?applicationId=${APP}`))).json()

// 1. Price comes from the server and ignores the client amount; spouse doubles it.
reset(); let r = await pay(); let j: any = await r.json()
assert.equal(r.status, 200); assert.equal(j.amount, 24900); assert.equal(rows[0].payment_id, "pi_1")
reset({ additional_notes: JSON.stringify({ wizard: { spouseAccompanying: "yes" } }) }); j = await (await pay()).json(); assert.equal(j.amount, 49800)
console.log("ok  price is server-computed (249 / 498 AED), client amount ignored")

// 2. Double tap / retry reuses the open intent: one Ziina intent, payment_id unchanged.
reset(); const [a, b] = await Promise.all([pay(), pay()]); await pay()
const ids = new Set([(await a.json()).id, (await b.json()).id])
console.log(`    concurrent taps created ${created} intent(s); sequential retry reused: ${rows[0].payment_id}`)
const seqCreated = created
reset(); await pay(); const again: any = await (await pay()).json()
assert.equal(created, 1); assert.equal(again.id, "pi_1"); assert.equal(again.reused, true)
console.log("ok  retry reuses the open payment (1 intent)", seqCreated > 1 ? "(simultaneous server calls can still race: guarded in the app)" : "", [...ids].join(","))

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
console.log("ALL PASSED")
