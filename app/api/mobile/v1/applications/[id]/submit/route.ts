import { RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeEmail, sanitizeInput, sanitizePhone } from "@/lib/sanitize"
import {
  APPLICATION_COLUMNS,
  ApiError,
  getAdmin,
  handler,
  json,
  loadOwnedApplication,
  rateLimit,
  readJson,
  requireUser,
  serializeApplication,
  type ApplicationRow,
} from "@/lib/mobile/server"
import { normalizeWizardData, priceAED, tripDurationDays, validateAll } from "@/lib/shared/visa-wizard"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — finalise a draft. Body: { wizardData, version }.
 * Writes the same columns as /api/submit-application (web) so admin tooling,
 * emails, tracking and the web dashboard treat it identically.
 */
export const POST = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`submit:${user.id}`, RATE_LIMITS.strict)
  const { id } = await params
  const row = await loadOwnedApplication(user, id)
  if (row.application_status !== "draft") {
    return json({ application: serializeApplication(row) }) // idempotent: already submitted
  }

  const body = await readJson<{ wizardData?: unknown; version?: unknown }>(request)
  const data = normalizeWizardData(body.wizardData ?? row.wizard_data)
  data.email = row.email || user.email || data.email

  const { step, errors } = validateAll(data)
  if (step) throw new ApiError(422, "validation_failed", "Some answers need attention.", { step, errors })

  const update = {
    full_name: `${sanitizeInput(data.firstName, 100)} ${sanitizeInput(data.lastName, 100)}`.trim(),
    email: sanitizeEmail(data.email),
    phone: sanitizePhone(data.phone),
    nationality: sanitizeInput(data.nationality, 100),
    destination_country: sanitizeInput(data.destination, 100),
    date_of_birth: data.dateOfBirth || null,
    passport_number: data.passportNumber ? sanitizeInput(data.passportNumber, 20) : null,
    entry_date: data.travelStartDate,
    exit_date: data.travelEndDate,
    duration_days: tripDurationDays(data.travelStartDate, data.travelEndDate),
    travel_purpose: sanitizeInput(data.purposeOfTrip, 500),
    previous_schengen_visa: data.isFirstSchengenVisa === "no",
    previous_rejections: data.previousRefusals === "yes",
    rejection_details: data.previousRefusals === "yes" ? sanitizeInput(data.refusalDetails, 1000) : null,
    // Same shape the web submit route stores, plus the extra trip answers.
    additional_notes: JSON.stringify({
      maritalStatus: data.maritalStatus,
      employmentStatus: data.employmentStatus,
      jobTitle: sanitizeInput(data.jobTitle, 200),
      companyName: sanitizeInput(data.companyName, 200),
      monthlySalary: data.monthlySalary,
      spouseAccompanying: data.spouseAccompanying,
      spouseFirstName: sanitizeInput(data.spouseFirstName, 100),
      spouseLastName: sanitizeInput(data.spouseLastName, 100),
      cityOfResidence: data.cityOfResidence,
      travelingWith: data.travelingWith,
      hotelCategory: data.hotelCategory,
      fundingSource: data.fundingSource,
      balanceRange: data.balanceRange,
      itinerary: sanitizeInput(data.itinerary, 2000),
    }),
    payment_amount: priceAED(data),
    payment_status: "pending",
    application_status: "submitted",
    submitted_at: new Date().toISOString(),
    wizard_data: data,
    current_step: 5,
    submission_ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    user_agent: request.headers.get("user-agent"),
    referrer: "ios-app",
  }

  let query = getAdmin().from("visa_applications").update(update).eq("id", row.id).eq("application_status", "draft")
  if (typeof body.version === "number") query = query.eq("version", body.version)
  const { data: saved, error } = await query.select(APPLICATION_COLUMNS).maybeSingle()
  if (error) throw error
  if (!saved) {
    const latest = await loadOwnedApplication(user, id)
    return json(
      {
        error: { code: "version_conflict", message: "This draft was updated on another device." },
        application: serializeApplication(latest),
      },
      { status: 409 },
    )
  }
  const app = saved as unknown as ApplicationRow

  try {
    const { EmailService } = await import("@/lib/email/service")
    await EmailService.sendEvent({
      event: "application.submitted",
      entityId: app.id,
      recipient: update.email,
      language: "en",
      data: {
        id: app.id,
        trackingToken: app.tracking_token,
        firstName: data.firstName || "Customer",
        destination: data.destination,
      },
    })
  } catch (err) {
    console.error("[mobile-submit] email failed", err) // non-blocking, same as web
  }

  return json({ application: serializeApplication(app) })
})
