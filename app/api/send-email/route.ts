import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { escapeHtml, sanitizeEmail } from "@/lib/sanitize"
import { serviceClient } from "@/lib/applications"

/**
 * POST /api/send-email: the website contact form only.
 * Body: { name, email, subject, message }. The recipient is always the EZvisa inbox and the HTML is built here,
 * so this endpoint can't be used to send arbitrary mail from noreply@ezvisa.net (it used to accept to/subject/html).
 * The message is saved first (contact_messages, migration 013, shown in the staff console under Messaging), so it is
 * never lost when email delivery fails; the visitor gets an error only if it could be neither saved nor emailed.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = process.env.EMAIL_ADMIN_ADDRESS || "ezvisa.net@gmail.com"
const FROM_EMAIL = "EZvisa <noreply@ezvisa.net>"

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "")

export async function POST(request: Request) {
  let saved = false
  try {
    const clientIp = getClientIp(request)
    // A Redis outage falls back to an in-memory window instead of letting every request through.
    const rateLimitResult = await checkRateLimit(`contact:${clientIp}`, RATE_LIMITS.strict, { onError: "memory", timeoutMs: 3000 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: "Too many messages. Please wait a minute and try again." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.strict) },
      )
    }

    const body = await request.json().catch(() => null)
    const name = clean(body?.name, 120)
    const email = sanitizeEmail(clean(body?.email, 200))
    const subject = clean(body?.subject, 200)
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 5000) : ""

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "Please fill in your name, a valid email and a message." }, { status: 400 })
    }

    // Save first. A missing table (migration 013 not applied) or a database error falls back to email only.
    let savedId: string | null = null
    try {
      const client = serviceClient()
      const { data, error } = client ? await client.from("contact_messages").insert({ name, email, subject, message }).select("id").single() : { data: null, error: null }
      if (error) console.error("[contact] save failed:", error.code)
      savedId = (data as { id: string } | null)?.id ?? null
    } catch {
      // email below is still tried
    }
    saved = !!savedId

    if (!RESEND_API_KEY) {
      console.error("[contact] RESEND_API_KEY not configured")
      return saved ? NextResponse.json({ success: true, message: "Message received" }) : NextResponse.json({ success: false, message: "Email service not configured" }, { status: 500 })
    }

    const row = (label: string, value: string, shade: boolean) =>
      `<tr${shade ? ' style="background: #f8fafc;"' : ""}><td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; width: 120px;">${label}</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${value}</td></tr>`
    const html = `
      <h2 style="color: #2563eb;">New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        ${row("Name", escapeHtml(name), true)}
        ${row("Email", escapeHtml(email), false)}
        ${row("Subject", escapeHtml(subject || "(none)"), true)}
        ${row("Message", escapeHtml(message).replace(/\n/g, "<br>"), false)}
      </table>`

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `EZvisa Contact: ${subject || name}`,
        html,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      console.error("[contact] Resend error:", response.status, data?.message)
      // Saved in the console, so the team still sees it; otherwise tell the visitor (it would be lost).
      if (saved) return NextResponse.json({ success: true, message: "Message received" })
      return NextResponse.json(
        { success: false, message: "We couldn't send your message. Please try again or reach us on WhatsApp." },
        { status: 502 },
      )
    }

    if (savedId) {
      const client = serviceClient()
      if (client) await client.from("contact_messages").update({ email_sent: true }).eq("id", savedId).then(() => undefined, () => undefined)
    }
    return NextResponse.json({ success: true, message: "Message sent" })
  } catch (error) {
    console.error("[contact] send error:", error instanceof Error ? error.message : error)
    if (saved) return NextResponse.json({ success: true, message: "Message received" })
    return NextResponse.json(
      { success: false, message: "We couldn't send your message. Please try again or reach us on WhatsApp." },
      { status: 500 },
    )
  }
}
