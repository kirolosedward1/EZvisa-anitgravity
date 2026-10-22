import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { applyIntentStatus, fetchIntent, serviceClient } from "@/lib/ziina"
import crypto from "crypto"

/**
 * Ziina Payment Webhook Handler
 * Ziina posts { event, data } (docs.ziina.com/api-reference/webhook), signed with X-Hmac-Signature when a secret is set.
 * The body is only a hint: the payment intent is re-fetched from Ziina with our API key and that status is stored,
 * so a forged request cannot mark an application as paid.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-hmac-signature") || request.headers.get("x-ziina-signature")
    const webhookSecret = process.env.ZIINA_WEBHOOK_SECRET

    if (webhookSecret) {
      if (!signature) {
        logger.error("Missing webhook signature", undefined, { prefix: "WEBHOOK" })
        return NextResponse.json({ error: "Missing signature" }, { status: 401 })
      }

      const computed = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
      const sigBuffer = Buffer.from(signature.toLowerCase())
      const compBuffer = Buffer.from(computed)

      if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
        logger.error("Invalid webhook signature", undefined, { prefix: "WEBHOOK" })
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    let payload: any
    try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }) }

    // Documented shape: { event: "payment_intent.status.updated", data: { id, status, ... } }; legacy: { id, status }.
    const event = typeof payload?.event === "string" ? payload.event : "payment_intent.status.updated"
    if (event !== "payment_intent.status.updated") {
      return NextResponse.json({ success: true, message: "Event ignored", event })
    }
    const intentId = payload?.data?.id ?? payload?.id
    if (typeof intentId !== "string" || !intentId) {
      logger.error("Invalid webhook payload - missing payment intent id", undefined, { prefix: "WEBHOOK" })
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = serviceClient()
    if (!supabase) {
      logger.error("Supabase not configured", undefined, { prefix: "WEBHOOK" })
      return NextResponse.json({ error: "Not configured" }, { status: 500 })
    }

    const intent = await fetchIntent(intentId)
    if (!intent) {
      // Unknown to Ziina (forged id) or Ziina unreachable: store nothing; a non-2xx makes Ziina retry.
      logger.error("Could not verify payment intent with Ziina", { intentId }, { prefix: "WEBHOOK" })
      return NextResponse.json({ error: "Could not verify payment" }, { status: 502 })
    }

    const result = await applyIntentStatus(supabase, intent)
    if (result.error) {
      logger.error("Database update failed", result.error, { prefix: "WEBHOOK" })
      return NextResponse.json({ error: "Database update failed" }, { status: 500 })
    }
    if (!result.row) {
      logger.warn("No application found for payment ID", { paymentId: intent.id }, { prefix: "WEBHOOK" })
      return NextResponse.json({ success: true, message: "No linked application", paymentId: intent.id })
    }
    logger.log("Payment status verified", { paymentId: intent.id, status: result.status, changed: result.changed }, { prefix: "WEBHOOK" })

    // Email once, on the transition only (Ziina retries and check-payment can apply the same status).
    if (result.changed && (result.status === "paid" || result.status === "failed") && result.row.email) {
      try {
        const { EmailService } = await import("@/lib/email/service")
        const application = result.row
        await EmailService.sendEvent({
          event: result.status === "paid" ? "payment.completed" : "payment.failed",
          entityId: application.id,
          recipient: application.email,
          language: application.preferred_language || "en",
          data: {
            id: application.id,
            trackingToken: application.tracking_token,
            firstName: application.full_name?.split(" ")[0] || "Customer",
            destination: application.destination_country || "",
            paymentAmount: typeof intent.amount === "number" ? intent.amount / 100 : 0,
            currency: intent.currency_code || "AED",
          },
        })
      } catch (emailError) {
        logger.error("Failed to send payment email", emailError, { prefix: "WEBHOOK" })
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed", paymentId: intent.id, status: result.status })
  } catch (error) {
    logger.error("Webhook processing error", error, { prefix: "WEBHOOK" })
    return NextResponse.json({ success: false, message: "Webhook processing error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Ziina webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
