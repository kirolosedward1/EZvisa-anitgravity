import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

/**
 * Ziina Payment Webhook Handler
 * Receives payment status updates from Ziina and updates the database
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json()
    
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

        // Send email notification on successful payment
        if (mappedStatus === "paid" && data[0].email) {
          try {
            const { getPaymentSuccessEmail } = await import("@/lib/email-templates")
            
            const emailData = {
              firstName: data[0].full_name?.split(" ")[0] || "Customer",
              lastName: data[0].full_name?.split(" ").slice(1).join(" ") || "",
              email: data[0].email,
              phone: data[0].phone || "",
              nationality: data[0].nationality || "",
              destination: data[0].destination_country || "",
              travelStartDate: data[0].entry_date || "",
              travelEndDate: data[0].exit_date || "",
              hasDocuments: data[0].has_passport || false,
            }

            const successEmail = getPaymentSuccessEmail(
              emailData,
              amount ? amount / 100 : 0,
              currency_code || "AED"
            )

            await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: data[0].email,
                subject: successEmail.subject,
                html: successEmail.html,
                type: "payment_success_webhook",
              }),
            })

            logger.log("Payment success email sent via webhook", { email: data[0].email }, { prefix: "WEBHOOK" })
          } catch (emailError) {
            logger.error("Failed to send payment success email", emailError, { prefix: "WEBHOOK" })
          }
        }

        // Send retry email on failed payment
        if (mappedStatus === "failed" && data[0].email) {
          try {
            const { getPaymentRetryEmail } = await import("@/lib/email-templates")
            
            const retryEmail = getPaymentRetryEmail({
              firstName: data[0].full_name?.split(" ")[0] || "Customer",
              lastName: data[0].full_name?.split(" ").slice(1).join(" ") || "",
              email: data[0].email,
              phone: data[0].phone || "",
              nationality: data[0].nationality || "",
              destination: data[0].destination_country || "",
              travelStartDate: data[0].entry_date || "",
              travelEndDate: data[0].exit_date || "",
              hasDocuments: data[0].has_passport || false,
            }, `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://ezvisa.net"}/apply?retry=true`)

            await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: data[0].email,
                subject: retryEmail.subject,
                html: retryEmail.html,
                type: "payment_retry_webhook",
              }),
            })

            logger.log("Payment retry email sent via webhook", { email: data[0].email }, { prefix: "WEBHOOK" })
          } catch (emailError) {
            logger.error("Failed to send payment retry email", emailError, { prefix: "WEBHOOK" })
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
