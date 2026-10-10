/**
 * Visa application wizard: single source of truth shared by the Next.js API
 * (app/api/mobile/v1/*) and the Expo iOS app (mobile/, imported via @shared/*).
 *
 * Keep this file dependency-free (no imports) so both runtimes can bundle it.
 * Option values mirror the web wizard in components/apply/*.
 */

export type YesNo = "yes" | "no"

export interface WizardData {
  // Personal
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  countryOfResidence: string
  cityOfResidence: string
  hasEmiratesId: YesNo | ""
  dateOfBirth: string
  passportNumber: string
  hasValidPassport: YesNo | ""
  maritalStatus: "single" | "married" | "divorced" | "widowed" | ""
  spouseAccompanying: YesNo | ""
  // Spouse
  spouseFirstName: string
  spouseLastName: string
  spouseHasValidPassport: YesNo | ""
  spouseOccupation: string
  // Employment
  employmentStatus: "employed" | "business" | "freelancer" | "student" | "unemployed" | "retired" | ""
  jobTitle: string
  companyName: string
  employmentStartDate: string
  monthlySalary: string
  hasNOC: YesNo | ""
  industry: string
  yearsOfExperience: string
  averageMonthlyIncome: string
  // Trip
  destination: string
  purposeOfTrip: string
  travelStartDate: string
  travelEndDate: string
  travelingWith: string
  hotelCategory: string
  fundingSource: string
  balanceRange: string
  isFirstSchengenVisa: YesNo | ""
  previousRefusals: YesNo | ""
  refusalDetails: string
  itinerary: string
  // Review
  declarationAccepted: boolean
}

export const EMPTY_WIZARD_DATA: WizardData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  nationality: "",
  countryOfResidence: "United Arab Emirates",
  cityOfResidence: "",
  hasEmiratesId: "",
  dateOfBirth: "",
  passportNumber: "",
  hasValidPassport: "",
  maritalStatus: "",
  spouseAccompanying: "",
  spouseFirstName: "",
  spouseLastName: "",
  spouseHasValidPassport: "",
  spouseOccupation: "",
  employmentStatus: "",
  jobTitle: "",
  companyName: "",
  employmentStartDate: "",
  monthlySalary: "",
  hasNOC: "",
  industry: "",
  yearsOfExperience: "",
  averageMonthlyIncome: "",
  destination: "",
  purposeOfTrip: "",
  travelStartDate: "",
  travelEndDate: "",
  travelingWith: "",
  hotelCategory: "",
  fundingSource: "",
  balanceRange: "",
  isFirstSchengenVisa: "",
  previousRefusals: "",
  refusalDetails: "",
  itinerary: "",
  declarationAccepted: false,
}

export interface Option {
  value: string
  label: string
}

export const YES_NO: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

export const MARITAL_STATUSES: Option[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
]

