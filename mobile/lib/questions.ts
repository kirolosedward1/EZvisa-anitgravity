// One question per screen, built ONLY from the website wizard (lib/wizard.ts mirrors web lib/wizard-steps.ts +
// components/apply/*): the same fields, labels, options, order and validation. Each question owns one or more form keys;
// its errors are exactly validateStep(step) filtered to those keys, so the rules can never drift from the web.
import { WORLD } from "./world";
import {
  SCHENGEN, UAE_NATIONALITIES, RESIDENCE_COUNTRIES, EMIRATE_OPTIONS, SCHENGEN_VISA_REQUIRED, MARITAL, EMPLOYMENT, SALARY, PURPOSES, COMPANIONS, HOTELS, FUNDING, BALANCE,
  visibleSteps, validateStep, adultMax, earliestDeparture, iso, label as optLabel, type WizardForm, type WizardStep, type Errors,
} from "./wizard";

export type Opt = { value: string; label: string };
export type QKind = "country" | "choice" | "yesno" | "text" | "date" | "phone" | "textarea" | "countries";
export type Question = {
  id: string; step: Exclude<WizardStep, "payment">; keys: (keyof WizardForm)[];
  /** The website's field label (without the trailing " *"). */
  label: string; required: boolean; kind: QKind;
  placeholder?: string; searchPlaceholder?: string; options?: Opt[]; names?: string[]; allNames?: string[];
  /** Short friendly line under the title (also from the website's notes where there is one). */
  hint?: string;
  /** Country whose flag is shown on the title and answer rows (instead of the destination flag). */
  flag?: string;
  applies?: (f: WizardForm) => boolean;
  /** Extra changes the website makes when this answer changes (e.g. clearing dependent fields). */
  onPick?: (v: string, f: WizardForm) => Partial<WizardForm>;
  min?: (f: WizardForm) => string | undefined; max?: (f: WizardForm) => string | undefined;
  dateStyle?: "calendar" | "wheel";
  /** Where an empty wheel starts (e.g. 1990 for date of birth). */
  defaultDate?: (f: WizardForm) => string;
  text?: { keyboard?: "default" | "email-address"; caps?: "none" | "words" | "characters" | "sentences"; contentType?: string; autoComplete?: string; upper?: boolean };
  /** Note after an answer; amber/red notes stop auto-advance so the user can read them. */
  note?: (f: WizardForm) => { tone: "green" | "amber" | "blue" | "red"; text: string } | null;
};

const WORLD_NAMES = WORLD.map((w) => w.name);
const todayIso = () => iso(new Date());
export const BIZ = (f: WizardForm) => f.employmentStatus === "business" || f.employmentStatus === "freelancer";
const EMP = (f: WizardForm) => f.employmentStatus === "employed";

