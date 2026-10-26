import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { UUID_RE } from "@/lib/applications"
import { travellersCaller } from "@/lib/travellers-session"
import { deleteTraveller, parseTravellerInput, touchTravellerUsed, updateTraveller } from "@/lib/travellers"

// One saved traveller of the signed-in customer (scoped to the account email).
//   PATCH  { ...fields } -> { traveller }   (Account → Edit)   |   PATCH { used: true } -> marks it as used now (wizard pick)
//   DELETE               -> { ok: true }    (Account → Remove)

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

async function guard(request: NextRequest, ctx: Ctx) {
  const limit = await checkRateLimit(`travellers:${getClientIp(request)}`, RATE_LIMITS.standard, { onError: "memory" })
  if (!limit.success) return { response: NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limit, RATE_LIMITS.standard) }) }
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  const user = await travellersCaller(request)
  if (!user) return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) }
  if (user.demo) return { response: NextResponse.json({ error: "Demo accounts can't change travellers." }, { status: 403 }) }
  return { id, user }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await guard(request, ctx)
  if ("response" in g) return g.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  if (body.used === true && Object.keys(body).length === 1) {
    await touchTravellerUsed(g.user.email, g.id)
    return NextResponse.json({ ok: true })
  }
  const parsed = parseTravellerInput(body)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { traveller, error } = await updateTraveller(g.user.email, g.id, parsed.details, parsed.relationship)
  if (error === "duplicate") return NextResponse.json({ error: "Another saved traveller already has these details." }, { status: 409 })
  if (!traveller) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ traveller })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const g = await guard(request, ctx)
  if ("response" in g) return g.response
  const ok = await deleteTraveller(g.user.email, g.id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 })
}
