/**
 * Single source of truth for how a visa application's database state maps to
 * what the customer sees on /dashboard and /track/[token].
 */

export type ApplicationLike = {
  id?: string | null
  payment_status?: string | null
  application_status?: string | null
  has_passport?: boolean | null
  has_photos?: boolean | null
  has_bank_statements?: boolean | null
  has_employment_proof?: boolean | null
  passport_number?: string | null
  entry_date?: string | null
  exit_date?: string | null
  travel_start_date?: string | null
  travel_end_date?: string | null
  travel_purpose?: string | null
  additional_notes?: string | null
  updated_at?: string | null
  paid_at?: string | null
  tracking_token?: string | null
  payment_amount?: number | null
}

export type StepKey = "payment" | "documents" | "review" | "preparation" | "ready"

export type Stage = StepKey | "rejected" | "cancelled"

export const APPLICATION_STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: "payment", label: "Payment", description: "Secure your file" },
  { key: "documents", label: "Documents", description: "Upload your papers" },
  { key: "review", label: "Expert review", description: "We check everything" },
  { key: "preparation", label: "Preparation", description: "Cover letter & itinerary" },
  { key: "ready", label: "Ready", description: "Print & submit" },
]

/** Document types match the `documentType` values accepted by /api/upload-document */
export const REQUIRED_DOCUMENTS = [
  { key: "has_passport", uploadType: "passportCopy", label: "Passport copy", hint: "Colour scan of the bio page" },
  { key: "has_photos", uploadType: "photo", label: "Personal photo", hint: "35×45 mm, white background" },
  { key: "has_bank_statements", uploadType: "bankStatement", label: "Bank statement", hint: "Last 3–6 months, bank-stamped" },
  { key: "has_employment_proof", uploadType: "nocCertificate", label: "Employment proof", hint: "NOC letter or salary certificate" },
] as const

export type RequiredDocument = (typeof REQUIRED_DOCUMENTS)[number]

export function isPaid(app: ApplicationLike): boolean {
  return app.payment_status === "paid" || app.payment_status === "completed"
}

export function getDocumentProgress(app: ApplicationLike) {
  const received = REQUIRED_DOCUMENTS.filter((doc) => Boolean(app[doc.key]))
  return {
    received: received.length,
    total: REQUIRED_DOCUMENTS.length,
    missing: REQUIRED_DOCUMENTS.filter((doc) => !app[doc.key]),
  }
}

export function getStage(app: ApplicationLike): Stage {
  const status = (app.application_status || "").toLowerCase()
  // Same order as the app's stage(): cancelled is decided before payment_status.
  if (status === "cancelled") return "cancelled"
  if (status === "rejected") return "rejected"
  if (!isPaid(app)) return "payment"
  if (status === "ready") return "ready"
  if (status === "approved") return "preparation"
  if (getDocumentProgress(app).missing.length > 0) return "documents"
  return "review"
}

export function getStepIndex(stage: Stage): number {
  return APPLICATION_STEPS.findIndex((step) => step.key === stage)
}

export type PillTone = "success" | "warning" | "info" | "danger" | "neutral"

export type StatusPill = { label: string; tone: PillTone }

export type NextTaskKind = "continue" | "upload" | "pay" | "finish"

export type NextTask = { label: string; kind: NextTaskKind }

const NARROW_NEXT_LABEL = "Action required"

export function narrowNextLabel(): string {
  return NARROW_NEXT_LABEL
}

