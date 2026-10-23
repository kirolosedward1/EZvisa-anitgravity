import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/lib/sanitize"
import {
  datesInOrder,
  formatTravelMonth,
  INVALID_DATE_MESSAGE,
  parseCalendarDate,
  RETURN_AFTER_DEPARTURE,
  schengenEndDate,
  schengenStayDays,
  TRIP_LENGTHS,
} from "@/lib/dates"
import { toCitizenshipIso } from "@/lib/nationalities"
import { ACTIVE_APPLICATION_LIMIT } from "@/lib/active-applications"

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

type OwnedApplication = {
  id: string
  tracking_token: string | null
  user_id?: string | null
  email?: string | null
}

type SessionUser = {
  id: string
  email: string | null
}

function isMissingUserIdColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ""
  return (
    (error.code === "PGRST204" || error.code === "42703") &&
    message.includes("user_id")
  )
}

function tripScoped(
  query: any,
  destination: string,
  startIso: string | null,
  endIso: string | null,
  since: string,
) {
  let scoped = query
    .eq("destination_country", destination)
    .in("application_status", ["draft", "submitted"])
    .gte("created_at", since)
  scoped = startIso ? scoped.eq("entry_date", startIso) : scoped.is("entry_date", null)
  scoped = endIso ? scoped.eq("exit_date", endIso) : scoped.is("exit_date", null)
  return scoped
}

function sessionEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase() ?? ""
  return value.length > 0 ? value : null
}

function reusedApplication(row: OwnedApplication) {
  return NextResponse.json({
    success: true,
    message: "Application submitted successfully",
    applicationId: row.id,
    trackingToken: row.tracking_token ?? undefined,
    created: false,
  })
}

/** Signed-in user from the cookie session, or from a bearer token. Never from the request body. */
async function sessionUser(request: Request, admin: SupabaseClient): Promise<SessionUser | null> {
  const fromAuthUser = (user: { id?: string; email?: string | null } | null | undefined): SessionUser | null => {
    const id = user?.id?.trim().toLowerCase() ?? ""
    if (!id) return null
    return { id, email: sessionEmail(user?.email) }
  }

  try {
    const cookieClient = await createServerClient()
    const { data } = await cookieClient.auth.getUser()
    const cookieUser = fromAuthUser(data.user)
    if (cookieUser) return cookieUser
  } catch (error) {
    console.error("[submit] cookie session lookup failed:", error instanceof Error ? error.name : "unknown")
  }

  const header = request.headers.get("authorization") ?? ""
  const jwt = /^Bearer\s+(\S+)/i.exec(header)?.[1] ?? ""
  if (!jwt) return null
  const { data, error } = await admin.auth.getUser(jwt)
  if (error) return null
  return fromAuthUser(data.user)
}

