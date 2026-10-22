import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/lib/sanitize"
import {
  emptyAnswers, pickAnswers, coerceAnswers, applicationColumns, parseNotes, referenceOf, showSpouse,
  validatePersonal, validateSpouse, validateTrip, type WizardAnswers,
} from "@/lib/shared/wizard-contract"

/**
 * POST /api/submit-application
 * Turns the website wizard's answers into a public.visa_applications row with exactly the column mapping and
 * additional_notes JSON the EZvisa app writes (lib/shared/wizard-contract.ts applicationColumns), so staff, the
 * app and the website read every case the same way. Employment and the passport number are added after payment.
 */
export async function POST(request: Request) {
  try {
    // Rate limiting (Redis-based)
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`submit-app:${clientIp}`, RATE_LIMITS.standard)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 })
    }

    // Only the shared answer keys are stored; everything is trimmed/normalised and coerced to the current rules.
    const raw = pickAnswers(body as Record<string, unknown>)
    const clean = (v: unknown, max: number) => sanitizeInput(typeof v === "string" ? v : "", max)
    const answers: WizardAnswers = coerceAnswers({
      ...emptyAnswers,
      ...raw,
      firstName: clean(raw.firstName, 100),
      lastName: clean(raw.lastName, 100),
      email: sanitizeEmail(typeof raw.email === "string" ? raw.email : ""),
      phone: typeof raw.phone === "string" ? raw.phone.trim() : "",
      nationality: clean(raw.nationality, 100),
      destination: clean(raw.destination, 100),
      cityOfResidence: clean(raw.cityOfResidence, 100),
      purposeOfTrip: clean(raw.purposeOfTrip, 100),
      passportNumber: clean(raw.passportNumber, 40).toUpperCase(),
      jobTitle: clean(raw.jobTitle, 200),
      companyName: clean(raw.companyName, 200),
      averageMonthlyIncome: clean(raw.averageMonthlyIncome, 100),
      spouseFirstName: clean(raw.spouseFirstName, 100),
      spouseLastName: clean(raw.spouseLastName, 100),
      spouseOccupation: clean(raw.spouseOccupation, 200),
      refusalDetails: clean(raw.refusalDetails, 2000),
      itinerary: clean(raw.itinerary, 5000),
      additionalCountries: Array.isArray(raw.additionalCountries) ? raw.additionalCountries.slice(0, 20) : [],
    })

    // Server-side validation with the same rules as the wizard (and the app).
    const problems = { ...validatePersonal(answers), ...(showSpouse(answers) ? validateSpouse(answers) : {}), ...validateTrip(answers) }
    const firstProblem = Object.values(problems)[0]
    if (firstProblem) {
      return NextResponse.json({ success: false, message: firstProblem, errors: problems }, { status: 400 })
    }

    // Support multiple env var naming conventions
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      })
      return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    const meta = {
      platform: "web" as const,
      source: "website" as const,
      userAgent: request.headers.get("user-agent") || "unknown",
      referrer: request.headers.get("referer") || "direct",
      extra: { submittedAt: now },
    }
    const base = {
      has_passport: false,
      has_photos: false,
      has_bank_statements: false,
      has_employment_proof: false,
      payment_status: "pending",
      application_status: "submitted",
      submission_ip: clientIp,
    }

    // A signed-in user's saved draft (shared with the EZvisa app) becomes this application instead of a second row.
    // The session token proves who is submitting; the draft must be theirs and still a draft.
    let data: any[] | null = null
    let error: unknown = null
    const draftId = typeof body.draftId === "string" && /^[0-9a-f-]{36}$/i.test(body.draftId) ? body.draftId : null
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
    if (draftId && token) {
      const { data: auth } = await supabase.auth.getUser(token)
      const userEmail = auth.user?.email?.toLowerCase()
      const { data: current } = await supabase.from("visa_applications").select("id, email, application_status, additional_notes").eq("id", draftId).maybeSingle()
      if (userEmail && current && current.email?.toLowerCase() === userEmail) {
        if (current.application_status === "draft") {
          // Only the version the user saw: if the draft changed elsewhere (e.g. in the app) since, nothing is written.
          const draftVersion = typeof body.draftVersion === "string" ? body.draftVersion : null
          let q = supabase
            .from("visa_applications")
            .update({ ...applicationColumns(answers, userEmail, "payment", parseNotes(current.additional_notes), meta), ...base, updated_at: now })
            .eq("id", draftId)
            .eq("application_status", "draft")
          if (draftVersion) q = q.eq("updated_at", draftVersion)
          const res = await q.select()
          data = res.data
          error = res.error
          if (!error && !data?.length) {
            const { data: still } = await supabase.from("visa_applications").select("id").eq("id", draftId).eq("application_status", "draft").maybeSingle()
            if (still) return NextResponse.json({ success: false, message: "This application was changed in the app or another browser. Reload the page to see the latest version." }, { status: 409 })
          }
        }
        if (!error && !data?.length) {
          // Already submitted (double click, or submitted in the app): return the same application.
          const res = await supabase.from("visa_applications").select().eq("id", draftId).neq("application_status", "draft")
          if (res.data?.length) {
            const existing = res.data[0]
            return NextResponse.json({ success: true, message: "Application already submitted", applicationId: existing.id, reference: referenceOf(existing.id), trackingToken: existing.tracking_token ?? undefined })
          }
        }
      }
    }
    if (!data?.length && !error) {
      const res = await supabase.from("visa_applications").insert([{ ...applicationColumns(answers, answers.email, "payment", {}, meta), ...base }]).select()
      data = res.data
      error = res.error
    }

    if (error || !data?.length) {
      console.error("[Submit] Failed to save application:", error)
      return NextResponse.json({ success: false, message: "Failed to save application" }, { status: 500 })
    }

    const application = data[0]

    // Trigger application.submitted email asynchronously
    try {
      const { EmailService } = await import("@/lib/email/service");
      await EmailService.sendEvent({
        event: "application.submitted",
        entityId: application.id,
        recipient: application.email,
        language: application.preferred_language || "en",
        data: {
          id: application.id,
          trackingToken: application.tracking_token,
          firstName: application.full_name?.split(" ")[0] || "Customer",
          destination: application.destination_country || "",
        }
      });
    } catch (err) {
      console.error("[Submit] Email notification failed:", err);
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: application.id,
      reference: referenceOf(application.id),
      trackingToken: application.tracking_token ?? undefined,
    })
  } catch (error) {
    console.error("[Submit] Error submitting application:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error submitting application",
      },
      { status: 500 },
    )
  }
}