function notesObject(app: ApplicationLike): Record<string, unknown> {
  if (!app.additional_notes) return {}
  try {
    const parsed = JSON.parse(app.additional_notes) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export type DetailStep = "trip" | "passport" | "spouse" | "employment"

/**
 * Which post-payment answers are still missing, in the order the continue page asks them (same order as the app's
 * postSteps): trip details (purpose, dates, hotel, budget, itinerary), passport, spouse (only when the spouse
 * travels too), employment.
 */
export function missingDetailSteps(app: ApplicationLike): DetailStep[] {
  const notes = notesObject(app)
  const wizard = (notes.wizard && typeof notes.wizard === "object" ? notes.wizard : notes) as Record<string, unknown>
  const passport = text(app.passport_number) || text(wizard.passportNumber)
  const passportAnswered = text(wizard.hasValidPassport) === "no" || passport.length > 0
  const employment = text(wizard.employmentStatus) || text(notes.employmentStatus)
  const start = text(app.entry_date) || text(app.travel_start_date) || text(wizard.travelStartDate)
  const end = text(app.exit_date) || text(app.travel_end_date) || text(wizard.travelEndDate)
  const purpose = text(app.travel_purpose) || text(wizard.purposeOfTrip)
  // The UAE residence-visa question (asked last on the trip step); rows that answered the older Emirates ID question are done.
  const residenceAnswered = !!text(wizard.residenceVisaValid) || !!text(wizard.hasEmiratesId)
  const tripAnswered = !!purpose && !!start && !!end && !!text(wizard.hotelCategory) && residenceAnswered
  const spouseTravels = text(notes.spouseAccompanying) === "yes" || text(wizard.spouseAccompanying) === "yes"
  const spouseAnswered = !!text(wizard.spouseFirstName) && !!text(wizard.spouseLastName) && !!text(wizard.spouseHasValidPassport)
  const missing: DetailStep[] = []
  if (!tripAnswered) missing.push("trip")
  if (!passportAnswered) missing.push("passport")
  if (spouseTravels && !spouseAnswered) missing.push("spouse")
  if (!employment) missing.push("employment")
  return missing
}

/** Trip, passport, spouse or employment answers still missing after payment. */
export function detailsMissing(app: ApplicationLike): boolean {
  return missingDetailSteps(app).length > 0
}

export function nextTaskHref(app: ApplicationLike, task: NextTask): string {
  if (task.kind === "continue" && app.id) return `/continue/${app.id}`
  if (task.kind === "upload" && app.tracking_token) return `/track/${app.tracking_token}/upload`
  if (task.kind === "pay") return `/dashboard?id=${app.id ?? ""}&pay=1#pay`
  return "/apply"
}

export function docsMissingCount(app: ApplicationLike): number {
  return getDocumentProgress(app).missing.length
}

function taskFor(app: ApplicationLike): NextTask | null {
  if (detailsMissing(app)) return { label: "Continue application", kind: "continue" }
  const missing = docsMissingCount(app)
  if (missing > 0) return { label: "Upload documents", kind: "upload" }
  return null
}

/**
 * Shared status rules (status-mapping.md).
 * Paid + draft/submitted shows a Paid pill. The orange next-step pill is separate.
 * Widths <= 360px replace that next-step label with "Action required" in the UI.
 */
export function getStatusDisplay(app: ApplicationLike): { pill: StatusPill; next: NextTask | null } {
  const status = (app.application_status || "submitted").toLowerCase()
  const payment = (app.payment_status || "").toLowerCase()
  const paid = isPaid(app)
  const task = taskFor(app)

  if (status === "cancelled") return { pill: { label: "Cancelled", tone: "neutral" }, next: null }
  if (status === "rejected") return { pill: { label: "Refused", tone: "danger" }, next: null }
  if (status === "completed") return { pill: { label: "Completed", tone: "success" }, next: null }
  if (status === "approved" || status === "ready") return { pill: { label: "File ready", tone: "success" }, next: null }
  if (status === "appointment_booked") return { pill: { label: "Appointment booked", tone: "info" }, next: null }
  if (status === "awaiting_documents") {
    return { pill: { label: "Documents needed", tone: "warning" }, next: task }
  }
  if (status === "reviewing" || status === "preparation") {
    return { pill: { label: "In review", tone: "warning" }, next: paid ? task : null }
  }
  if (status === "draft" && !paid) {
    return { pill: { label: "Draft", tone: "neutral" }, next: { label: "Finish application", kind: "finish" } }
  }
  if ((status === "draft" || status === "submitted") && paid) {
    return { pill: { label: "Paid", tone: "success" }, next: task }
  }
  if (status === "submitted" && payment === "failed") {
    return { pill: { label: "Payment failed", tone: "danger" }, next: { label: "Pay now", kind: "pay" } }
  }
  if (!paid) {
    return { pill: { label: "Payment due", tone: "warning" }, next: { label: "Pay now", kind: "pay" } }
  }
  return { pill: { label: "In review", tone: "warning" }, next: task }
}

/** Short customer-facing status label, used in badges and the application switcher */
export function getStatusLabel(app: ApplicationLike): { label: string; tone: PillTone } {
  return getStatusDisplay(app).pill
}

export function getReference(token?: string | null): string {
  if (!token) return ""
  // Some tokens already carry an "ez-" prefix; don't print it twice
  return `EZ-${token.replace(/^ez-/i, "").slice(0, 8).toUpperCase()}`
}

export function getFlagSrc(country: string): string {
  return `/flags/${country.toLowerCase().replace(/\s+/g, "-")}.png`
}
