import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { travellersCaller } from "@/lib/travellers-session"
import { createTraveller, listTravellers, parseTravellerInput } from "@/lib/travellers"
import { DEMO_TRAVELLERS } from "@/lib/demo-data"

// Saved travellers of the signed-in customer, shared by the website wizard / Account page and the app.
//   GET  -> { travellers: Traveller[] }   (backfilled once from past applications when the account has none)
//   POST -> { traveller }                 (Account → Add traveller)
// Auth: Supabase session cookie, or `Authorization: Bearer <access token>` from the app. Demo accounts get fixed rows.

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = await travellersCaller(request)
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (user.demo) return NextResponse.json({ travellers: DEMO_TRAVELLERS[user.email] ?? [] }, { headers: { "Cache-Control": "no-store" } })
  const travellers = await listTravellers(user.email, { backfill: true })
  return NextResponse.json({ travellers }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(`travellers:${getClientIp(request)}`, RATE_LIMITS.standard, { onError: "memory" })
  if (!limit.success) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limit, RATE_LIMITS.standard) })
  const user = await travellersCaller(request)
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (user.demo) return NextResponse.json({ error: "Demo accounts can't save travellers." }, { status: 403 })
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const parsed = parseTravellerInput(body)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { traveller, error } = await createTraveller(user.email, parsed.details, parsed.relationship ?? "other")
  if (error === "duplicate") return NextResponse.json({ error: "This traveller is already saved." }, { status: 409 })
  if (!traveller) return NextResponse.json({ error: "Could not save the traveller. Please try again." }, { status: 500 })
  return NextResponse.json({ traveller }, { status: 201 })
}
