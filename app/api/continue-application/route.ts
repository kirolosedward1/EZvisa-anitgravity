import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput } from "@/lib/sanitize"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { isDemoEmail, isDemoToken } from "@/lib/demo-data"
import { createServerClient } from "@/lib/supabase/server"
import {
  emptyAnswers, parseNotes, continueAnswers, isPaid, CONTINUE_STATUSES, validatePassportNumber, validateEmployment,
  type ApplicationNotes, type WizardAnswers,
} from "@/lib/shared/wizard-contract"

/**
 * POST /api/continue-application
 * The after-payment step ("Continue application"): passport number + employment details, saved exactly as the app
 * saves them (mobile/lib/data.ts saveContinueAnswers): additional_notes.wizard + the website's employment keys, and
 * the passport_number column. Authentication: the signed-in customer (cookie session or Bearer token; the case must
 * be theirs) or the case's secret tracking link.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimit(`continue:${getClientIp(request)}`, RATE_LIMITS.standard)
    if (!rate.success) {
      return NextResponse.json({ success: false, message: "Too many requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(rate, RATE_LIMITS.standard) })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 })
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : ""
    const trackingToken = typeof body.trackingToken === "string" ? body.trackingToken : ""
    if (!trackingToken && !UUID_RE.test(applicationId)) return NextResponse.json({ success: false, message: "Invalid application" }, { status: 400 })

    const clean = (v: unknown, max: number) => sanitizeInput(typeof v === "string" ? v : "", max)
    const patch = {
      passportNumber: clean(body.passportNumber, 40).toUpperCase(),
      employmentStatus: clean(body.employmentStatus, 20) as WizardAnswers["employmentStatus"],
      jobTitle: clean(body.jobTitle, 200),
      companyName: clean(body.companyName, 200),
      employmentStartDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.employmentStartDate ?? "")) ? String(body.employmentStartDate) : "",
      monthlySalary: clean(body.monthlySalary, 20),
      hasNOC: (body.hasNOC === "yes" || body.hasNOC === "no" ? body.hasNOC : "") as WizardAnswers["hasNOC"],
      averageMonthlyIncome: clean(body.averageMonthlyIncome, 100),
    }
    // Only the fields that apply to the chosen status are kept (same cleanup as the app's Continue screen).
    const emp = patch.employmentStatus === "employed"
    const biz = patch.employmentStatus === "business" || patch.employmentStatus === "freelancer"
    const answers = {
      ...patch,
      jobTitle: emp ? patch.jobTitle : "",
      companyName: emp || biz ? patch.companyName : "",
      employmentStartDate: emp ? patch.employmentStartDate : "",
      monthlySalary: emp ? patch.monthlySalary : "",
      hasNOC: emp ? patch.hasNOC : ("" as WizardAnswers["hasNOC"]),
      averageMonthlyIncome: biz ? patch.averageMonthlyIncome : "",
    }

    // Demo accounts: validate and acknowledge, nothing is stored.
    if (isDemoToken(trackingToken)) return NextResponse.json({ success: true, demo: true })

    const supabase = serviceClient()
    if (!supabase) return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 })

    // Who is asking: the secret link, or the signed-in customer (cookie session or Bearer token).
    let userEmail: string | null = null
    if (!trackingToken) {
      const auth = request.headers.get("authorization") ?? ""
      const jwt = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
      if (jwt) {
        const { data } = await supabase.auth.getUser(jwt)
        userEmail = data.user?.email?.toLowerCase() ?? null
      } else {
        try {
          const session = await createServerClient()
          const { data } = await session.auth.getUser()
          userEmail = data.user?.email?.toLowerCase() ?? null
        } catch {
          userEmail = null
        }
      }
      if (!userEmail) return NextResponse.json({ success: false, message: "Please sign in to continue your application" }, { status: 401 })
      if (isDemoEmail(userEmail)) return NextResponse.json({ success: true, demo: true })
    }

    let query = supabase.from("visa_applications").select("id, email, payment_status, application_status, additional_notes, passport_number")
    query = trackingToken ? query.eq("tracking_token", trackingToken) : query.eq("id", applicationId)
    const { data: row, error } = await query.maybeSingle()
    if (error) return NextResponse.json({ success: false, message: "Could not load application" }, { status: 500 })
    if (!row || (userEmail && String(row.email ?? "").toLowerCase() !== userEmail)) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 })
    }
    if (!isPaid(row)) return NextResponse.json({ success: false, message: "These details are added after payment" }, { status: 403 })
    if (!CONTINUE_STATUSES.includes(row.application_status ?? "submitted")) {
      return NextResponse.json({ success: false, message: "This application can no longer be changed here. Please message us on WhatsApp." }, { status: 403 })
    }

    const notes: ApplicationNotes = parseNotes(row.additional_notes)
    const current = continueAnswers(row)
    const merged: WizardAnswers = { ...emptyAnswers, ...current, ...answers }
    const problems = { ...validatePassportNumber({ hasValidPassport: merged.hasValidPassport, passportNumber: merged.passportNumber }), ...validateEmployment(merged) }
    const first = Object.values(problems)[0]
    if (first) return NextResponse.json({ success: false, message: first, errors: problems }, { status: 400 })

    const nextNotes: ApplicationNotes = {
      ...notes,
      employmentStatus: answers.employmentStatus, jobTitle: answers.jobTitle, companyName: answers.companyName, monthlySalary: answers.monthlySalary,
      lastEditedOn: "website",
      wizard: { ...(notes.wizard ?? {}), ...answers },
    }
    const { error: upError } = await supabase
      .from("visa_applications")
      .update({ additional_notes: JSON.stringify(nextNotes), passport_number: answers.passportNumber || null, updated_at: new Date().toISOString() })
      .eq("id", row.id)
    if (upError) return NextResponse.json({ success: false, message: "Could not save your details" }, { status: 500 })

    return NextResponse.json({ success: true, applicationId: row.id })
  } catch (error) {
    console.error("[continue-application] error:", error)
    return NextResponse.json({ success: false, message: "Could not save your details" }, { status: 500 })
  }
}