export const QUESTIONS: Question[] = [
  // ---- Personal Information (nationality-step.tsx) ----
  { id: "destination", step: "personal", keys: ["destination"], label: "Destination Country (Schengen)", required: true, kind: "country", names: SCHENGEN, searchPlaceholder: "Search country..." },
  { id: "nationality", step: "personal", keys: ["nationality"], label: "Nationality", required: true, kind: "country", names: UAE_NATIONALITIES, searchPlaceholder: "Search nationality...",
    allNames: SCHENGEN_VISA_REQUIRED },
  { id: "countryOfResidence", step: "personal", keys: ["countryOfResidence"], label: "Country of Residence", required: true, kind: "country", names: RESIDENCE_COUNTRIES, searchPlaceholder: "Search country...", flag: "United Arab Emirates",
    onPick: (v) => (v !== "United Arab Emirates" ? { hasEmiratesId: "" } : {}) },
  { id: "cityOfResidence", step: "personal", keys: ["cityOfResidence"], label: "City of Residence", required: true, kind: "choice", options: EMIRATE_OPTIONS },
  { id: "hasEmiratesId", step: "personal", keys: ["hasEmiratesId"], label: "Do you have an Emirates ID?", required: true, kind: "yesno", applies: (f) => f.countryOfResidence === "United Arab Emirates" },
  { id: "firstName", step: "personal", keys: ["firstName"], label: "First Name", required: true, kind: "text", placeholder: "Enter first name", hint: "As on your passport.", text: { caps: "words", contentType: "givenName", autoComplete: "given-name" } },
  { id: "lastName", step: "personal", keys: ["lastName"], label: "Last Name", required: true, kind: "text", placeholder: "Enter last name", hint: "As on your passport.", text: { caps: "words", contentType: "familyName", autoComplete: "family-name" } },
  { id: "email", step: "personal", keys: ["email"], label: "Email Address", required: true, kind: "text", placeholder: "your.email@example.com", text: { keyboard: "email-address", caps: "none", contentType: "emailAddress", autoComplete: "email" } },
  { id: "phone", step: "personal", keys: ["phone", "phoneLocal", "phoneCountry", "whatsappOptIn"], label: "Phone Number", required: true, kind: "phone" },
  { id: "dateOfBirth", step: "personal", keys: ["dateOfBirth"], label: "Date of Birth", required: true, kind: "date", placeholder: "Select date of birth", max: () => iso(adultMax()), dateStyle: "wheel", defaultDate: () => "1990-01-01" },
  { id: "passportNumber", step: "personal", keys: ["passportNumber"], label: "Passport Number", required: true, kind: "text", placeholder: "e.g. A1234567", text: { caps: "characters", upper: true } },
  { id: "hasValidPassport", step: "personal", keys: ["hasValidPassport"], label: "Do you have a valid passport?", required: true, kind: "yesno",
    hint: "Your passport should have at least 6 months validity from your travel date.",
    note: (f) => (f.hasValidPassport === "no" ? { tone: "amber", text: "You will need to obtain a valid passport before applying for a visa." } : null) },
  { id: "maritalStatus", step: "personal", keys: ["maritalStatus"], label: "Marital Status", required: true, kind: "choice", options: MARITAL,
    onPick: (v) => (v !== "married" ? { spouseAccompanying: "" } : {}) },
  { id: "spouseAccompanying", step: "personal", keys: ["spouseAccompanying"], label: "Will your spouse accompany you?", required: true, kind: "yesno", applies: (f) => f.maritalStatus === "married" },
  // ---- Spouse Information (spouse-step.tsx), only when married and the spouse travels ----
  { id: "spouseFirstName", step: "spouse", keys: ["spouseFirstName"], label: "Spouse First Name", required: true, kind: "text", placeholder: "Enter first name", text: { caps: "words" } },
  { id: "spouseLastName", step: "spouse", keys: ["spouseLastName"], label: "Spouse Last Name", required: true, kind: "text", placeholder: "Enter last name", text: { caps: "words" } },
  { id: "spouseHasValidPassport", step: "spouse", keys: ["spouseHasValidPassport"], label: "Does your spouse have a valid passport?", required: true, kind: "yesno",
    hint: "Your spouse's passport should have at least 6 months validity from your travel date.",
    note: (f) => (f.spouseHasValidPassport === "no" ? { tone: "amber", text: "Your spouse will need to obtain a valid passport before applying for a visa." } : null) },
  { id: "spouseOccupation", step: "spouse", keys: ["spouseOccupation"], label: "Spouse Occupation", required: false, kind: "text", placeholder: "Enter occupation", text: { caps: "sentences" } },
  // ---- Employment (employment-step.tsx) ----
  { id: "employmentStatus", step: "employment", keys: ["employmentStatus"], label: "Employment Status", required: true, kind: "choice", options: EMPLOYMENT },
  { id: "jobTitle", step: "employment", keys: ["jobTitle"], label: "Job Title", required: true, kind: "text", placeholder: "Enter job title", applies: EMP, text: { caps: "words", contentType: "jobTitle" } },
  { id: "companyName", step: "employment", keys: ["companyName"], label: "Company Name", required: true, kind: "text", placeholder: "Enter company name", applies: (f) => EMP(f) || BIZ(f), text: { caps: "words", contentType: "organizationName" } },
  { id: "employmentStartDate", step: "employment", keys: ["employmentStartDate"], label: "Employment Start Date", required: true, kind: "date", placeholder: "Select start date", applies: EMP, max: todayIso, dateStyle: "wheel" },
  { id: "monthlySalary", step: "employment", keys: ["monthlySalary"], label: "Monthly Salary Range", required: true, kind: "choice", options: SALARY, applies: EMP },
  { id: "hasNOC", step: "employment", keys: ["hasNOC"], label: "Do you have a No Objection Certificate?", required: false, kind: "yesno", applies: EMP },
  { id: "averageMonthlyIncome", step: "employment", keys: ["averageMonthlyIncome"], label: "Average Monthly Income", required: true, kind: "text", placeholder: "e.g., 15,000 AED", applies: BIZ },
  // ---- Trip Details (trip-details-step.tsx) ----
  { id: "purposeOfTrip", step: "trip-details", keys: ["purposeOfTrip"], label: "Purpose of Trip", required: true, kind: "choice", options: PURPOSES },
  { id: "travelStartDate", step: "trip-details", keys: ["travelStartDate"], label: "Intended Departure Date", required: true, kind: "date", placeholder: "Select departure date", min: () => iso(earliestDeparture()), dateStyle: "calendar",
    hint: "At least 15 days from today." },
  { id: "travelEndDate", step: "trip-details", keys: ["travelEndDate"], label: "Intended Return Date", required: true, kind: "date", placeholder: "Select return date", min: (f) => f.travelStartDate || todayIso(), dateStyle: "calendar" },
  { id: "datesFlexible", step: "trip-details", keys: ["datesFlexible"], label: "Are your travel dates flexible?", required: true, kind: "yesno" },
  { id: "travelingWith", step: "trip-details", keys: ["travelingWith"], label: "Who are you traveling with?", required: true, kind: "choice", options: COMPANIONS },
  { id: "hotelCategory", step: "trip-details", keys: ["hotelCategory"], label: "Accommodation Preferences", required: true, kind: "choice", options: HOTELS },
  { id: "fundingSource", step: "trip-details", keys: ["fundingSource"], label: "Funding Source", required: true, kind: "choice", options: FUNDING },
  { id: "balanceRange", step: "trip-details", keys: ["balanceRange"], label: "Approx. Bank Balance Range", required: true, kind: "choice", options: BALANCE },
  { id: "isFirstSchengenVisa", step: "trip-details", keys: ["isFirstSchengenVisa"], label: "Is this your first Schengen Visa?", required: true, kind: "yesno" },
  { id: "previousRefusals", step: "trip-details", keys: ["previousRefusals"], label: "Have you ever had a visa refusal?", required: true, kind: "yesno",
    onPick: (v) => (v === "no" ? { refusalDetails: "" } : {}) },
  { id: "refusalDetails", step: "trip-details", keys: ["refusalDetails"], label: "Refusal Details", required: true, kind: "textarea", applies: (f) => f.previousRefusals === "yes",
    hint: "Please specify the country, date, and reason stated in the refusal letter. We will formulate a mitigation explanation in your cover letter.",
    placeholder: "e.g., Rejected by France in Nov 2025 due to insufficient justification of travel purpose..." },
  { id: "willVisitOtherCountries", step: "trip-details", keys: ["willVisitOtherCountries"], label: "Will you be visiting other Schengen countries?", required: false, kind: "yesno",
    onPick: (v) => (v === "no" ? { additionalCountries: [] } : {}) },
  { id: "additionalCountries", step: "trip-details", keys: ["additionalCountries"], label: "Additional Countries to Visit", required: false, kind: "countries", applies: (f) => f.willVisitOtherCountries === "yes",
    hint: "Add other Schengen countries you plan to visit during your trip" },
  { id: "itinerary", step: "trip-details", keys: ["itinerary"], label: "Travel Itinerary", required: false, kind: "textarea", hint: "Provide details about your planned activities, accommodations, and schedule",
    placeholder: "Example: Day 1-3: Paris (Hotel XYZ), Day 4-6: Rome (Hotel ABC)..." },
];
export const Q_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const REVIEW = "review";

