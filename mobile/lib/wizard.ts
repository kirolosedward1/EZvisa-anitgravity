// EZvisa app copy of the website contract (web repo lib/shared/wizard-contract.ts, CONTRACT_VERSION below).
// Everything above the "App only" section is the contract VERBATIM: change it on the website first, copy it here in the
// same change set, and run the website's `pnpm sync:check -- --mobile <this checkout>/mobile`.
/**
 * EZvisa website ↔ mobile app contract.
 *
 * This file is the single source of truth for everything the website (this repo, `main`) and the EZvisa app
 * (`mobile/` on the `mobile-app` branch) must agree on: the wizard's fields, option lists, step order and
 * validation rules, the price rule, the application/payment status vocabulary, the document types and their
 * `has_*` flags, the `additional_notes` JSON shape, the case reference format and the column mapping into
 * `public.visa_applications`.
 *
 * The app keeps its own copy in `mobile/lib/wizard.ts` (and `lib/data.ts`, `lib/payments.ts`, `lib/config.ts`).
 * `pnpm sync:check` (scripts/check-app-sync.mts) compares the two and fails on any drift, and
 * `GET /api/app-config` publishes this contract as JSON so a released app can refresh its lists at runtime.
 *
 * RULES
 *  - No imports. Node runs this file directly (`node scripts/check-app-sync.mts`) and the app bundles a copy of
 *    the same values, so it must stay dependency-free and side-effect-free.
 *  - Change a value here AND in `mobile/lib/wizard.ts` in the same change set, then bump CONTRACT_VERSION.
 *  - Website components must import lists/rules from here, never keep their own copies.
 */

export const CONTRACT_VERSION = "2026-10-24.2"

// ---------------------------------------------------------------------------------------------------------
// Business constants
// ---------------------------------------------------------------------------------------------------------

/** Service fee in AED per traveller. The server (app/api/create-payment, lib/ziina) is the only place that charges it. */
export const PRICE_AED = 249
/** When the spouse travels too, both applications are prepared: the fee doubles. */
export const SPOUSE_MULTIPLIER = 2
export const CURRENCY = "AED"
/** Two applicants when the spouse travels (either answer says so): the same rule the server charges (lib/ziina). */
export const priceAed = (spouseAccompanying?: string | null, travelingWith?: string | null) =>
  PRICE_AED * (spouseAccompanying === "yes" || travelingWith === "spouse" ? SPOUSE_MULTIPLIER : 1)

export const SITE_URL_OFFICIAL = "https://www.ezvisa.net"
/** Deep-link scheme of the app; /app-return only redirects to these schemes (exp/exps = Expo Go). */
export const APP_SCHEMES = ["ezvisa", "exp", "exps"] as const
export const WHATSAPP_NUMBER = "971547109533"
export const SUPPORT_EMAIL = "support@ezvisa.net"

// ---------------------------------------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------------------------------------

export const SCHENGEN = ["Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland"]

/**
 * Nationals who NEED a Schengen short-stay visa: Regulation (EU) 2018/1806, Annex I (1. States + 2. the Palestinian
 * Authority), consolidated version 02018R1806-20251230 (in force 30.12.2025, last amended by Reg. (EU) 2025/2441).
 * Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02018R1806-20251230 (checked 2026-10-19).
 * Annex II (visa-exempt, e.g. UAE, UK, US, Canada, Japan, Australia, Brazil) and EU/EEA/Swiss nationals are absent.
 */
