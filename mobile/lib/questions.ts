// One question per screen, built ONLY from the website wizard (lib/wizard.ts mirrors web lib/wizard-steps.ts +
// components/apply/*): the same fields, labels, options, order and validation. Each question owns one or more form keys;
// its errors are exactly validateStep(step) filtered to those keys, so the rules can never drift from the web.
import { WORLD } from "./world";
import {
  SCHENGEN, UAE_NATIONALITIES, EMIRATE_OPTIONS, SCHENGEN_VISA_REQUIRED, MARITAL, EMPLOYMENT, SALARY, PURPOSES, COMPANIONS, HOTELS, FUNDING, BALANCE,
  visibleSteps, postSteps, validateStep, adultMax, earliestDeparture, iso, label as optLabel, type WizardForm, type WizardStep, type Errors,
} from "./wizard";

export type Opt = { value: string; label: string };
export type QKind = "country" | "choice" | "yesno" | "text" | "date" | "contact" | "textarea" | "countries" | "pair";
/** One text field of a "pair" screen (two fields on one page). */
export type PairField = { key: keyof WizardForm; label: string; placeholder: string; contentType?: string; autoComplete?: string };
export type Question = {
  id: string; step: Exclude<WizardStep, "payment">; keys: (keyof WizardForm)[];
  /** The website's field label (without the trailing " *"). */
  label: string; required: boolean; kind: QKind;
  placeholder?: string; searchPlaceholder?: string; options?: Opt[]; names?: string[]; allNames?: string[];
  /** "pair" only: the two fields shown on the screen. */
  fields?: PairField[];
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

/** Signed-in account email (set by the wizard screen). When present, the email answer is the account email and the
 *  question is skipped: applications belong to the account by email (listApplications .eq("email", me)). */
let accountEmail: string | null = null;
export const setAccountEmail = (e: string | null | undefined) => { accountEmail = e?.trim().toLowerCase() || null; };
export const getAccountEmail = () => accountEmail;

export const QUESTIONS: Question[] = [
  // ======== BEFORE PAYMENT (step "personal"): only what the price and the account need ========
  { id: "destination", step: "personal", keys: ["destination"], label: "Destination Country (Schengen)", required: true, kind: "country", names: SCHENGEN, searchPlaceholder: "Search country..." },
  { id: "nationality", step: "personal", keys: ["nationality"], label: "Nationality", required: true, kind: "country", names: UAE_NATIONALITIES, searchPlaceholder: "Search nationality...",
    allNames: SCHENGEN_VISA_REQUIRED },
  // Country of residence is always the UAE (RESIDENCE_COUNTRIES), set in emptyForm, so it has no screen.
  { id: "cityOfResidence", step: "personal", keys: ["cityOfResidence"], label: "City of Residence", required: true, kind: "choice", options: EMIRATE_OPTIONS },
  { id: "name", step: "personal", keys: ["firstName", "lastName"], label: "Your Name", required: true, kind: "pair", hint: "As on your passport.",
    fields: [{ key: "firstName", label: "First Name", placeholder: "Enter first name", contentType: "givenName", autoComplete: "given-name" },
      { key: "lastName", label: "Last Name", placeholder: "Enter last name", contentType: "familyName", autoComplete: "family-name" }] },
  // Email + phone on one screen. Signed in: the account email is used and only the phone is shown (see accountEmail).
  { id: "contact", step: "personal", keys: ["email", "phone", "phoneLocal", "phoneCountry", "whatsappOptIn"], label: "Email & Phone Number", required: true, kind: "contact" },
  { id: "maritalStatus", step: "personal", keys: ["maritalStatus"], label: "Marital Status", required: true, kind: "choice", options: MARITAL,
    onPick: (v) => (v !== "married" ? { spouseAccompanying: "" } : {}) },
  { id: "spouseAccompanying", step: "personal", keys: ["spouseAccompanying"], label: "Will your spouse accompany you?", required: true, kind: "yesno", applies: (f) => f.maritalStatus === "married" },

  // ======== AFTER PAYMENT (Continue application) ========
  // ---- Trip Details ----
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
  // ---- Passport & Residence ----
  // Replaces "Do you have an Emirates ID?" (every UAE resident has one); website rows that answered that are not asked again.
  { id: "residenceVisaValid", step: "passport", keys: ["residenceVisaValid"], label: "Is your UAE residence visa valid at least 3 months after your return date?", required: true, kind: "yesno",
    applies: (f) => !f.hasEmiratesId,
    note: (f) => (f.residenceVisaValid === "no" ? { tone: "amber", text: "Most embassies need your UAE residence visa to be valid at least 3 months after you return. Renew it before your appointment; our team will guide you." } : null) },
  { id: "dateOfBirth", step: "passport", keys: ["dateOfBirth"], label: "Date of Birth", required: true, kind: "date", placeholder: "Select date of birth", max: () => iso(adultMax()), dateStyle: "wheel", defaultDate: () => "1990-01-01" },
  { id: "hasValidPassport", step: "passport", keys: ["hasValidPassport"], label: "Do you have a valid passport?", required: true, kind: "yesno",
    hint: "Your passport should have at least 6 months validity from your travel date.",
    onPick: (v) => (v === "no" ? { passportNumber: "", passportExpiry: "" } : {}),
    note: (f) => (f.hasValidPassport === "no" ? { tone: "amber", text: "You'll need a valid passport (at least 6 months validity from your travel date) before your visa appointment. Our team will contact you." } : null) },
  { id: "passportNumber", step: "passport", keys: ["passportNumber"], label: "Passport Number", required: true, kind: "text", placeholder: "e.g. A1234567", applies: (f) => f.hasValidPassport === "yes",
    text: { caps: "characters", upper: true } },
  { id: "passportExpiry", step: "passport", keys: ["passportExpiry"], label: "Passport Expiry Date", required: true, kind: "date", placeholder: "Select expiry date", applies: (f) => f.hasValidPassport === "yes",
    min: () => todayIso(), dateStyle: "wheel", defaultDate: () => { const d = new Date(); return iso(new Date(d.getFullYear() + 3, d.getMonth(), d.getDate())); } },
  // ---- Spouse Information, only when married and the spouse travels ----
  { id: "spouseName", step: "spouse", keys: ["spouseFirstName", "spouseLastName"], label: "Spouse Name", required: true, kind: "pair", hint: "As on your spouse's passport.",
    fields: [{ key: "spouseFirstName", label: "Spouse First Name", placeholder: "Enter first name" }, { key: "spouseLastName", label: "Spouse Last Name", placeholder: "Enter last name" }] },
  { id: "spouseHasValidPassport", step: "spouse", keys: ["spouseHasValidPassport"], label: "Does your spouse have a valid passport?", required: true, kind: "yesno",
    hint: "Your spouse's passport should have at least 6 months validity from your travel date.",
    note: (f) => (f.spouseHasValidPassport === "no" ? { tone: "amber", text: "You can continue. Your spouse needs a valid passport; add it later." } : null) },
  // ---- Employment ----
  { id: "employmentStatus", step: "employment", keys: ["employmentStatus"], label: "Employment Status", required: true, kind: "choice", options: EMPLOYMENT,
    onPick: (v) => (v !== "employed" ? { hasNOC: "" } : {}) },
  // Employed: Job Title + Company Name on one screen. Business owner / freelancer: company name only.
  { id: "jobCompany", step: "employment", keys: ["jobTitle", "companyName"], label: "Job Title & Company", required: true, kind: "pair", applies: EMP,
    fields: [{ key: "jobTitle", label: "Job Title", placeholder: "Enter job title", contentType: "jobTitle" }, { key: "companyName", label: "Company Name", placeholder: "Enter company name", contentType: "organizationName" }] },
  { id: "companyName", step: "employment", keys: ["companyName"], label: "Company Name", required: true, kind: "text", placeholder: "Enter company name", applies: BIZ, text: { caps: "words", contentType: "organizationName" } },
  { id: "employmentStartDate", step: "employment", keys: ["employmentStartDate"], label: "Employment Start Date", required: true, kind: "date", placeholder: "Select start date", applies: EMP, max: todayIso, dateStyle: "wheel" },
  { id: "monthlySalary", step: "employment", keys: ["monthlySalary"], label: "Monthly Salary Range", required: true, kind: "choice", options: SALARY, applies: EMP },
  { id: "hasNOC", step: "employment", keys: ["hasNOC"], label: "Do you have a No Objection Certificate?", required: false, kind: "yesno", applies: EMP,
    note: (f) => (f.hasNOC === "no" ? { tone: "amber", text: "You can continue. Ask your employer for a NOC and add it later." } : null) },
  { id: "averageMonthlyIncome", step: "employment", keys: ["averageMonthlyIncome"], label: "Average Monthly Income", required: true, kind: "text", placeholder: "e.g., 15,000 AED", applies: BIZ },
];
export const Q_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const REVIEW = "review";

export type Phase = "pre" | "post";
/** Questions that apply to this form, in order. "pre" = the wizard before payment, "post" = Continue application. */
export function activeQuestions(f: WizardForm, phase: Phase = "pre"): Question[] {
  const steps = phase === "pre" ? visibleSteps(f) : postSteps(f);
  return steps.flatMap((s) => QUESTIONS.filter((q) => q.step === s && (!q.applies || q.applies(f))));
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
export const firstInvalid = (f: WizardForm, phase: Phase = "pre") => activeQuestions(f, phase).find((q) => !!firstError(q, f)) ?? null;
/** First question without an answer yet (used when a link prefilled some answers). */
export const firstUnanswered = (f: WizardForm) => activeQuestions(f).find((q) => !isAnswered(q, f) && !!firstError(q, f)) ?? null;

/** Page ids: "q:<questionId>" or "review". Old pages (step slugs, v1 page names) map to the step's first question. */
const LEGACY: Record<string, WizardStep> = { destination: "personal", nationality: "personal", residence: "personal", contact: "personal", passport: "personal", marital: "personal", work: "employment", purpose: "trip-details", dates: "trip-details", history: "trip-details", stay: "trip-details", funds: "trip-details" };
export function normalizePage(p: string | null | undefined, f: WizardForm): string {
  if (!p) return `q:${activeQuestions(f)[0].id}`;
  if (p === "q:nationalityOther") return "q:nationality"; // removed free-text question
  if (p === "q:firstName" || p === "q:lastName") return "q:name"; // merged screens
  if (p === "q:email" || p === "q:phone") return "q:contact";
  if (p === "q:countryOfResidence" || p === "q:hasEmiratesId") p = "q:cityOfResidence"; // no screen any more / asked after payment
  if (p === REVIEW || p === "payment" || p === "documents") return REVIEW;
  // A question that is now asked after payment (old drafts): continue at the first open question, or Review.
  if (p.startsWith("q:") && Q_BY_ID[p.slice(2)] && Q_BY_ID[p.slice(2)].step !== "personal") { const bad = firstInvalid(f); return bad ? `q:${bad.id}` : REVIEW; }
  if (p.startsWith("q:")) { const q = Q_BY_ID[p.slice(2)]; if (q && activeQuestions(f).includes(q)) return p; if (q) return pageForStep(q.step, f); }
  const step = (["personal", "spouse", "employment", "trip-details"] as string[]).includes(p) ? (p as WizardStep) : LEGACY[p] ?? "personal";
  return pageForStep(step, f);
}
export function pageForStep(step: WizardStep, f: WizardForm): string {
  if (step === "payment") return REVIEW;
  const qs = activeQuestions(f); const q = qs.find((x) => x.step === step) ?? qs[0];
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
    case "contact": return [accountEmail ? "" : f.email.trim(), f.phone].filter(Boolean).join(" · ");
    case "pair": return (q.fields ?? []).map((x) => String(f[x.key] ?? "").trim()).filter(Boolean).join(q.id === "jobCompany" ? " · " : " ");
    case "countries": return f.additionalCountries.map((a) => `${t(a.country)} (${fmtDate(a.arrivalDate)} – ${fmtDate(a.departureDate)})`).join("\n");
    case "country": return v ? t(v) : "";
    default: return String(v ?? "");
  }
}
