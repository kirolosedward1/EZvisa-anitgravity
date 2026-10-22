import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/lib/sanitize"
import { needsSchengenVisa } from "@/lib/nationalities"
import { passportCoversTrip } from "@/lib/wizard-rules"

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

    const formData = await request.json()
    const submittedAt = new Date().toISOString()
    // The answers as the app stores them (additional_notes.wizard), so the app shows website submissions the same way.
    const { draftId: _d, draftVersion: _v, ...answers } = formData ?? {}
    const wizard = Object.fromEntries(Object.entries(answers).filter(([, v]) => v === null || ["string", "boolean", "number"].includes(typeof v) || Array.isArray(v)))
    if (JSON.stringify(wizard).length > 50_000) {
      return NextResponse.json({ success: false, message: "Application data is too large." }, { status: 413 })
    }
    
    // Sanitize inputs
    const sanitizedData = {
      ...formData,
      firstName: sanitizeInput(formData.firstName || "", 100),
      lastName: sanitizeInput(formData.lastName || "", 100),
      email: sanitizeEmail(formData.email || ""),
      phone: sanitizePhone(formData.phone || ""),
      nationality: sanitizeInput(formData.nationality || "", 100),
      destination: sanitizeInput(formData.destination || "", 100),
      purposeOfTrip: sanitizeInput(formData.purposeOfTrip || "", 500),
      jobTitle: sanitizeInput(formData.jobTitle || "", 200),
      companyName: sanitizeInput(formData.companyName || "", 200),
    }

    // Same wizard rules as the app, also on the server (a ?step=payment link skips the browser's step checks).
    if (formData.nationality && !needsSchengenVisa(String(formData.nationality))) {
      return NextResponse.json({ success: false, message: "Please choose your nationality from the list." }, { status: 400 })
    }
    if (typeof formData.passportExpiry === "string" && formData.passportExpiry && !passportCoversTrip({ passportExpiry: formData.passportExpiry, travelEndDate: formData.travelEndDate })) {
      return NextResponse.json({ success: false, message: "Passport must be valid at least 3 months after your return date" }, { status: 400 })
    }

    // Server-side Date Validation
    if (formData.travelStartDate && formData.travelEndDate) {
      const start = new Date(formData.travelStartDate)
      const end = new Date(formData.travelEndDate)
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      
      if (end <= start) {
        return NextResponse.json({ success: false, message: "Return date must be after departure date" }, { status: 400 })
      }
      if (duration > 90) {
        return NextResponse.json({ success: false, message: "Stay duration cannot exceed 90 days" }, { status: 400 })
      }
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

    const row = {
      full_name: `${sanitizedData.firstName} ${sanitizedData.lastName}`,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      destination_country: sanitizedData.destination,
      date_of_birth: formData.dateOfBirth || null,
      entry_date: formData.travelStartDate,
      exit_date: formData.travelEndDate,
      travel_purpose: sanitizedData.purposeOfTrip,
      passport_number: formData.passportNumber || null,
      duration_days:
        formData.travelStartDate && formData.travelEndDate
          ? Math.ceil(
              (new Date(formData.travelEndDate).getTime() - new Date(formData.travelStartDate).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      has_passport: false,
      has_photos: false,
      has_bank_statements: false,
      has_employment_proof: false,
      payment_status: "pending",
      application_status: "submitted",
      additional_notes: JSON.stringify({
        maritalStatus: formData.maritalStatus,
        employmentStatus: formData.employmentStatus,
        jobTitle: sanitizedData.jobTitle,
        companyName: sanitizedData.companyName,
        monthlySalary: formData.monthlySalary,
        spouseAccompanying: formData.spouseAccompanying,
        source: "website",
        lastEditedOn: "website",
        wizardStep: "payment",
        submittedAt,
        wizard,
      }),
    }

    // A signed-in user's saved draft (shared with the EZvisa app) becomes this application instead of a second row.
    // The session token proves who is submitting; the draft must be theirs and still a draft.
    let data: any[] | null = null
    let error: unknown = null
    const draftId = typeof formData.draftId === "string" && /^[0-9a-f-]{36}$/i.test(formData.draftId) ? formData.draftId : null
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
    if (draftId) {
      // A draft submit is never turned into a guest insert: without a valid owner token and the version the user saw,
      // nothing is written.
      if (!token || typeof formData.draftVersion !== "string") {
        return NextResponse.json({ success: false, message: "Please sign in again to submit this application." }, { status: 403 })
      }
      const { data: auth } = await supabase.auth.getUser(token)
      const userEmail = auth.user?.email?.toLowerCase()
      const { data: current } = await supabase.from("visa_applications").select("id, email, application_status, additional_notes").eq("id", draftId).maybeSingle()
      if (!userEmail || !current || current.email?.toLowerCase() !== userEmail) {
        return NextResponse.json({ success: false, message: "This application isn't on your account." }, { status: 403 })
      }
      {
        if (current.application_status === "draft") {
          let notes: Record<string, unknown> = {}
          try { notes = JSON.parse(current.additional_notes || "{}") } catch {}
          // Only the version the user saw: if the draft changed elsewhere (e.g. in the app) since, nothing is written.
          const base = typeof formData.draftVersion === "string" ? formData.draftVersion : null
          let q = supabase
            .from("visa_applications")
            .update({ ...row, email: userEmail, additional_notes: JSON.stringify({ ...notes, ...JSON.parse(row.additional_notes), source: notes.source ?? "website", wizardQuestion: undefined, wizard: { ...((notes.wizard as object) ?? {}), ...wizard } }), updated_at: new Date().toISOString() })
            .eq("id", draftId)
            .eq("application_status", "draft")
          if (base) q = q.eq("updated_at", base)
          const res = await q.select()
          data = res.data
          error = res.error
          if (!error && !data?.length) {
            const { data: still } = await supabase.from("visa_applications").select("id").eq("id", draftId).eq("application_status", "draft").maybeSingle()
            if (still) return NextResponse.json({ success: false, message: "This application was changed in the app or another browser. Reload the page to see the latest version." }, { status: 409 })
          }
        }
        if (!error && !data?.length) {
          // Already submitted (double click, or submitted in the app): return the same application. A discarded draft
          // is not resurrected.
          const res = await supabase.from("visa_applications").select("id, application_status").eq("id", draftId).neq("application_status", "draft")
          if (res.data?.[0]?.application_status === "cancelled") return NextResponse.json({ success: false, message: "This application was discarded. Start a new one." }, { status: 409 })
          if (res.data?.length) return NextResponse.json({ success: true, message: "Application already submitted", applicationId: res.data[0].id })
        }
      }
    }
    if (!data?.length && !error) {
      const res = await supabase.from("visa_applications").insert([row]).select()
      data = res.data
      error = res.error
    }

    if (error || !data?.length) {
      console.error("[submit-application] save failed:", error)
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
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error submitting application",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
