import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { applyIntentStatus, fetchIntent, isPaidStatus, OPEN_INTENT_STATUSES, priceForApplication, serviceClient, UUID_RE } from "@/lib/ziina"

/**
 * GET /api/check-payment?applicationId=<uuid>
 *   Server-verified payment state for one application: the linked Ziina intent is fetched with our API key and
 *   its status is stored (same as the webhook), so a delayed or missed webhook still ends as "paid".
 *   Returns { applicationId, payment_status, open, amount, currency } where amount is the server price.
 * GET /api/check-payment?id=<payment intent id>  (legacy)
 *   Returns only { id, status } of that Ziina intent.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(`check-payment:${getClientIp(request)}`, RATE_LIMITS.relaxed)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.relaxed) })
    }

    const applicationId = request.nextUrl.searchParams.get("applicationId")
    const paymentIntentId = request.nextUrl.searchParams.get("id")
    const noStore = { "Cache-Control": "no-store" }

    if (applicationId) {
      if (!UUID_RE.test(applicationId)) return NextResponse.json({ error: "Invalid application" }, { status: 400 })
      const supabase = serviceClient()
      if (!supabase) return NextResponse.json({ error: "Payment service configuration error" }, { status: 500 })
      const { data: app, error } = await supabase
        .from("visa_applications")
        .select("id, payment_id, payment_status, payment_amount, additional_notes, application_status")
        .eq("id", applicationId)
        .maybeSingle()
      if (error) return NextResponse.json({ error: "Could not load application" }, { status: 500 })
      if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

      if (String(app.application_status ?? "").toLowerCase() === "cancelled") {
        const price = priceForApplication(app.additional_notes)
        return NextResponse.json(
          { applicationId: app.id, status: "cancelled", payment_status: app.payment_status ?? "pending", open: false, amount: price.amount, currency: price.currency },
          { headers: noStore },
        )
      }

      let status: string = app.payment_status ?? "pending"
      let open = false
      if (app.payment_id && !isPaidStatus(status)) {
        const intent = await fetchIntent(app.payment_id)
        if (intent) {
          const result = await applyIntentStatus(supabase, intent)
          if (result.status) status = result.status
          open = OPEN_INTENT_STATUSES.includes(intent.status)
        }
      }
      const price = priceForApplication(app.additional_notes)
      const amount = isPaidStatus(status) && app.payment_amount != null ? Number(app.payment_amount) : price.amount
      return NextResponse.json({ applicationId: app.id, payment_status: status, open, amount, currency: price.currency }, { headers: noStore })
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: "applicationId or id is required" }, { status: 400 })
    }
    if (!process.env.ZIINA_API_KEY) {
      console.error("ZIINA_API_KEY environment variable is not set")
      return NextResponse.json({ error: "Payment service configuration error" }, { status: 500 })
    }
    const intent = await fetchIntent(paymentIntentId)
    if (!intent) return NextResponse.json({ error: "Failed to check payment status" }, { status: 404 })
    return NextResponse.json({ id: intent.id, status: intent.status }, { headers: noStore })
  } catch (error) {
    console.error("Payment status check error:", error)
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 })
  }
}