/** Questions that apply to this form, in the website's order (spouse questions only when the spouse step is visible). */
export function activeQuestions(f: WizardForm): Question[] {
  const steps = visibleSteps(f);
  return QUESTIONS.filter((q) => steps.includes(q.step) && (!q.applies || q.applies(f)));
}
/** Errors for one question: the website's step validation, limited to this question's fields. */
export function questionErrors(q: Question, f: WizardForm): Errors {
  const all = validateStep(q.step, f); const out: Errors = {};
  for (const k of q.keys) if (all[k]) out[k] = all[k];
  return out;
}
export const firstError = (q: Question, f: WizardForm) => Object.values(questionErrors(q, f))[0] as string | undefined;
export const isAnswered = (q: Question, f: WizardForm) => q.keys.some((k) => { const v = f[k]; return Array.isArray(v) ? v.length > 0 : typeof v === "boolean" ? false : !!String(v ?? "").trim(); });
/** First question that still has an error (null when the whole application is valid). */
export const firstInvalid = (f: WizardForm) => activeQuestions(f).find((q) => !!firstError(q, f)) ?? null;
/** First question without an answer yet (used when a link prefilled some answers). */
export const firstUnanswered = (f: WizardForm) => activeQuestions(f).find((q) => !isAnswered(q, f) && !!firstError(q, f)) ?? null;