export const EMPLOYMENT_STATUSES: Option[] = [
  { value: "employed", label: "Employed" },
  { value: "business", label: "Business Owner" },
  { value: "freelancer", label: "Freelancer" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
]

export const SALARY_RANGES: Option[] = [
  { value: "under-5000", label: "Under 5,000 AED" },
  { value: "5000-10000", label: "5,000 - 10,000 AED" },
  { value: "10000-15000", label: "10,000 - 15,000 AED" },
  { value: "15000-plus", label: "15,000+ AED" },
]

export const TRIP_PURPOSES: Option[] = [
  { value: "tourism", label: "Tourism" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family Visit" },
  { value: "medical", label: "Medical Treatment" },
  { value: "education", label: "Education/Training" },
  { value: "other", label: "Other" },
]

export const COMPANION_OPTIONS: Option[] = [
  { value: "alone", label: "Traveling Alone" },
  { value: "spouse", label: "With Spouse" },
  { value: "family", label: "With Family" },
  { value: "friends", label: "With Friends" },
  { value: "group", label: "With Tour Group" },
]

export const HOTEL_OPTIONS: Option[] = [
  { value: "3-star", label: "3-Star Hotel / Mid-range" },
  { value: "4-star", label: "4-Star Hotel / Premium" },
  { value: "5-star", label: "5-Star Hotel / Luxury" },
  { value: "sponsor", label: "Staying with Host (Sponsor Home)" },
]

export const FUNDING_OPTIONS: Option[] = [
  { value: "self", label: "Self-funded (Personal savings)" },
  { value: "sponsor", label: "Sponsored (By family/friend)" },
  { value: "company", label: "Sponsored (By employer/company)" },
]

export const BALANCE_OPTIONS: Option[] = [
  { value: "under-10000", label: "Under 10,000 AED" },
  { value: "10000-25000", label: "10,000 - 25,000 AED" },
  { value: "25000-50000", label: "25,000 - 50,000 AED" },
  { value: "50000-plus", label: "50,000+ AED" },
]

export const SCHENGEN_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark", "Estonia", "Finland",
  "France", "Germany", "Greece", "Hungary", "Iceland", "Italy", "Latvia", "Liechtenstein",
  "Lithuania", "Luxembourg", "Malta", "Netherlands", "Norway", "Poland", "Portugal", "Romania",
  "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
] as const

export const UAE_EMIRATES = [
  "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain",
] as const

export const COMMON_NATIONALITIES = [
  "India", "Pakistan", "Egypt", "Philippines", "Bangladesh", "Jordan", "Lebanon", "Syria",
  "Sri Lanka", "Nepal", "Nigeria", "Kenya", "Iran", "Iraq", "Sudan", "Morocco", "Tunisia",
  "Palestine", "Yemen", "China", "Russia", "Ukraine", "Kazakhstan", "Uzbekistan", "South Africa",
  "Indonesia", "Vietnam", "Ethiopia", "Ghana", "Turkey", "Other",
] as const

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type StepId = "personal" | "spouse" | "employment" | "trip" | "review"

export interface StepDef {
  id: StepId
  number: number // matches web STEP_TO_NUMBER (lib/wizard-steps.ts)
  title: string
  subtitle: string
}

const ALL_STEPS: StepDef[] = [
  { id: "personal", number: 1, title: "Personal information", subtitle: "Profile & contact details" },
  { id: "spouse", number: 2, title: "Spouse information", subtitle: "Accompanying spouse" },
  { id: "employment", number: 3, title: "Employment", subtitle: "Work & income details" },
  { id: "trip", number: 4, title: "Trip details", subtitle: "Travel plans & finances" },
  { id: "review", number: 5, title: "Review & pay", subtitle: "Confirm and complete payment" },
]

export function hasSpouseStep(data: Pick<WizardData, "maritalStatus" | "spouseAccompanying">): boolean {
  return data.maritalStatus === "married" && data.spouseAccompanying === "yes"
}

export function getSteps(data: WizardData): StepDef[] {
  return ALL_STEPS.filter((s) => s.id !== "spouse" || hasSpouseStep(data))
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type FieldErrors = Partial<Record<keyof WizardData, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PASSPORT_RE = /^[A-Za-z0-9]{6,12}$/

function parseDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function tripDurationDays(start: string, end: string): number | null {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s || !e) return null
  return Math.round((e.getTime() - s.getTime()) / 86_400_000)
}

function required(errors: FieldErrors, data: WizardData, key: keyof WizardData, label: string) {
  const v = data[key]
  if (typeof v === "string" && v.trim() === "") errors[key] = `${label} is required`
}

export function validateStep(step: StepId, data: WizardData, now: Date = new Date()): FieldErrors {
  const e: FieldErrors = {}
  switch (step) {
    case "personal": {
      required(e, data, "firstName", "First name")
      required(e, data, "lastName", "Last name")
      required(e, data, "email", "Email")
      required(e, data, "phone", "Phone")
      required(e, data, "nationality", "Nationality")
      required(e, data, "cityOfResidence", "Emirate")
      required(e, data, "dateOfBirth", "Date of birth")
      required(e, data, "maritalStatus", "Marital status")
      required(e, data, "hasValidPassport", "Passport validity")
      if (data.email && !EMAIL_RE.test(data.email.trim())) e.email = "Enter a valid email address"
      if (data.phone && data.phone.replace(/\D/g, "").length < 8) e.phone = "Enter a valid phone number"
      if (data.passportNumber && !PASSPORT_RE.test(data.passportNumber.trim()))
        e.passportNumber = "Passport number should be 6–12 letters or digits"
      if (data.dateOfBirth) {
        const dob = parseDate(data.dateOfBirth)
        if (!dob) e.dateOfBirth = "Enter a valid date"
        else if (dob >= now) e.dateOfBirth = "Date of birth must be in the past"
      }
      if (data.maritalStatus === "married") required(e, data, "spouseAccompanying", "Spouse travelling")
      break
    }
    case "spouse": {
      if (!hasSpouseStep(data)) break
      required(e, data, "spouseFirstName", "Spouse first name")
      required(e, data, "spouseLastName", "Spouse last name")
      required(e, data, "spouseHasValidPassport", "Spouse passport validity")
      break
    }
    case "employment": {
      required(e, data, "employmentStatus", "Employment status")
      if (data.employmentStatus === "employed") {
        required(e, data, "jobTitle", "Job title")
        required(e, data, "companyName", "Company name")
        required(e, data, "monthlySalary", "Monthly salary")
      }
      if (data.employmentStatus === "business" || data.employmentStatus === "freelancer") {
        required(e, data, "industry", "Industry")
        required(e, data, "averageMonthlyIncome", "Average monthly income")
      }
      break
    }
    case "trip": {
      required(e, data, "destination", "Destination")
      required(e, data, "purposeOfTrip", "Purpose of trip")
      required(e, data, "travelStartDate", "Departure date")
      required(e, data, "travelEndDate", "Return date")
      required(e, data, "travelingWith", "Travel companions")
      required(e, data, "hotelCategory", "Accommodation")
      required(e, data, "fundingSource", "Funding source")
      required(e, data, "balanceRange", "Bank balance")
      required(e, data, "isFirstSchengenVisa", "First Schengen visa")
      required(e, data, "previousRefusals", "Previous refusals")
      if (data.destination && !(SCHENGEN_COUNTRIES as readonly string[]).includes(data.destination))
        e.destination = "Choose a Schengen country"
      if (data.previousRefusals === "yes") required(e, data, "refusalDetails", "Refusal details")
      if (data.travelStartDate && data.travelEndDate) {
        const days = tripDurationDays(data.travelStartDate, data.travelEndDate)
        const start = parseDate(data.travelStartDate)
        if (days === null || !start) e.travelEndDate = "Enter valid dates"
        else if (days <= 0) e.travelEndDate = "Return date must be after departure date"
        else if (days > 90) e.travelEndDate = "Stay cannot exceed 90 days"
        else if (data.travelStartDate < todayISO(now)) e.travelStartDate = "Departure date must be in the future"
      }
      break
    }
    case "review": {
      if (!data.declarationAccepted) e.declarationAccepted = "Please confirm the declaration"
      break
    }
  }
  return e
}

/** Validates every visible step. Returns the first failing step (if any) and all errors. */
export function validateAll(data: WizardData, now: Date = new Date()): { step: StepId | null; errors: FieldErrors } {
  let firstStep: StepId | null = null
  const errors: FieldErrors = {}
  for (const s of getSteps(data)) {
    const stepErrors = validateStep(s.id, data, now)
    if (Object.keys(stepErrors).length && !firstStep) firstStep = s.id
    Object.assign(errors, stepErrors)
  }
  return { step: firstStep, errors }
}

/** Accepts unknown JSON (from a client or old draft) and returns a well-typed WizardData. */
export function normalizeWizardData(input: unknown): WizardData {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const out: WizardData = { ...EMPTY_WIZARD_DATA }
  for (const key of Object.keys(EMPTY_WIZARD_DATA) as (keyof WizardData)[]) {
    const v = src[key]
    if (key === "declarationAccepted") out.declarationAccepted = v === true
    else if (typeof v === "string") (out[key] as string) = v.slice(0, 2000)
  }
  return out
}

// ---------------------------------------------------------------------------
// Pricing (server is authoritative; the app only displays this)
// ---------------------------------------------------------------------------

export const BASE_PRICE_AED = 249

export function priceAED(data: Pick<WizardData, "maritalStatus" | "spouseAccompanying">): number {
  return BASE_PRICE_AED * (hasSpouseStep(data) ? 2 : 1)
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Document types match app/api/upload-document (so admin tooling sees the same names). */
export type DocumentType =
  | "passportFront"
  | "passportBack"
  | "photo"
  | "residencyCopy"
  | "bankStatement"
  | "salaryCertificate"
  | "nocCertificate"
  | "spousePassportFront"
  | "spousePhoto"

export interface DocumentRequirement {
  type: DocumentType
  label: string
  hint: string
  required: boolean
}

export function documentRequirements(
  data: Pick<WizardData, "employmentStatus" | "maritalStatus" | "spouseAccompanying">,
): DocumentRequirement[] {
  const docs: DocumentRequirement[] = [
    { type: "passportFront", label: "Passport (photo page)", hint: "Clear scan of the bio-data page", required: true },
    { type: "passportBack", label: "Passport (back page)", hint: "Last page with address details", required: false },
    { type: "photo", label: "Passport photo", hint: "35×45 mm, white background", required: true },
    { type: "residencyCopy", label: "UAE residence visa / Emirates ID", hint: "Front and back", required: true },
    { type: "bankStatement", label: "Bank statement", hint: "Last 3–6 months, stamped", required: true },
  ]
  if (data.employmentStatus === "employed") {
    docs.push(
      { type: "salaryCertificate", label: "Salary certificate", hint: "Issued within the last month", required: true },
      { type: "nocCertificate", label: "No-objection certificate (NOC)", hint: "From your employer", required: true },
    )
  }
  if (hasSpouseStep(data)) {
    docs.push(
      { type: "spousePassportFront", label: "Spouse passport", hint: "Photo page", required: true },
      { type: "spousePhoto", label: "Spouse passport photo", hint: "35×45 mm, white background", required: true },
    )
  }
  return docs
}

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  "passportFront", "passportBack", "photo", "residencyCopy", "bankStatement",
  "salaryCertificate", "nocCertificate", "spousePassportFront", "spousePhoto",
]

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type ApplicationStatus = "draft" | "submitted" | "reviewing" | "approved" | "ready" | "rejected"
export type PaymentStatus =
  | "pending" | "paid" | "processing" | "completed" | "failed" | "cancelled" | "expired" | "refunded" | "partially_refunded"

export function isPaid(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "paid" || paymentStatus === "completed"
}

/** The customer-facing stage, combining application + payment status. */
export type Stage = "draft" | "awaiting_payment" | "in_review" | "ready" | "approved" | "rejected"

export function stageOf(applicationStatus: string | null | undefined, paymentStatus: string | null | undefined): Stage {
  if (applicationStatus === "draft") return "draft"
  if (applicationStatus === "rejected") return "rejected"
  if (applicationStatus === "approved") return "approved"
  if (applicationStatus === "ready") return "ready"
  if (!isPaid(paymentStatus)) return "awaiting_payment"
  return "in_review"
}

export const STAGE_LABELS: Record<Stage, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  in_review: "Experts preparing your file",
  ready: "Documents ready",
  approved: "Visa approved",
  rejected: "Visa refused",
}
