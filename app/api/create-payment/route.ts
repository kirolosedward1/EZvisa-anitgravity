import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { SITE_URL, siteUrl } from "@/lib/site-url"

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

    const { applicationId, amount, currency = "AED", success_url, cancel_url, test = true } = await request.json()
    console.log("[v0] Payment request:", { applicationId, amount, currency, success_url, cancel_url, test })
    
    // Validate currency
    const supportedCurrencies = ["AED", "USD", "EUR", "GBP", "SAR"]
    const validCurrency = supportedCurrencies.includes(currency.toUpperCase()) ? currency.toUpperCase() : "AED"

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

    const apiKey = process.env.ZIINA_API_KEY
    if (!apiKey) {
      console.log("[v0] Ziina API key not configured")
      return NextResponse.json({ error: "Payment service configuration error" }, { status: 500 })
    }

    if (amount === undefined || amount === null) {
      console.log("[v0] Amount is missing")
      return NextResponse.json({ error: "Amount is required" }, { status: 400 })
    }

    // Convert to number, multiply by 100 to get fils, then round to ensure integer
    const numericAmount = Number(amount)

    if (isNaN(numericAmount)) {
      console.log("[v0] Amount is not a number:", amount)
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 })
    }

    const amountInFils = Math.round(numericAmount * 100)
    console.log("[v0] Amount in fils:", amountInFils)

    // Validate the amount is a positive integer
    if (!Number.isInteger(amountInFils) || amountInFils <= 0) {
      console.log("[v0] Invalid amount after conversion:", amountInFils)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    console.log("[v0] Calling Ziina API...")
    const response = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInFils, // Use validated integer amount in smallest currency unit
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
    console.log("[v0] Ziina API response data:", data)

    if (!data.redirect_url || !data.id) {
      console.log("[v0] Missing redirect_url or id in response")
      return NextResponse.json(
        { error: "Invalid payment response", details: "Missing redirect_url or id" },
        { status: 500 },
      )
    }

    // LINK PAYMENT TO APPLICATION
    if (applicationId) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
      
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { error } = await supabase
          .from("visa_applications")
          .update({ payment_id: data.id })
          .eq("id", applicationId)
          
        if (error) {
          console.error("Failed to link payment to application", error)
        }
      }
    }

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