export async function POST(request: Request) {
  try {
    // Rate limiting (Redis-based)
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`submit-app:${clientIp}`, RATE_LIMITS.standard, { onError: "memory" })
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const formData = await request.json()
    
    // Sanitize inputs
    const sanitizedData = {
      ...formData,
      firstName: sanitizeInput(formData.firstName || "", 100),
      lastName: sanitizeInput(formData.lastName || "", 100),
      email: sanitizeEmail(formData.email || ""),
      phone: sanitizePhone(formData.phone || ""),
      nationality: toCitizenshipIso(formData.nationality || "") || sanitizeInput(formData.nationality || "", 100),
      destination: sanitizeInput(formData.destination || "", 100),
      purposeOfTrip: sanitizeInput(formData.purposeOfTrip || "", 500),
      jobTitle: sanitizeInput(formData.jobTitle || "", 200),
      companyName: sanitizeInput(formData.companyName || "", 200),
    }

    const flexible = formData.datesFlexible === "yes"
    let flexibleNote = ""
    let startDate = formData.travelStartDate ? parseCalendarDate(formData.travelStartDate) : null
    let endDate = formData.travelEndDate ? parseCalendarDate(formData.travelEndDate) : null

    if (flexible) {
      const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(formData.travelMonth || "").trim())
      const length = Number(formData.tripLength)
      const allowed = TRIP_LENGTHS.some((item) => item.days === length)
      if (!month || !allowed) {
        return NextResponse.json(
          { success: false, message: "Choose a travel month and trip length." },
          { status: 400 },
        )
      }
      const entry = parseCalendarDate(`${month[1]}-${month[2]}-01`)
      const exit = entry ? parseCalendarDate(schengenEndDate(entry.iso, length)) : null
      if (!entry || !exit) {
        return NextResponse.json({ success: false, message: INVALID_DATE_MESSAGE }, { status: 400 })
      }
      startDate = entry
      endDate = exit
      flexibleNote = `Flexible dates: travelling around ${formatTravelMonth(month[0])}`
    } else {
      if (formData.travelStartDate && !startDate) {
        return NextResponse.json({ success: false, message: INVALID_DATE_MESSAGE }, { status: 400 })
      }
      if (formData.travelEndDate && !endDate) {
        return NextResponse.json({ success: false, message: INVALID_DATE_MESSAGE }, { status: 400 })
      }
      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, message: "Please select a departure date and a return date." },
          { status: 400 },
        )
      }
      if (!datesInOrder(startDate.iso, endDate.iso)) {
        return NextResponse.json({ success: false, message: RETURN_AFTER_DEPARTURE }, { status: 400 })
      }
    }

    if (startDate && endDate && schengenStayDays(startDate.iso, endDate.iso) > 90) {
      return NextResponse.json({ success: false, message: "Stay duration cannot exceed 90 days" }, { status: 400 })
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
    const session = await sessionUser(request, supabase)
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
    const startIso = startDate?.iso ?? null
    const endIso = endDate?.iso ?? null
    let userIdColumnMissing = false

    // Reuse a row only for the signed-in user. Prefer user_id when that column
    // exists. Otherwise match auth.getUser().email, never the email in the body.
    if (session) {
      const { data: duplicate, error: duplicateError } = await tripScoped(
        supabase
          .from("visa_applications")
          .select("id, tracking_token, user_id")
          .eq("user_id", session.id)
          .order("created_at", { ascending: false })
          .limit(1),
        sanitizedData.destination,
        startIso,
        endIso,
        since,
      ).maybeSingle()

      if (!duplicateError) {
        const owned = duplicate as OwnedApplication | null
        if (owned?.id && owned.user_id?.toLowerCase() === session.id) {
          return reusedApplication(owned)
        }
      } else if (!isMissingUserIdColumn(duplicateError)) {
        console.error("[submit] duplicate lookup failed:", duplicateError.code)
        return NextResponse.json({ success: false, message: "Failed to save application" }, { status: 500 })
      } else {
        userIdColumnMissing = true
        if (session.email) {
          const { data: byEmail, error: emailError } = await tripScoped(
            supabase
              .from("visa_applications")
              .select("id, tracking_token, email")
              .eq("email", session.email)
              .order("created_at", { ascending: false })
              .limit(1),
            sanitizedData.destination,
            startIso,
            endIso,
            since,
          ).maybeSingle()
          if (emailError) {
            console.error("[submit] duplicate lookup failed:", emailError.code)
            return NextResponse.json({ success: false, message: "Failed to save application" }, { status: 500 })
          }
          const owned = byEmail as OwnedApplication | null
          if (owned?.id && sessionEmail(owned.email) === session.email) {
            return reusedApplication(owned)
          }
        }
      }
    } else if (sanitizedData.email) {
      // A guest who repeats the same trip must not receive someone else's id,
      // reference, or payment link, and must not open a second application.
      const { count, error: duplicateError } = await tripScoped(
        supabase.from("visa_applications").select("created_at", { count: "exact", head: true }),
        sanitizedData.destination,
        startIso,
        endIso,
        since,
      ).eq("email", sanitizedData.email)

      if (duplicateError) {
        console.error("[submit] guest duplicate lookup failed:", duplicateError.code)
        return NextResponse.json({ success: false, message: "Failed to save application" }, { status: 500 })
      }
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { success: false, error: "duplicate_application" },
          { status: 409 },
        )
      }
    }

    if (sanitizedData.email) {
      const { data: existing } = await supabase
        .from("visa_applications")
        .select("id, payment_status, application_status")
        .eq("email", sanitizedData.email)
        .in("application_status", ["draft", "submitted"])
      const abandoned = (existing || []).filter(
        (row) => row.payment_status !== "paid" && row.payment_status !== "completed",
      )
      if (abandoned.length >= ACTIVE_APPLICATION_LIMIT) {
        return NextResponse.json(
          { success: false, message: `You can have up to ${ACTIVE_APPLICATION_LIMIT} unpaid applications. Discard one before starting another.` },
          { status: 409 },
        )
      }
    }

    const applicationRow: Record<string, unknown> = {
      full_name: `${sanitizedData.firstName} ${sanitizedData.lastName}`,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      destination_country: sanitizedData.destination,
      date_of_birth: formData.dateOfBirth || null,
      entry_date: startDate?.iso || null,
      exit_date: endDate?.iso || null,
      travel_purpose: sanitizedData.purposeOfTrip,
      passport_number: formData.passportNumber || null,
      duration_days: startDate && endDate ? schengenStayDays(startDate.iso, endDate.iso) : null,
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
        ...(flexibleNote ? { flexibleDates: flexibleNote } : {}),
      }),
    }
    if (session && !userIdColumnMissing) applicationRow.user_id = session.id

    let { data, error } = await supabase.from("visa_applications").insert([applicationRow]).select()
    if (error && "user_id" in applicationRow && isMissingUserIdColumn(error)) {
      delete applicationRow.user_id
      const retry = await supabase.from("visa_applications").insert([applicationRow]).select()
      data = retry.data
      error = retry.error
    }

    if (error || !data?.[0]) {
      console.error("[submit] insert failed:", error?.code)
      return NextResponse.json({ success: false, message: "Failed to save application" }, { status: 500 })
    }

    const application = data[0];

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
      trackingToken: application.tracking_token ?? undefined,
      created: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error submitting application",
      },
      { status: 500 },
    )
  }
}
