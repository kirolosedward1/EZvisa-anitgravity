import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeEmail } from "@/lib/sanitize"

// Security: API key must come from environment variables only
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = "ezvisa.net@gmail.com"
const FROM_EMAIL = "EZVisa <noreply@ezvisa.net>"
const IS_SANDBOX_MODE = false

export async function POST(request: Request) {
  try {
    // Rate limiting (Redis-based)
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`email:${clientIp}`, RATE_LIMITS.standard)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: "Too many email requests" },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const { to, subject, html, type } = await request.json()
    
    // Validate email recipient
    const sanitizedTo = Array.isArray(to) ? to.map(sanitizeEmail).filter(Boolean) : sanitizeEmail(to)
    if (!sanitizedTo || (Array.isArray(sanitizedTo) && sanitizedTo.length === 0)) {
      return NextResponse.json({ success: false, message: "Invalid recipient email" }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      console.error("[v0] RESEND_API_KEY not configured")
      return NextResponse.json(
        { success: false, message: "Email service not configured" },
        { status: 500 }
      )
    }

    // In sandbox mode, redirect all client emails to admin with a note
    let finalRecipient = to
    let finalSubject = subject
    let finalHtml = html

    if (IS_SANDBOX_MODE && type !== "admin_notification" && to !== ADMIN_EMAIL) {
      console.log("[v0] Sandbox mode: Redirecting client email to admin")
      finalRecipient = ADMIN_EMAIL
      finalSubject = `[CLIENT EMAIL FOR: ${to}] ${subject}`
      finalHtml = `
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #856404;">📧 Testing Mode - Client Email</h3>
          <p style="margin: 0; color: #856404;">
            <strong>Original Recipient:</strong> ${to}<br>
            <strong>Email Type:</strong> ${type}<br>
            <strong>Note:</strong> To send to actual clients, verify your domain at resend.com/domains
          </p>
        </div>
        ${html}
      `
    }

    console.log("[v0] Final recipient:", finalRecipient)

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(finalRecipient) ? finalRecipient : [finalRecipient],
        subject: finalSubject,
        html: finalHtml,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Resend API error:", data)
      console.error("[v0] Error message:", data.message)
      
      // Return success anyway to not block the application flow
      console.log("[v0] Returning success despite email error (non-blocking)")
      return NextResponse.json(
        {
          success: true,
          message: "Application submitted (email pending)",
          warning: "Email delivery pending domain verification",
          error: data.message,
        },
        { status: 200 }
      )
    }

    console.log("[v0] Email sent successfully:", data.id)
    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      emailId: data.id,
      sandboxMode: IS_SANDBOX_MODE && type !== "admin_notification",
    })
  } catch (error) {
    console.error("[v0] Email sending error:", error)
    
    // Return success to not block application flow
    return NextResponse.json(
      {
        success: true,
        message: "Application submitted (email error occurred)",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    )
  }
}

// Helper function to send admin notification
export async function sendAdminNotification(applicationData: any) {
  const { getAdminNotificationEmail } = await import("@/lib/email-templates")
  const emailContent = getAdminNotificationEmail(applicationData)

  return fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: ADMIN_EMAIL,
      subject: emailContent.subject,
      html: emailContent.html,
      type: "admin_notification",
    }),
  })
}

// Helper function to send client confirmation
export async function sendClientConfirmation(applicationData: any) {
  const { getClientConfirmationEmail } = await import("@/lib/email-templates")
  const emailContent = getClientConfirmationEmail(applicationData)

  return fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: applicationData.email,
      subject: emailContent.subject,
      html: emailContent.html,
      type: "client_confirmation",
    }),
  })
}

// Helper function to send payment success email
export async function sendPaymentSuccessEmail(applicationData: any, paymentAmount: number, currency: string) {
  const { getPaymentSuccessEmail } = await import("@/lib/email-templates")
  const emailContent = getPaymentSuccessEmail(applicationData, paymentAmount, currency)

  return fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: applicationData.email,
      subject: emailContent.subject,
      html: emailContent.html,
      type: "payment_success",
    }),
  })
}

// Helper function to send payment retry email
export async function sendPaymentRetryEmail(applicationData: any, paymentLink: string) {
  const { getPaymentRetryEmail } = await import("@/lib/email-templates")
  const emailContent = getPaymentRetryEmail(applicationData, paymentLink)

  return fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: applicationData.email,
      subject: emailContent.subject,
      html: emailContent.html,
      type: "payment_retry",
    }),
  })
}