export const SCHENGEN_VISA_REQUIRED: string[] = ["Afghanistan", "Algeria", "Angola", "Armenia", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belize", "Benin", "Bhutan", "Bolivia", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Central African Republic", "Chad", "China", "Comoros", "Congo", "Cuba", "Côte d'Ivoire", "DR Congo", "Djibouti", "Dominican Republic", "Ecuador", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Fiji", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "India", "Indonesia", "Iran", "Iraq", "Jamaica", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Maldives", "Mali", "Mauritania", "Mongolia", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Niger", "Nigeria", "North Korea", "Oman", "Pakistan", "Palestine", "Papua New Guinea", "Philippines", "Qatar", "Russian Federation", "Rwanda", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sri Lanka", "Sudan", "Suriname", "Syria", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Uzbekistan", "Vanuatu", "Vietnam", "Yemen", "Zambia", "Zimbabwe"]
export const needsSchengenVisa = (n?: string | null) => !!n && SCHENGEN_VISA_REQUIRED.includes(n)
export const OTHER_NATIONALITY = "Other nationality"
/** Top UAE resident nationalities (all in Annex I), then "Other nationality" which opens the full visa-required list. */
export const UAE_NATIONALITIES: string[] = ["India", "Pakistan", "Bangladesh", "Philippines", "Egypt", "Nepal", "Sri Lanka", "China", "Jordan", "Lebanon", "Syria", "Palestine", "Sudan", "Iran", "Iraq", "Yemen", "Afghanistan", "Morocco", "Tunisia", "Algeria", "Nigeria", "Kenya", "Ethiopia", "Uganda", "Ghana", "Cameroon", "South Africa", "Indonesia", "Vietnam", "Thailand", "Russian Federation", "Turkey", "Kazakhstan", "Uzbekistan", "Azerbaijan", OTHER_NATIONALITY]
/** The nationalities shown as a short list (no "Other" entry), e.g. on the homepage selector. */
export const FEATURED_NATIONALITIES: string[] = UAE_NATIONALITIES.filter((n) => n !== OTHER_NATIONALITY)
/** The six quick picks of the homepage and header nationality selectors (all need a Schengen visa). */
export const HOMEPAGE_NATIONALITIES: string[] = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria"]

/** Countries of residence offered in the wizard. UAE only for now; add names to re-enable others. */
export const RESIDENCE_COUNTRIES: string[] = ["United Arab Emirates"]
export const DEFAULT_RESIDENCE = RESIDENCE_COUNTRIES[0]
/** City of residence = one of the 7 UAE emirates (stored as the English name). */
export const UAE_EMIRATES: string[] = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"]
export const EMIRATE_OPTIONS = UAE_EMIRATES.map((e) => ({ value: e, label: e }))
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
export const matchEmirate = (v?: string | null) => (v ? UAE_EMIRATES.find((e) => norm(e) === norm(v)) ?? "" : "")
/** Coerce residence fields (old drafts, deep links) to the allowed values. */
export function coerceResidence<T extends { countryOfResidence: string; cityOfResidence: string; hasEmiratesId?: string }>(f: T): T {
  const country = RESIDENCE_COUNTRIES.includes(f.countryOfResidence) ? f.countryOfResidence : DEFAULT_RESIDENCE
  const city = country === "United Arab Emirates" ? matchEmirate(f.cityOfResidence) : f.cityOfResidence
  return { ...f, countryOfResidence: country, cityOfResidence: city, hasEmiratesId: country === "United Arab Emirates" ? f.hasEmiratesId : "" }
}

/** Accept a country by exact name, case-insensitive name or slug (e.g. "egypt", "czech-republic"). */
export function matchCountry(raw: string | undefined | null, list: string[]): string | null {
  if (!raw) return null
  let t = raw
  try { t = decodeURIComponent(raw) } catch { /* keep as is */ }
  t = t.trim().toLowerCase().replace(/[-_+]+/g, " ")
  if (!t) return null
  const alias: Record<string, string> = { russia: "Russian Federation", uae: "United Arab Emirates", czechia: "Czech Republic", ksa: "Saudi Arabia" }
  const hit = list.find((n) => n.toLowerCase() === t) ?? (alias[t] && list.includes(alias[t]) ? alias[t] : undefined)
  return hit ?? null
}
export const countrySlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-")

// ---------------------------------------------------------------------------------------------------------
// Option lists (value = what is stored, label = what both the website and the app show)
// ---------------------------------------------------------------------------------------------------------

export type Opt = { value: string; label: string }
export const MARITAL: Opt[] = [{ value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" }, { value: "widowed", label: "Widowed" }]
export const EMPLOYMENT: Opt[] = [{ value: "employed", label: "Employed" }, { value: "business", label: "Business Owner" }, { value: "freelancer", label: "Freelancer" }, { value: "student", label: "Student" }, { value: "unemployed", label: "Unemployed" }, { value: "retired", label: "Retired" }]
export const SALARY: Opt[] = [{ value: "under-5000", label: "Under 5,000 AED" }, { value: "5000-10000", label: "5,000 - 10,000 AED" }, { value: "10000-15000", label: "10,000 - 15,000 AED" }, { value: "15000-plus", label: "15,000+ AED" }]
export const PURPOSES: Opt[] = [{ value: "tourism", label: "Tourism" }, { value: "business", label: "Business" }, { value: "family", label: "Family Visit" }, { value: "medical", label: "Medical Treatment" }, { value: "education", label: "Education/Training" }, { value: "other", label: "Other" }]
export const COMPANIONS: Opt[] = [{ value: "alone", label: "Traveling Alone" }, { value: "spouse", label: "With Spouse" }, { value: "family", label: "With Family" }, { value: "friends", label: "With Friends" }, { value: "group", label: "With Tour Group" }]
export const FUNDING: Opt[] = [{ value: "self", label: "Self-funded (Personal savings)" }, { value: "sponsor", label: "Sponsored (By family/friend)" }, { value: "company", label: "Sponsored (By employer/company)" }]
export const BALANCE: Opt[] = [{ value: "under-10000", label: "Under 10,000 AED" }, { value: "10000-25000", label: "10,000 - 25,000 AED" }, { value: "25000-50000", label: "25,000 - 50,000 AED" }, { value: "50000-plus", label: "50,000+ AED" }]
export const HOTELS: Opt[] = [{ value: "3-star", label: "3-Star Hotel / Mid-range" }, { value: "4-star", label: "4-Star Hotel / Premium" }, { value: "5-star", label: "5-Star Hotel / Luxury" }, { value: "sponsor", label: "Staying with Host (Sponsor Home)" }]
export const label = (opts: Opt[], v: string) => opts.find((o) => o.value === v)?.label ?? v

// ---------------------------------------------------------------------------------------------------------
// Wizard answers (shared keys) and steps
// ---------------------------------------------------------------------------------------------------------

export type YesNo = "yes" | "no" | ""
/** Wizard steps BEFORE payment, in order, on both platforms (website lib/wizard-steps.ts, app app/apply). */
export type WizardStep = "destination" | "personal" | "payment"
/** "Continue application" steps AFTER payment, in order (website /continue/[id], app app/continue/[id]). */
export type DetailStep = "trip" | "passport" | "spouse" | "employment"
export type MaritalStatus = "" | "single" | "married" | "divorced" | "widowed"
export type EmploymentStatus = "" | "employed" | "business" | "freelancer" | "student" | "unemployed" | "retired"
export type CountryVisit = { country: string; arrivalDate: string; departureDate: string }

/** Every answer the wizard collects, on both platforms, stored verbatim in additional_notes.wizard. */
export type WizardAnswers = {
  // personal
  destination: string; nationality: string; countryOfResidence: string; cityOfResidence: string; hasEmiratesId: YesNo
  firstName: string; lastName: string; email: string; phone: string; phoneCountry: string; phoneLocal: string; whatsappOptIn: boolean
  dateOfBirth: string; passportNumber: string; passportExpiry: string; hasValidPassport: YesNo
  maritalStatus: MaritalStatus; spouseAccompanying: YesNo
  // spouse
  spouseFirstName: string; spouseLastName: string; spouseHasValidPassport: YesNo; spouseOccupation: string
  // employment (asked AFTER payment on both platforms)
  employmentStatus: EmploymentStatus
  jobTitle: string; companyName: string; employmentStartDate: string; monthlySalary: string; hasNOC: YesNo; averageMonthlyIncome: string
  // trip details
  purposeOfTrip: string; travelStartDate: string; travelEndDate: string; datesFlexible: YesNo
  travelingWith: string; hotelCategory: string; fundingSource: string; balanceRange: string
  isFirstSchengenVisa: YesNo; previousRefusals: YesNo; refusalDetails: string
  willVisitOtherCountries: YesNo; additionalCountries: CountryVisit[]; itinerary: string
  // asked with the trip details (after payment): UAE residence visa valid 3+ months after the return date
  residenceVisaValid: YesNo
}

export const emptyAnswers: WizardAnswers = {
  destination: "", nationality: "", countryOfResidence: "United Arab Emirates", cityOfResidence: "", hasEmiratesId: "",
  firstName: "", lastName: "", email: "", phone: "", phoneCountry: "AE", phoneLocal: "", whatsappOptIn: true,
  dateOfBirth: "", passportNumber: "", passportExpiry: "", hasValidPassport: "", maritalStatus: "", spouseAccompanying: "",
  spouseFirstName: "", spouseLastName: "", spouseHasValidPassport: "", spouseOccupation: "",
  employmentStatus: "", jobTitle: "", companyName: "", employmentStartDate: "", monthlySalary: "", hasNOC: "", averageMonthlyIncome: "",
  purposeOfTrip: "", travelStartDate: "", travelEndDate: "", datesFlexible: "", travelingWith: "", hotelCategory: "", fundingSource: "", balanceRange: "",
  isFirstSchengenVisa: "", previousRefusals: "", refusalDetails: "", willVisitOtherCountries: "", additionalCountries: [], itinerary: "",
  residenceVisaValid: "",
}
export const ANSWER_KEYS = Object.keys(emptyAnswers) as (keyof WizardAnswers)[]

export const STEP_TITLES: Record<WizardStep, { title: string; description: string }> = {
  destination: { title: "Destination", description: "Nationality & destination" },
  personal: { title: "Who is travelling?", description: "Traveller details" },
  payment: { title: "Review & Payment", description: "Confirm & complete payment" },
}
export const DETAIL_STEP_TITLES: Record<DetailStep, { title: string; description: string }> = {
  trip: { title: "Trip", description: "Dates, stay and budget" },
  passport: { title: "Passport", description: "Passport details" },
  spouse: { title: "Spouse", description: "Accompanying spouse" },
  employment: { title: "Employment", description: "Work & income details" },
}
export const showSpouse = (f: Pick<WizardAnswers, "maritalStatus" | "spouseAccompanying">) => f.maritalStatus === "married" && f.spouseAccompanying === "yes"
/**
 * Steps asked BEFORE payment: destination (nationality + country) -> traveller -> review & pay. Trip details,
 * passport (only if still missing), spouse (only if travelling) and employment are asked after payment.
 */
export const PRE_PAYMENT_STEPS: WizardStep[] = ["destination", "personal", "payment"]
export const visibleSteps = (_f?: Pick<WizardAnswers, "maritalStatus" | "spouseAccompanying">): WizardStep[] => PRE_PAYMENT_STEPS
/** After-payment steps in the order both platforms ask them. */
export const DETAIL_STEPS: DetailStep[] = ["trip", "passport", "spouse", "employment"]
/**
 * URL step slug -> step (website ?step=, app deep links). "documents" is the old alias for payment; slugs of steps
 * that moved after payment open the step that now holds their first question (website getStepNumber).
 */
export function parseStep(s?: string | null): WizardStep {
  if (s === "payment" || s === "documents") return "payment"
  if (s === "personal" || s === "spouse") return "personal"
  return "destination"
}

// ---------------------------------------------------------------------------------------------------------
// Validation (identical rules on both platforms; error texts are the ones shown to the customer)
// ---------------------------------------------------------------------------------------------------------

export type Errors = Partial<Record<keyof WizardAnswers, string>>

export function isValidEmail(email: string) {
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return false
  const [local, domain] = email.split("@")
  if (!local || local.length < 2 || !domain?.includes(".")) return false
  return !["gmial.com", "yahooo.com", "hotmial.com", "gmai.com"].includes(domain.toLowerCase())
}
export function isValidPhone(phone: string) {
  const d = phone.trim().replace(/[^\d]/g, "")
  if (d.length < 7 || d.length > 15) return false
  if (/^(\d)\1+$/.test(d)) return false
  if (d.length >= 8 && d.split("").every((x, i, a) => i === 0 || Number(x) === Number(a[i - 1]) + 1)) return false
  return true
}
const day = 864e5
const today = () => { const t = new Date(); t.setHours(12, 0, 0, 0); return t }
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
/** Applicants must be 18 or older. */
export const adultMax = () => { const t = today(); t.setFullYear(t.getFullYear() - 18); return t }
/** Departure must be at least 15 days from today (embassy turnaround). */
export const earliestDeparture = () => new Date(today().getTime() + 15 * day)
/** Passport expiry >= return date + 3 months (or today + 3 months while the return date is unknown). */
export function passportCoversTrip(f: { passportExpiry: string; travelEndDate: string }) {
  if (!f.passportExpiry) return true
  const base = f.travelEndDate ? new Date(f.travelEndDate + "T00:00:00") : new Date()
  const need = new Date(base.getFullYear(), base.getMonth() + 3, base.getDate())
  return new Date(f.passportExpiry + "T00:00:00").getTime() >= need.getTime()
}
export const tripDays = (f: Pick<WizardAnswers, "travelStartDate" | "travelEndDate">) =>
  f.travelStartDate && f.travelEndDate ? Math.ceil((Date.parse(f.travelEndDate) - Date.parse(f.travelStartDate)) / day) : 0
export const MAX_STAY_DAYS = 90
export const MIN_LEAD_DAYS = 15

/** Step 1, destination: nationality (a country that needs a Schengen visa) + Schengen destination. */
export function validateDestination(f: WizardAnswers): Errors {
  const e: Errors = {}
  if (!needsSchengenVisa(f.nationality)) e.nationality = "Choose your nationality."
  if (!f.destination) e.destination = "Choose a destination."
  return e
}
/** Step 2, "Who is travelling?": the website's traveller step rules and messages. */
export function validatePersonal(f: WizardAnswers): Errors {
  const e: Errors = {}
  if (!f.firstName.trim()) e.firstName = "Enter your first name."
  if (!f.lastName.trim()) e.lastName = "Enter your last name."
  if (!f.passportNumber.trim()) e.passportNumber = "Enter your passport number."
  if (!f.phoneLocal.trim() && !f.phone.trim()) e.phone = "Enter your phone number."; else if (!isValidPhone(f.phone)) e.phone = "Enter a valid phone number."
  if (!f.email.trim()) e.email = "Enter your email."; else if (!isValidEmail(f.email.trim())) e.email = "Enter a valid email address."
  if (!f.dateOfBirth || f.dateOfBirth < "1900-01-01" || isNaN(Date.parse(f.dateOfBirth))) e.dateOfBirth = "Enter your date of birth."
  else if (Date.parse(f.dateOfBirth) > adultMax().getTime()) e.dateOfBirth = "The main applicant must be 18 or older."
  if (!UAE_EMIRATES.includes(f.cityOfResidence)) e.cityOfResidence = "Choose the emirate you live in."
  if (f.maritalStatus === "married" && !f.spouseAccompanying) e.spouseAccompanying = "Please choose Yes or No"
  return e
}
export function validateSpouse(f: WizardAnswers): Errors {
  const e: Errors = {}
  if (!f.spouseFirstName.trim()) e.spouseFirstName = "First name is required"
  if (!f.spouseLastName.trim()) e.spouseLastName = "Last name is required"
  if (!f.spouseHasValidPassport) e.spouseHasValidPassport = "Please choose Yes or No"
  return e
}
export function validateEmployment(f: WizardAnswers): Errors {
  const e: Errors = {}
  if (!f.employmentStatus) e.employmentStatus = "Please select your employment status"
  if (f.employmentStatus === "employed") {
    if (!f.jobTitle.trim()) e.jobTitle = "Job title is required"
    if (!f.companyName.trim()) e.companyName = "Company name is required"
    if (!f.employmentStartDate) e.employmentStartDate = "Start date is required"
    if (!f.monthlySalary) e.monthlySalary = "Please select a salary range"
  }
  if (f.employmentStatus === "business" || f.employmentStatus === "freelancer") {
    if (!f.companyName.trim()) e.companyName = "Company name is required"
    if (!f.averageMonthlyIncome.trim()) e.averageMonthlyIncome = "Average monthly income is required"
  }
  return e
}
export function validateTrip(f: WizardAnswers): Errors {
  const e: Errors = {}
  if (!f.purposeOfTrip) e.purposeOfTrip = "Please select the purpose of your trip"
  if (!f.travelStartDate) e.travelStartDate = "Please select a departure date"
  else if (Date.parse(f.travelStartDate) < earliestDeparture().getTime() - day / 2) e.travelStartDate = "Departure must be at least 15 days from today"
  if (!f.travelEndDate) e.travelEndDate = "Please select a return date"
  else if (f.travelStartDate && tripDays(f) <= 0) e.travelEndDate = "Return date must be after departure date"
  else if (tripDays(f) > MAX_STAY_DAYS) e.travelEndDate = "Schengen visits are limited to 90 days"
  else if (f.passportExpiry && !passportCoversTrip(f)) e.travelEndDate = "Passport must be valid at least 3 months after your return date"
  if (!f.datesFlexible) e.datesFlexible = "Please choose Yes or No"
  if (!f.travelingWith) e.travelingWith = "Please select who you are traveling with"
  if (!f.hotelCategory) e.hotelCategory = "Please select an accommodation preference"
  if (!f.fundingSource) e.fundingSource = "Please select a funding source"
  if (!f.balanceRange) e.balanceRange = "Please select a balance range"
  if (!f.isFirstSchengenVisa) e.isFirstSchengenVisa = "Please choose Yes or No"
  if (!f.previousRefusals) e.previousRefusals = "Please choose Yes or No"
  if (f.previousRefusals === "yes" && !f.refusalDetails.trim()) e.refusalDetails = "Please add the refusal details"
  // Website rows from before this question answered "Do you have an Emirates ID?" instead: not asked again.
  if (!f.residenceVisaValid && !f.hasEmiratesId) e.residenceVisaValid = "Choose yes or no."
  return e
}
/** Passport, after payment: only for cases that reached payment without a number (older rows, app drafts). */
export function validatePassport(f: Pick<WizardAnswers, "hasValidPassport" | "passportNumber">): Errors {
  if (f.hasValidPassport === "no") return {}
  return (f.passportNumber ?? "").trim() ? {} : { passportNumber: "Enter your passport number." }
}
/** Kept for callers of the previous contract: the passport number rule. */
export const validatePassportNumber = validatePassport
export const validateStep = (s: WizardStep, f: WizardAnswers): Errors =>
  s === "destination" ? validateDestination(f) : s === "personal" ? validatePersonal(f) : {}
export const validateDetailStep = (s: DetailStep, f: WizardAnswers): Errors =>
  s === "trip" ? validateTrip(f) : s === "passport" ? validatePassport(f) : s === "spouse" ? (showSpouse(f) ? validateSpouse(f) : {}) : validateEmployment(f)
/** First pre-payment step that is still incomplete, or null when the customer can pay. */
export const firstIncomplete = (f: WizardAnswers): WizardStep | null => PRE_PAYMENT_STEPS.find((s) => s !== "payment" && Object.keys(validateStep(s, f)).length > 0) ?? null
/** After-payment steps still to answer, in order (both platforms show exactly these). */
export const detailSteps = (f: Partial<WizardAnswers>): DetailStep[] => {
  const full = { ...emptyAnswers, ...f }
  return DETAIL_STEPS.filter((s) => Object.keys(validateDetailStep(s, full)).length > 0)
}
/** Employment answers complete. */
export const employmentComplete = (f: Partial<WizardAnswers>) => Object.keys(validateEmployment({ ...emptyAnswers, ...f })).length === 0
/** Everything asked after payment is answered. */
export const continueComplete = (f: Partial<WizardAnswers>) => detailSteps(f).length === 0

/** Same readiness score the review step shows on both platforms (computed from the answers only). */
export function readiness(f: WizardAnswers) {
  let score = 70
  const checks: { label: string; passed: boolean }[] = []
  if (f.travelStartDate && f.travelEndDate) {
    const start = new Date(f.travelStartDate + "T12:00:00"), end = new Date(f.travelEndDate + "T12:00:00")
    const days = Math.round((end.getTime() - start.getTime()) / day)
    if (days > 0 && days <= MAX_STAY_DAYS) { score += 8; checks.push({ label: `Stay duration (${days} days) within Schengen 90-day legal limit`, passed: true }) }
    else checks.push({ label: "Stay duration exceeds 90 days", passed: false })
    const until = Math.round((start.getTime() - Date.now()) / day)
    if (until >= MIN_LEAD_DAYS) { score += 7; checks.push({ label: `Lead time (${until} days) provides safe consular processing buffer`, passed: true }) }
    else checks.push({ label: `Departure is in ${until} days (embassy turnaround is typically 10-15 days)`, passed: false })
  }
  if (f.passportNumber) { score += 4; checks.push({ label: "Passport bio page / number recorded", passed: true }) }
  else checks.push({ label: "Passport copy can be uploaded securely after checkout", passed: true })
  checks.push({ label: "Bank statements can be uploaded securely after checkout", passed: true })
  if (f.employmentStatus === "business") { score += 4; checks.push({ label: "Employment / business proof categorized", passed: true }) }
  if (showSpouse(f)) { score += 3; checks.push({ label: "Accompanying spouse details integrated into dossier calculation", passed: true }) }
  return { score: Math.min(score, 98), checks }
}

// ---------------------------------------------------------------------------------------------------------
// Statuses (public.visa_applications.application_status / payment_status are plain text columns)
// ---------------------------------------------------------------------------------------------------------

/** draft: unsubmitted, saved for resume (app + website autosave). submitted → reviewing → ready | cancelled by staff. */
export const APPLICATION_STATUSES = ["draft", "submitted", "reviewing", "awaiting_documents", "approved", "ready", "appointment_booked", "completed", "rejected", "cancelled"] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export const PAYMENT_STATUSES = ["pending", "paid", "processing", "completed", "failed", "cancelled", "expired", "refunded", "partially_refunded"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Submitted", reviewing: "In review", awaiting_documents: "Documents needed", approved: "Approved", ready: "File ready", appointment_booked: "Appointment booked", completed: "Completed", rejected: "Refused", cancelled: "Cancelled", pending: "Unpaid", processing: "Processing", paid: "Paid", failed: "Payment failed", expired: "Payment expired", refunded: "Refunded", partially_refunded: "Part refunded", uploaded: "Uploaded", under_review: "Under review", generated: "Prepared by EZvisa", superseded: "Replaced" }
export const isPaid = (a: { payment_status?: string | null }) => a.payment_status === "paid" || a.payment_status === "completed"
/** The case has ended: nothing is open for the customer. */
export const FINISHED_STATUSES = ["completed", "rejected", "cancelled"]
/** Staff moved the file past review: EZvisa's documents are ready. */
export const FILE_READY_STATUSES = ["ready", "approved", "appointment_booked", "completed"]
/** Statuses in which a paid case still takes documents. */
export const UPLOAD_STATUSES = ["draft", "submitted", "reviewing", "awaiting_documents"]
/** Statuses in which the after-payment answers (passport number, employment) can still be added. */
export const CONTINUE_STATUSES = ["submitted", "draft", "reviewing"]
/** Statuses in which an unpaid case can be discarded by the customer (becomes "cancelled"). */
export const DISCARDABLE_STATUSES = ["draft", "submitted"]
/** Case reference shown to customers everywhere (app, website, emails, WhatsApp): EZ- + first 8 hex of the row id. */
export const referenceOf = (id: string) => `EZ-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`

// ---------------------------------------------------------------------------------------------------------
// Documents (bucket visa_documents, path <applicationId>/<documentType>_<uploadId>.<ext>)
// ---------------------------------------------------------------------------------------------------------

export const DOC_BUCKET = "visa_documents"
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const UPLOAD_MIME: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png" }
/** Document types the website upload desk and the app send, and the has_* flag each one sets. */
export const DOC_FLAG: Record<string, "has_passport" | "has_photos" | "has_bank_statements" | "has_employment_proof"> = {
  passportCopy: "has_passport", passportFront: "has_passport", passportBack: "has_passport", residencyCopy: "has_passport",
  photo: "has_photos", personalPhoto: "has_photos", passportPhoto: "has_photos",
  bankStatement: "has_bank_statements", nocCertificate: "has_employment_proof", salaryCertificate: "has_employment_proof",
}
export const isUploadType = (documentType: string) => Object.prototype.hasOwnProperty.call(DOC_FLAG, documentType)
export const DOC_TYPES: Opt[] = [
  { value: "passportCopy", label: "Passport" }, { value: "photo", label: "Photo" }, { value: "residencyCopy", label: "UAE visa & ID" },
  { value: "bankStatement", label: "Bank statement" }, { value: "nocCertificate", label: "NOC / employment" }, { value: "salaryCertificate", label: "Salary certificate" },
]
export type Requirement = { id: string; document_type: string; title: string; description: string | null; is_mandatory: boolean; provided_by_ezvisa: boolean; sort_order: number }
/** The customer's upload checklist (the website has no requirements table). */
export const REQUIREMENTS: Requirement[] = [
  { id: "req-passport", document_type: "passportCopy", title: "Passport bio page", description: "Clear colour copy", is_mandatory: true, provided_by_ezvisa: false, sort_order: 1 },
  { id: "req-residency", document_type: "residencyCopy", title: "UAE residence visa / Emirates ID", description: null, is_mandatory: true, provided_by_ezvisa: false, sort_order: 2 },
  { id: "req-photo", document_type: "photo", title: "Personal photo", description: "White background", is_mandatory: true, provided_by_ezvisa: false, sort_order: 3 },
  { id: "req-bank", document_type: "bankStatement", title: "Bank statement", description: "Last 3-6 months, stamped", is_mandatory: true, provided_by_ezvisa: false, sort_order: 4 },
  { id: "req-noc", document_type: "nocCertificate", title: "NOC / employment proof", description: null, is_mandatory: true, provided_by_ezvisa: false, sort_order: 5 },
  { id: "req-dossier", document_type: "final_package", title: "Cover letter, itinerary & bookings", description: null, is_mandatory: false, provided_by_ezvisa: true, sort_order: 6 },
]
/** NOC applies only to employees (the wizard asks it only for "employed"); self-employed / other statuses never get it. */
export function requirementsFor(employmentStatus?: string | null): Requirement[] {
  return employmentStatus && employmentStatus !== "employed" ? REQUIREMENTS.filter((r) => r.document_type !== "nocCertificate") : REQUIREMENTS
}
/** Which has_* flags a case needs before its documents count as complete (same rule as requirementsFor). */
export function requiredFlags(employmentStatus?: string | null): ("has_passport" | "has_photos" | "has_bank_statements" | "has_employment_proof")[] {
  const flags = new Set(requirementsFor(employmentStatus).filter((r) => !r.provided_by_ezvisa).map((r) => DOC_FLAG[r.document_type]))
  return [...flags]
}

// ---------------------------------------------------------------------------------------------------------
// additional_notes JSON (one text column, written by both platforms) and the row mapping
// ---------------------------------------------------------------------------------------------------------

export type ApplicationNotes = {
  // The website's original keys (staff read these)
  maritalStatus?: string; employmentStatus?: string; jobTitle?: string; companyName?: string; monthlySalary?: string; spouseAccompanying?: string
  /** "website" | "mobile-app": where the case was started (never overwritten). */
  source?: string
  /** "web" | "ios" | "android" */
  platform?: string
  /** Where the draft was last edited: "app" | "website". */
  lastEditedOn?: string
  /** Step slug the wizard was on (resume); the app adds the exact question id. */
  wizardStep?: string; wizardQuestion?: string
  /** The full set of answers (WizardAnswers), for cross-device resume and the after-payment step. */
  wizard?: Partial<WizardAnswers>
  /** Files uploaded through the app or the website, exact type + storage path. */
  uploads?: { type: string; path: string; name: string; at: string }[]
  /** ISO time the case was submitted (drafts are created earlier, so created_at is not it). */
  submittedAt?: string
  /** Set when the signed-in email differs from the contact email typed in the wizard. */
  contactEmail?: string
  /** Set when the customer discarded an unpaid case (status also becomes "cancelled"). */
  discarded_at?: string
  /** public.travellers row the main applicant was filled from ("Who is travelling?" drop-down), if any. */
  travellerId?: string
  /** public.travellers row the spouse was filled from (after-payment spouse step), if any. */
  spouseTravellerId?: string
  itinerary?: unknown
  appointment?: unknown
}
export const parseNotes = (s: string | null | undefined): ApplicationNotes => {
  if (!s) return {}
  try { const j = JSON.parse(s); return j && typeof j === "object" ? j : {} } catch { return {} }
}

type RowLike = { additional_notes?: string | null; passport_number?: string | null; payment_status?: string | null; application_status?: string | null }
/** The answers asked after payment, from a row: the wizard notes, with the passport_number column as fallback (rows from the website, or from before the number moved after payment). */
export function continueAnswers(row: RowLike): Partial<WizardAnswers> {
  const n = parseNotes(row.additional_notes)
  const w = (n.wizard ?? {}) as Partial<WizardAnswers>
  return { ...w, employmentStatus: (w.employmentStatus ?? (n.employmentStatus as EmploymentStatus | undefined)) || "", passportNumber: w.passportNumber || row.passport_number || "" }
}
/** Paid, still open, and the after-payment answers (passport number, employment) are not all there yet. */
export const needsContinue = (row: RowLike) =>
  isPaid(row) && CONTINUE_STATUSES.includes(row.application_status ?? "submitted") && !continueComplete(continueAnswers(row))

const days = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / day)
const t = (s: unknown) => (typeof s === "string" ? s.trim() : "")

/**
 * Column mapping into public.visa_applications, identical on both platforms (app: mobile/lib/data.ts columns()).
 * `prev` are the row's current notes (kept: uploads, app-only keys, source); `step`/`question` record where the
 * wizard was. Passport number and employment stay empty until the after-payment step fills them.
 */
export function applicationColumns(f: Partial<WizardAnswers>, email: string, step: string, prev: ApplicationNotes, opts: { platform: "web" | "ios" | "android"; source: "website" | "mobile-app"; question?: string; userAgent?: string; referrer?: string; extra?: Partial<ApplicationNotes> }) {
  const start = t(f.travelStartDate), end = t(f.travelEndDate)
  // Keep keys only the other platform knows (e.g. the app's split phone fields); if the phone number was retyped on a
  // platform that does not split it, drop the stale split fields.
  const prevWizard = { ...((prev.wizard ?? {}) as Partial<WizardAnswers>) }
  if (t(prevWizard.phone) !== t(f.phone) && !t(f.phoneLocal)) { delete prevWizard.phoneLocal; delete prevWizard.phoneCountry }
  const notes: ApplicationNotes = {
    ...prev,
    maritalStatus: f.maritalStatus ?? "", employmentStatus: f.employmentStatus ?? "", jobTitle: t(f.jobTitle), companyName: t(f.companyName),
    monthlySalary: f.monthlySalary ?? "", spouseAccompanying: f.spouseAccompanying || "no",
    // A draft started elsewhere keeps its source; the step is always overwritten (undefined drops a stale question).
    source: prev.source ?? opts.source, platform: opts.platform, lastEditedOn: opts.source === "mobile-app" ? "app" : "website",
    wizardStep: step, wizardQuestion: opts.question ? opts.question.replace(/^q:/, "") : undefined,
    ...(t(f.email).toLowerCase() && t(f.email).toLowerCase() !== email ? { contactEmail: t(f.email).toLowerCase() } : {}),
    wizard: { ...prevWizard, ...f },
    ...(opts.extra ?? {}),
  }
  return {
    full_name: `${t(f.firstName)} ${t(f.lastName)}`.trim() || "Draft", email, phone: t(f.phone), nationality: t(f.nationality),
    destination_country: t(f.destination), date_of_birth: f.dateOfBirth || null, entry_date: start || null, exit_date: end || null,
    travel_purpose: t(f.purposeOfTrip), passport_number: t(f.passportNumber) || null,
    duration_days: start && end ? days(start, end) : null,
    previous_schengen_visa: f.isFirstSchengenVisa ? f.isFirstSchengenVisa === "no" : false,
    previous_rejections: f.previousRefusals === "yes",
    rejection_details: f.previousRefusals === "yes" ? t(f.refusalDetails) || null : null,
    ...(opts.userAgent ? { user_agent: opts.userAgent } : {}),
    ...(opts.referrer ? { referrer: opts.referrer } : {}),
    additional_notes: JSON.stringify(notes),
  }
}

/**
 * Coerce restored answers (old drafts, deep links, rows written by an older build) to the current rules:
 * residence UAE only, nationality from the visa-required list, no passport details without a valid passport,
 * no NOC answer unless employed.
 */
export function coerceAnswers<T extends Partial<WizardAnswers>>(f: T): T {
  const full = { ...emptyAnswers, ...f }
  const r = coerceResidence(full)
  return {
    ...f,
    countryOfResidence: r.countryOfResidence, cityOfResidence: r.cityOfResidence, hasEmiratesId: (r.hasEmiratesId ?? "") as YesNo,
    nationality: needsSchengenVisa(full.nationality) ? full.nationality : "",
    ...(full.hasValidPassport === "no" ? { passportNumber: "", passportExpiry: "" } : {}),
    ...(full.employmentStatus && full.employmentStatus !== "employed" ? { hasNOC: "" as YesNo } : {}),
  }
}

/** Keeps only the shared answer keys of an arbitrary form object (drops File objects and website-only fields). */
export function pickAnswers(form: Record<string, unknown>): Partial<WizardAnswers> {
  const out: Record<string, unknown> = {}
  for (const k of ANSWER_KEYS) {
    const v = form[k]
    if (v === undefined || v === null || typeof v === "function") continue
    if (typeof v === "object" && !Array.isArray(v)) continue // File or other objects
    out[k] = v
  }
  return out as Partial<WizardAnswers>
}

// ---------------------------------------------------------------------------------------------------------
// Saved travellers (public.travellers, scripts/007_travellers.sql): one row per person a customer applied for.
// Owner = the account email (same rule as visa_applications). Rows are written by the server when a case is paid
// (lib/travellers.ts) and by the app after the after-payment step; both clients read them for the
// "Who is travelling?" drop-down and Account → Saved travellers. Passport numbers live only here, never in auth metadata.
// ---------------------------------------------------------------------------------------------------------

export const TRAVELLERS_TABLE = "travellers"
export const TRAVELLER_RELATIONSHIPS = ["self", "spouse", "other"] as const
export type TravellerRelationship = (typeof TRAVELLER_RELATIONSHIPS)[number]
export const TRAVELLER_SOURCES = ["application", "backfill", "manual"] as const
/** Wizard answers a saved traveller carries. Email is the account's and marital status drives the price: neither is one. */
export const TRAVELLER_KEYS = ["firstName", "lastName", "dateOfBirth", "nationality", "passportNumber", "passportExpiry", "hasValidPassport", "phone", "phoneCountry", "phoneLocal", "cityOfResidence"] as const
export type TravellerKey = (typeof TRAVELLER_KEYS)[number]
export type TravellerDetails = Partial<Pick<WizardAnswers, TravellerKey>>
export type Traveller = TravellerDetails & { id: string; relationship: TravellerRelationship; lastUsedAt?: string | null }

const tstr = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const tday = (v: unknown) => { const x = tstr(v).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(Date.parse(x)) ? x : "" }
/** Passport numbers compare upper-case, letters and digits only ("n 123-4567" = "N1234567"). */
export const normalizePassport = (v?: string | null) => tstr(v).toUpperCase().replace(/[^A-Z0-9]/g, "")
/** "••••4567": the last 4 characters of a passport number, for lists and the drop-down. */
export const maskPassport = (v?: string | null) => { const p = normalizePassport(v); return p ? `••••${p.slice(-4)}` : "" }
const nameKey = (t: { firstName?: string; lastName?: string; dateOfBirth?: string }) =>
  `n:${tstr(t.lastName).toLowerCase().replace(/\s+/g, " ")}|${tstr(t.firstName).toLowerCase().replace(/\s+/g, " ")}|${tday(t.dateOfBirth)}`
/** Dedupe key of a traveller: the passport number when known, else last name | first name | date of birth. */
export const travellerKey = (t: { firstName?: string; lastName?: string; dateOfBirth?: string; passportNumber?: string }) => {
  const p = normalizePassport(t.passportNumber)
  return p ? `p:${p}` : nameKey(t)
}
/** Every key a row for this person may have been saved under (passport key first): a spouse saved by name only is
 *  found again when their own application later brings the passport number. */
export const travellerKeys = (t: { firstName?: string; lastName?: string; dateOfBirth?: string; passportNumber?: string }) =>
  [...new Set([travellerKey(t), nameKey(t), nameKey({ ...t, dateOfBirth: "" })])]
export const travellerName = (t: { firstName?: string; lastName?: string }) => `${tstr(t.firstName)} ${tstr(t.lastName)}`.trim()
/** "Kirolos Edward · ••••4567" (nationality and flag are shown by the UI, translated). */
export const travellerLabel = (t: { firstName?: string; lastName?: string; passportNumber?: string }) =>
  [travellerName(t), maskPassport(t.passportNumber)].filter(Boolean).join(" · ")

/** The main applicant described by a set of answers, or null without a name. Nationality only when visa-required. */
export function travellerFromAnswers(f: Partial<WizardAnswers>): TravellerDetails | null {
  const firstName = tstr(f.firstName), lastName = tstr(f.lastName)
  if (!firstName || !lastName) return null
  const passportNumber = normalizePassport(f.passportNumber)
  const t: TravellerDetails = { firstName, lastName }
  const dateOfBirth = tday(f.dateOfBirth); if (dateOfBirth) t.dateOfBirth = dateOfBirth
  if (needsSchengenVisa(tstr(f.nationality))) t.nationality = tstr(f.nationality)
  if (passportNumber) t.passportNumber = passportNumber
  const passportExpiry = tday(f.passportExpiry); if (passportExpiry) t.passportExpiry = passportExpiry
  if (f.hasValidPassport === "yes" || f.hasValidPassport === "no") t.hasValidPassport = f.hasValidPassport
  else if (passportNumber) t.hasValidPassport = "yes"
  if (tstr(f.phone)) { t.phone = tstr(f.phone); if (tstr(f.phoneCountry)) t.phoneCountry = tstr(f.phoneCountry); if (tstr(f.phoneLocal)) t.phoneLocal = tstr(f.phoneLocal) }
  if (UAE_EMIRATES.includes(tstr(f.cityOfResidence))) t.cityOfResidence = tstr(f.cityOfResidence)
  return t
}
/** The spouse described by a set of answers (name + passport validity only), or null without a name. */
export function spouseFromAnswers(f: Partial<WizardAnswers>): TravellerDetails | null {
  const firstName = tstr(f.spouseFirstName), lastName = tstr(f.spouseLastName)
  if (!firstName || !lastName) return null
  const t: TravellerDetails = { firstName, lastName }
  if (f.spouseHasValidPassport === "yes" || f.spouseHasValidPassport === "no") t.hasValidPassport = f.spouseHasValidPassport
  return t
}
/** Fills the traveller fields from a saved traveller. Every field stays editable afterwards. A nationality that is
 *  not visa-required is skipped; an expired passport is applied and left to validation. */
export function applyTraveller<T extends Partial<WizardAnswers>>(f: T, t: TravellerDetails): T {
  const out: Record<string, unknown> = { ...f }
  for (const k of TRAVELLER_KEYS) {
    const v = t[k]
    if (v === undefined || v === null || v === "") continue
    if (k === "nationality" && !needsSchengenVisa(v as string)) continue
    out[k] = v
  }
  // The saved phone replaces the typed one entirely: stale split fields would otherwise rebuild the old number.
  if (tstr(t.phone) && !tstr(t.phoneLocal)) { out.phoneLocal = ""; out.phoneCountry = tstr(t.phoneCountry) || (f.phoneCountry ?? "AE") }
  if (normalizePassport(t.passportNumber) || tday(t.passportExpiry)) out.hasValidPassport = "yes"
  return out as T
}
/** Fills the spouse fields from a saved traveller. */
export function applySpouseTraveller<T extends Partial<WizardAnswers>>(f: T, t: TravellerDetails): T {
  return { ...f, spouseFirstName: tstr(t.firstName), spouseLastName: tstr(t.lastName), ...(t.hasValidPassport ? { spouseHasValidPassport: t.hasValidPassport } : {}) }
}
/** Pick the traveller to preselect on a fresh form: the one marked "self", else the most recently used, else the first. */
export function defaultTraveller<T extends Traveller>(list: T[]): T | null {
  if (!list.length) return null
  return list.find((t) => t.relationship === "self") ?? [...list].sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))[0] ?? null
}

/** public.travellers row -> Traveller (both clients read rows the same way). */
export function travellerFromRow(row: Record<string, unknown>): Traveller {
  const r = (k: string) => tstr(row[k])
  const t: Traveller = { id: r("id"), relationship: (TRAVELLER_RELATIONSHIPS as readonly string[]).includes(r("relationship")) ? (r("relationship") as TravellerRelationship) : "other", lastUsedAt: r("last_used_at") || null }
  if (r("first_name")) t.firstName = r("first_name")
  if (r("last_name")) t.lastName = r("last_name")
  if (tday(row.date_of_birth)) t.dateOfBirth = tday(row.date_of_birth)
  if (r("nationality")) t.nationality = r("nationality")
  if (normalizePassport(r("passport_number"))) { t.passportNumber = normalizePassport(r("passport_number")); t.hasValidPassport = "yes" }
  if (tday(row.passport_expiry)) t.passportExpiry = tday(row.passport_expiry)
  if (r("phone")) { t.phone = r("phone"); if (r("phone_country")) t.phoneCountry = r("phone_country") }
  if (r("city_of_residence")) t.cityOfResidence = r("city_of_residence")
  return t
}
/** Traveller -> public.travellers columns (id, timestamps and source are set by the caller / the database). */
export function travellerToRow(t: TravellerDetails, email: string, relationship: TravellerRelationship) {
  return {
    email: tstr(email).toLowerCase(), relationship,
    first_name: tstr(t.firstName), last_name: tstr(t.lastName),
    date_of_birth: tday(t.dateOfBirth) || null, nationality: needsSchengenVisa(tstr(t.nationality)) ? tstr(t.nationality) : null,
    passport_number: normalizePassport(t.passportNumber) || null, passport_expiry: tday(t.passportExpiry) || null,
    phone: tstr(t.phone) || null, phone_country: tstr(t.phoneCountry) || null,
    city_of_residence: UAE_EMIRATES.includes(tstr(t.cityOfResidence)) ? tstr(t.cityOfResidence) : null,
    dedupe_key: travellerKey(t),
  }
}

/** The JSON published at GET /api/app-config (what a released app may refresh at runtime). */
export function contractJson() {
  return {
    version: CONTRACT_VERSION,
    travellers: { table: TRAVELLERS_TABLE, keys: TRAVELLER_KEYS, relationships: TRAVELLER_RELATIONSHIPS, sources: TRAVELLER_SOURCES },
    price: { aed: PRICE_AED, spouseMultiplier: SPOUSE_MULTIPLIER, currency: CURRENCY },
    siteUrl: SITE_URL_OFFICIAL, appSchemes: APP_SCHEMES, whatsapp: WHATSAPP_NUMBER, supportEmail: SUPPORT_EMAIL,
    countries: { schengen: SCHENGEN, visaRequired: SCHENGEN_VISA_REQUIRED, uaeNationalities: UAE_NATIONALITIES, otherNationality: OTHER_NATIONALITY, residence: RESIDENCE_COUNTRIES, emirates: UAE_EMIRATES },
    options: { marital: MARITAL, employment: EMPLOYMENT, salary: SALARY, purposes: PURPOSES, companions: COMPANIONS, funding: FUNDING, balance: BALANCE, hotels: HOTELS },
    wizard: { steps: STEP_TITLES, detailSteps: DETAIL_STEP_TITLES, prePaymentSteps: PRE_PAYMENT_STEPS, withSpouse: PRE_PAYMENT_STEPS, afterPayment: DETAIL_STEPS, answerKeys: ANSWER_KEYS, maxStayDays: MAX_STAY_DAYS, minLeadDays: MIN_LEAD_DAYS },
    statuses: { application: APPLICATION_STATUSES, payment: PAYMENT_STATUSES, labels: STATUS_LABEL, finished: FINISHED_STATUSES, fileReady: FILE_READY_STATUSES, upload: UPLOAD_STATUSES, continue: CONTINUE_STATUSES, discardable: DISCARDABLE_STATUSES },
    documents: { bucket: DOC_BUCKET, maxBytes: MAX_UPLOAD_BYTES, mime: UPLOAD_MIME, flags: DOC_FLAG, types: DOC_TYPES, requirements: REQUIREMENTS },
  }
}


// ---------------------------------------------------------------------------------------------------------
// App only (names the app's screens use; no rules here)
// ---------------------------------------------------------------------------------------------------------

export type WizardForm = WizardAnswers
export const emptyForm: WizardForm = emptyAnswers
/** Quick picks shown first in the nationality list. */
export const NATIONALITIES = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria", "United Arab Emirates", "Saudi Arabia", "Philippines", "Bangladesh"];
export const RESIDENCES = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Egypt", "Jordan"];
export const realDate = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return false; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]; };
export function safeDecode(s: string): string { try { return decodeURIComponent(s); } catch { return s; } }
/** True when the form holds any answer besides the email (a draft worth keeping). */
export const hasAnswers = (f: WizardForm) => (Object.keys(emptyForm) as (keyof WizardForm)[]).some((k) => k !== "email" && JSON.stringify(f[k]) !== JSON.stringify(emptyForm[k]))