/** Page ids: "q:<questionId>" or "review". Old pages (step slugs, v1 page names) map to the step's first question. */
const LEGACY: Record<string, WizardStep> = { destination: "personal", nationality: "personal", residence: "personal", contact: "personal", passport: "personal", marital: "personal", work: "employment", purpose: "trip-details", dates: "trip-details", history: "trip-details", stay: "trip-details", funds: "trip-details" };
export function normalizePage(p: string | null | undefined, f: WizardForm): string {
  if (!p) return `q:${activeQuestions(f)[0].id}`;
  if (p === "q:nationalityOther") return "q:nationality"; // removed free-text question
  if (p === REVIEW || p === "payment" || p === "documents") return REVIEW;
  if (p.startsWith("q:")) { const q = Q_BY_ID[p.slice(2)]; if (q && activeQuestions(f).includes(q)) return p; if (q) return pageForStep(q.step, f); }
  const step = (["personal", "spouse", "employment", "trip-details"] as string[]).includes(p) ? (p as WizardStep) : LEGACY[p] ?? "personal";
  return pageForStep(step, f);
}
export function pageForStep(step: WizardStep, f: WizardForm): string {
  if (step === "payment") return REVIEW;
  const qs = activeQuestions(f); const q = qs.find((x) => x.step === step) ?? qs.find((x) => x.step === "employment") ?? qs[0];
  return `q:${q.id}`;
}
export const stepOfPage = (p: string): WizardStep => (p.startsWith("q:") ? Q_BY_ID[p.slice(2)]?.step ?? "personal" : "payment");

/** Progress grouped by the website's step names: one segment per visible step, filled by position inside it. */
export function progressOf(f: WizardForm, page: string) {
  const steps = visibleSteps(f); const qs = activeQuestions(f);
  const cur = page.startsWith("q:") ? Q_BY_ID[page.slice(2)] : null;
  const curStep: WizardStep = cur ? cur.step : "payment";
  const ci = steps.indexOf(curStep);
  const segs = steps.map((s: WizardStep, i) => {
    if (s === "payment") return { step: s, fill: curStep === "payment" ? 1 : 0, count: 1, index: curStep === "payment" ? 1 : 0 };
    const inStep = qs.filter((q) => q.step === s);
    const pos = cur && cur.step === s ? inStep.indexOf(cur) : -1;
    return { step: s, count: inStep.length, index: pos + 1, fill: i < ci ? 1 : i > ci ? 0 : inStep.length ? pos / inStep.length : 0 };
  });
  return { steps, segs, curStep, stepIndex: ci };
}

/** Human value for the review list (labels from the website's options). */
export function displayValue(q: Question, f: WizardForm, t: (s: string) => string = (s) => s, fmtDate: (s: string) => string = (s) => s): string {
  const v = f[q.keys[0]] as any;
  switch (q.kind) {
    case "choice": return v ? t(optLabel(q.options!, v)) : "";
    case "yesno": return v === "yes" ? t("Yes") : v === "no" ? t("No") : "";
    case "date": return v ? fmtDate(v) : "";
    case "phone": return f.phone || "";
    case "countries": return f.additionalCountries.map((a) => `${t(a.country)} (${fmtDate(a.arrivalDate)} – ${fmtDate(a.departureDate)})`).join("\n");
    case "country": return v ? t(v) : "";
    default: return String(v ?? "");
  }
}
