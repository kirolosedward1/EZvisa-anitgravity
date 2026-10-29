import { type NextRequest, NextResponse } from "next/server"
import { claimPaymentCreation } from "@/lib/payment-creation-lock"
import type { SupabaseClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { isAllowedPaymentOrigin, paymentCorsHeaders, paymentReturnUrl } from "@/lib/cors"
import { applyIntentStatus, fetchIntent, isPaidStatus, OPEN_INTENT_STATUSES, priceForApplication, UUID_RE } from "@/lib/ziina"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  const headers = paymentCorsHeaders(origin)
  if (!isAllowedPaymentOrigin(origin)) return new NextResponse(null, { status: 403, headers })
  return new NextResponse(null, { status: 204, headers })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const json = (body: unknown, init: { status?: number; headers?: HeadersInit } = {}) => {
    const headers = new Headers(init.headers)
    for (const [key, value] of Object.entries(paymentCorsHeaders(origin))) headers.set(key, value)
    return NextResponse.json(body, { status: init.status, headers })
  }
  let releasePaymentLock: (() => Promise<void>) | undefined
  const started = Date.now()
  try {
    const isDev = process.env.NODE_ENV === "development"
    if (origin && !isAllowedPaymentOrigin(origin)) {
      return json({ error: "Invalid origin" }, { status: 403 })
    }
    
    // Strict per-IP limit. A Redis error uses an in-memory window instead of allowing the request.
    // Redis is abandoned after 3s so a hung Upstash call cannot stall checkout.
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`payment:${clientIp}`, RATE_LIMITS.strict, {
      onError: "memory",
      timeoutMs: 3000,
    })
    
    if (!rateLimitResult.success) {
      console.log("[v0] Rate limit exceeded for payment")
      return json(
        { error: "Too many payment attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict) }
      )
    }

    // Backward-compatible body: clients may still send amount/currency, but both are IGNORED.
    // The price is always computed here from the stored application.
    const body = await request.json().catch(() => ({}))
    const { applicationId, success_url, cancel_url, failure_url } = body ?? {}
    // Test mode is a server setting too (a client could otherwise request a free test-mode intent).
    const test = process.env.ZIINA_TEST_MODE === "true"

    if (typeof applicationId !== "string" || !UUID_RE.test(applicationId)) {
      return json({ error: "Invalid application" }, { status: 400 })
    }

    // Only the path from the client is kept. A missing Origin stays allowed (the native app sends none):
    // preview then returns to https://$VERCEL_BRANCH_URL or https://$VERCEL_URL, and production stays on the official site.
    // A present Origin must be allowed, and on preview must be exactly one of those two hosts.
    // Ziina's payment intent has no test/live flag, so the mode is stamped on the return URLs (zmode=test). Reuse
    // below requires identical return URLs, so a live checkout is never reopened in test mode, and vice versa.
    const withMode = (url: string) => {
      try {
        const u = new URL(url)
        u.searchParams.delete("zmode")
        if (test) u.searchParams.set("zmode", "test")
        return u.toString()
      } catch {
        return url
      }
    }
    const toReturn = (u: unknown, fallbackPath: string) =>
      withMode(paymentReturnUrl({
        clientUrl: typeof u === "string" ? u : undefined,
        fallbackPath,
        requestOrigin: origin,
        isDev,
      }))
    const successUrl = toReturn(success_url, "/payment-success")
    const cancelUrl = toReturn(cancel_url, "/payment-failed")
    const failureUrl = toReturn(failure_url, "/payment-failed")

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.error("[payment] Database not configured")
      return json({ error: "Payment service configuration error" }, { status: 500 })
    }
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseKey)
    const lock = await claimPaymentCreation(supabase, applicationId)
    if (!lock.acquired) {
      const message = lock.status === 404 ? "Application not found"
        : lock.status === 423 ? "Checkout is already being prepared. Please retry in a moment."
        : "Could not prepare checkout. Please retry."
      return json({ error: message }, { status: lock.status, headers: { "Retry-After": "3" } })
    }
    releasePaymentLock = lock.release

    const { data: app, error: appError } = await supabase
      .from("visa_applications")
      .select("id, payment_id, payment_status, application_status, additional_notes")
      .eq("id", applicationId)
      .maybeSingle()
    if (appError) {
      console.error("[payment] Application lookup failed:", appError.code)
      return json({ error: "Could not load application" }, { status: 500 })
    }
    if (!app) return json({ error: "Application not found" }, { status: 404 })
    if (isPaidStatus(app.payment_status)) {
      return json({ error: "Application is already paid", code: "already_paid" }, { status: 409 })
    }
    if (["cancelled", "rejected"].includes(String(app.application_status ?? "").toLowerCase())) {
      // 410, not 409: the app treats 409 as "already paid" and would show the payment-success flow.
      return json({ error: "Application is closed", code: "closed" }, { status: 410 })
    }

    const { amount: serverAmount, currency: validCurrency } = priceForApplication(app.additional_notes)
    const amountInFils = Math.round(serverAmount * 100)

    // One open payment per application: reuse the linked intent while it can still be paid, so a double tap,
    // a retry or a second device never creates a second charge (and never unlinks an intent that is being paid).
    if (app.payment_id) {
      const existing = await fetchIntent(app.payment_id)
      if (existing?.status === "completed") {
        await applyIntentStatus(supabase, existing)
        return json({ error: "Application is already paid", code: "already_paid" }, { status: 409 })
      }
      if (
        existing &&
        OPEN_INTENT_STATUSES.includes(existing.status) &&
        existing.redirect_url &&
        existing.amount === amountInFils &&
        (!existing.success_url || existing.success_url === successUrl) &&
        (!existing.cancel_url || existing.cancel_url === cancelUrl) &&
        (!existing.failure_url || existing.failure_url === failureUrl)
      ) {
        return json({ ...existing, reused: true })
      }
    }

    const apiKey = process.env.ZIINA_API_KEY
    if (!apiKey) {
      console.error("[payment] Ziina API key not configured")
      return json({ error: "Payment service configuration error" }, { status: 500 })
    }

    console.log("[payment] Calling Ziina API", { waitedMs: Date.now() - started })
    const response = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInFils, // server-computed, smallest currency unit
        currency_code: validCurrency,
        success_url: successUrl,
        cancel_url: cancelUrl,
        failure_url: failureUrl,
        test,
      }),
    })

    console.log("[v0] Ziina API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Ziina API error:", errorText)
      // Never pass Ziina's own status through (a Ziina 409 would read as "already paid" in the app).
      return json({ error: "Failed to create payment intent" }, { status: 502 })
    }

    const data = await response.json()

    if (!data.redirect_url || !data.id) {
      console.log("[v0] Missing redirect_url or id in response")
      return json(
        { error: "Invalid payment response", details: "Missing redirect_url or id" },
        { status: 500 },
      )
    }

    // LINK PAYMENT TO APPLICATION. The previously linked intent can still be open in another tab or device, so every
    // intent ever issued for this application is also kept in additional_notes.paymentIntentIds; applyIntentStatus
    // falls back to that list, so paying an older intent still marks the application paid instead of orphaning it.
    await linkIntent(supabase, applicationId, data.id)

    console.log("[payment] Payment intent created", { id: data.id, ms: Date.now() - started })
    return json({ ...data, elapsedMs: Date.now() - started })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
    console.error("[payment] create-payment failed", { ms: Date.now() - started, timedOut, error })
    return json(
      {
        error: timedOut ? "The payment gateway took too long to respond. Retry." : "Failed to create payment intent",
        elapsedMs: Date.now() - started,
      },
      { status: timedOut ? 504 : 500 },
    )
  } finally {
    await releasePaymentLock?.()
  }
}

