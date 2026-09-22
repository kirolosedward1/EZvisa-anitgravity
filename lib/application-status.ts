/**
 * Single source of truth for how a visa application's database state maps to
 * what the customer sees on /dashboard and /track/[token].
 */

export type ApplicationLike = {
  payment_status?: string | null
  application_status?: string | null
  has_passport?: boolean | null
  has_photos?: boolean | null
  has_bank_statements?: boolean | null
  has_employment_proof?: boolean | null
}

export type StepKey = "payment" | "documents" | "review" | "preparation" | "ready"

export type Stage = StepKey | "rejected"

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
  const status = app.application_status
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

/** Short customer-facing status label, used in badges and the application switcher */
export function getStatusLabel(app: ApplicationLike): { label: string; tone: "success" | "warning" | "info" | "danger" } {
  switch (getStage(app)) {
    case "payment":
      return { label: "Payment pending", tone: "warning" }
    case "documents":
      return { label: "Documents needed", tone: "warning" }
    case "review":
      return { label: "In review", tone: "info" }
    case "preparation":
      return { label: "Preparing file", tone: "info" }
    case "ready":
      return { label: "Ready", tone: "success" }
    case "rejected":
      return { label: "Needs attention", tone: "danger" }
  }
}

export function getReference(token?: string | null): string {
  if (!token) return ""
  // Some tokens already carry an "ez-" prefix; don't print it twice
  return `EZ-${token.replace(/^ez-/i, "").slice(0, 8).toUpperCase()}`
}

export function getFlagSrc(country: string): string {
  return `/flags/${country.toLowerCase().replace(/\s+/g, "-")}.png`
}
