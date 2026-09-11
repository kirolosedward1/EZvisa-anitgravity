import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"
import crypto from "crypto"

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

/**
 * Ziina Payment Webhook Handler
 * Receives payment status updates from Ziina and updates the database
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-ziina-signature")
    const webhookSecret = process.env.ZIINA_WEBHOOK_SECRET

    if (webhookSecret) {
      if (!signature) {
        logger.error("Missing webhook signature", undefined, { prefix: "WEBHOOK" })
        return NextResponse.json({ error: "Missing signature" }, { status: 401 })
      }

      const computed = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
      const sigBuffer = Buffer.from(signature)
      const compBuffer = Buffer.from(computed)

      if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
        logger.error("Invalid webhook signature", undefined, { prefix: "WEBHOOK" })
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    
    logger.log("Ziina webhook received", payload, { prefix: "WEBHOOK" })

    // Extract payment information
    const {
      id: paymentId,
      status,
      amount,
      currency_code,
      metadata,
      created_at,
      completed_at,
    } = payload

    if (!paymentId || !status) {
      logger.error("Invalid webhook payload - missing required fields", payload, { prefix: "WEBHOOK" })
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Map Ziina status to our payment status
    const paymentStatusMap: Record<string, string> = {
      "completed": "paid",
      "pending": "pending",
      "failed": "failed",
      "cancelled": "cancelled",
      "expired": "expired",
      "refunded": "refunded",
      "partially_refunded": "partially_refunded",
    }

    const mappedStatus = paymentStatusMap[status.toLowerCase()] || status.toLowerCase()

    // Update database if Supabase is configured
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Find application by payment_id and update status
      const { data, error } = await supabase
        .from("visa_applications")
        .update({
          payment_status: mappedStatus,
          payment_amount: amount ? amount / 100 : null, // Convert from fils to currency
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", paymentId)
        .select()

      if (error) {
        logger.error("Database update failed", error, { prefix: "WEBHOOK" })
        // Don't return error - webhook should still acknowledge receipt
      } else if (data && data.length > 0) {
        logger.log(`Payment status updated for application`, { paymentId, status: mappedStatus }, { prefix: "WEBHOOK" })

        if ((mappedStatus === "paid" || mappedStatus === "failed") && data[0].email) {
          try {
            const { EmailService } = await import("@/lib/email/service");
            const eventName = mappedStatus === "paid" ? "payment.completed" : "payment.failed";
            const application = data[0];
            
            await EmailService.sendEvent({
              event: eventName,
              entityId: application.id,
              recipient: application.email,
              language: application.preferred_language || "en",
              data: {
                id: application.id,
                trackingToken: application.tracking_token,
                firstName: application.full_name?.split(" ")[0] || "Customer",
                destination: application.destination_country || "",
                paymentAmount: amount ? amount / 100 : 0,
                currency: currency_code || "AED"
              }
            });
            logger.log(`Payment email sent via webhook: ${eventName}`, { email: application.email }, { prefix: "WEBHOOK" });
          } catch (emailError) {
            logger.error("Failed to send payment email", emailError, { prefix: "WEBHOOK" });
          }
        }
      } else {
        logger.warn("No application found for payment ID", { paymentId }, { prefix: "WEBHOOK" })
      }
    } else {
      logger.warn("Supabase not configured - skipping database update", undefined, { prefix: "WEBHOOK" })
    }

    // Always return success to acknowledge webhook receipt
    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      paymentId,
      status: mappedStatus,
    })
  } catch (error) {
    logger.error("Webhook processing error", error, { prefix: "WEBHOOK" })
    
    // Return 200 to prevent webhook retries for processing errors
    return NextResponse.json({
      success: false,
      message: "Webhook processing error",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

// Verify webhook signature (if Ziina provides one)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Ziina webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
