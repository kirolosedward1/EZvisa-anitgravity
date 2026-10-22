import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { SITE_URL, siteUrl } from "@/lib/site-url"
import { applyIntentStatus, fetchIntent, isPaidStatus, OPEN_INTENT_STATUSES, priceForApplication, UUID_RE } from "@/lib/ziina"

export async function POST(request: NextRequest) {
  try {
    // Origin validation for CSRF protection
    const origin = request.headers.get("origin")
    const isDev = process.env.NODE_ENV === "development"
    const allowedOrigins = [
      SITE_URL,
      "https://ezvisa.net",
      "https://www.ezvisa.net",
      ...(isDev ? ["http://localhost:3000"] : []),
    ]
    
    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
    }
    
    // Rate limiting - strict for payment routes (Redis-based)
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`payment:${clientIp}`, RATE_LIMITS.strict)
    
    if (!rateLimitResult.success) {
      console.log("[v0] Rate limit exceeded for payment")
      return NextResponse.json(
        { error: "Too many payment attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict) }
      )
    }

    // Backward-compatible body: clients may still send amount/currency, but both are IGNORED.
    // The price is always computed here from the stored application.
    const body = await request.json().catch(() => ({}))
    const { applicationId, success_url, cancel_url } = body ?? {}
    // Test mode is a server setting too (a client could otherwise request a free test-mode intent).
    const test = process.env.ZIINA_TEST_MODE === "true"

    if (typeof applicationId !== "string" || !UUID_RE.test(applicationId)) {
      return NextResponse.json({ error: "Invalid application" }, { status: 400 })
    }

    // No open redirects: whatever the client sends, Ziina returns the customer to the official domain.
    const toSite = (u: string | undefined, fallbackPath: string) => {
      if (!u) return siteUrl(fallbackPath)
      try {
        const parsed = new URL(u, SITE_URL)
        return isDev && parsed.hostname === "localhost" ? parsed.toString() : siteUrl(parsed.pathname + parsed.search)
      } catch {
        return siteUrl(fallbackPath)
      }
    }
    const successUrl = toSite(success_url, "/payment-success")
    const cancelUrl = toSite(cancel_url, "/payment-failed")

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.error("[payment] Database not configured")
      return NextResponse.json({ error: "Payment service configuration error" }, { status: 500 })
    }
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: app, error: appError } = await supabase
      .from("visa_applications")
      .select("id, payment_id, payment_status, application_status, additional_notes")
      .eq("id", applicationId)
      .maybeSingle()
    if (appError) {
      console.error("[payment] Application lookup failed:", appError.code)
      return NextResponse.json({ error: "Could not load application" }, { status: 500 })
    }
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })
    if (isPaidStatus(app.payment_status)) {
      return NextResponse.json({ error: "Application is already paid" }, { status: 409 })
    }
    if (["cancelled", "rejected"].includes(String(app.application_status ?? "").toLowerCase())) {
      return NextResponse.json({ error: "Application is closed" }, { status: 409 })
    }

    const { amount: serverAmount, currency: validCurrency } = priceForApplication(app.additional_notes)
    const amountInFils = Math.round(serverAmount * 100)

    // One open payment per application: reuse the linked intent while it can still be paid, so a double tap,
    // a retry or a second device never creates a second charge (and never unlinks an intent that is being paid).
    if (app.payment_id) {
      const existing = await fetchIntent(app.payment_id)
      if (existing?.status === "completed") {
        await applyIntentStatus(supabase, existing)
        return NextResponse.json({ error: "Application is already paid" }, { status: 409 })
      }
      if (
        existing &&
        OPEN_INTENT_STATUSES.includes(existing.status) &&
        existing.redirect_url &&
        existing.amount === amountInFils &&
        (!existing.success_url || !success_url || existing.success_url === success_url)
      ) {
        return NextResponse.json({ ...existing, reused: true })
      }
    }

    const apiKey = process.env.ZIINA_API_KEY
    if (!apiKey) {
      console.error("[payment] Ziina API key not configured")
      return NextResponse.json({ error: "Payment service configuration error" }, { status: 500 })
    }

    console.log("[v0] Calling Ziina API...")
    const response = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInFils, // server-computed, smallest currency unit
        currency_code: validCurrency,
        success_url: successUrl,
        cancel_url: cancelUrl,
        test,
      }),
    })

    console.log("[v0] Ziina API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Ziina API error:", errorText)
      return NextResponse.json(
        { error: "Failed to create payment intent", details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()

    if (!data.redirect_url || !data.id) {
      console.log("[v0] Missing redirect_url or id in response")
      return NextResponse.json(
        { error: "Invalid payment response", details: "Missing redirect_url or id" },
        { status: 500 },
      )
    }

    // LINK PAYMENT TO APPLICATION
    const { error: linkError } = await supabase.from("visa_applications").update({ payment_id: data.id }).eq("id", applicationId)
    if (linkError) console.error("[payment] Failed to link payment to application", linkError.code)

    console.log("[v0] Payment intent created successfully:", data.id)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create payment intent",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