async function linkIntent(supabase: SupabaseClient, applicationId: string, intentId: string) {
  // Read-modify-write with a compare on updated_at; retried a few times if the row changed in between.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: cur, error } = await supabase
      .from("visa_applications")
      .select("additional_notes, updated_at")
      .eq("id", applicationId)
      .maybeSingle()
    if (error || !cur) throw new Error("Could not load application to link payment")
    let notes: Record<string, any> = {}
    try { const j = cur.additional_notes ? JSON.parse(cur.additional_notes) : {}; if (j && typeof j === "object") notes = j } catch { notes = { legacyNotes: cur.additional_notes } }
    const ids: string[] = Array.isArray(notes.paymentIntentIds) ? notes.paymentIntentIds.filter((x: unknown) => typeof x === "string") : []
    if (!ids.includes(intentId)) ids.push(intentId)
    notes.paymentIntentIds = ids.slice(-20)
    let q = supabase
      .from("visa_applications")
      .update({ payment_id: intentId, additional_notes: JSON.stringify(notes), updated_at: new Date().toISOString() })
      .eq("id", applicationId)
    q = cur.updated_at == null ? q.is("updated_at", null) : q.eq("updated_at", cur.updated_at)
    const { data: rows, error: upError } = await q.select("id")
    if (upError) throw new Error("Could not link payment to application")
    if (rows && rows.length) return
  }
  throw new Error("Could not link payment after retries")
}
