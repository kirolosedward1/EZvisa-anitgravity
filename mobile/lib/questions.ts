// One question per screen, built ONLY from the website wizard (lib/wizard.ts mirrors web lib/wizard-steps.ts +
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
/** "+971500000000" -> "+971 50 000 0000" (shown as typed when it can't be parsed). */
export const phoneDisplay = (v: string) => { try { return parsePhoneNumberFromString(v)?.formatInternational() ?? v; } catch { return v; } };
// components/apply/*): the same fields, labels, options, order and validation. Each question owns one or more form keys;
// its errors are exactly validateStep(step) filtered to those keys, so the rules can never drift from the web.
import { WORLD } from "./world";
import {
  SCHENGEN, UAE_NATIONALITIES, EMIRATE_OPTIONS, SCHENGEN_VISA_REQUIRED, MARITAL, EMPLOYMENT, SALARY, PURPOSES, COMPANIONS, HOTELS, FUNDING, BALANCE,
  PRE_PAYMENT_STEPS, DETAIL_STEPS, showSpouse, validateStep, validateDetailStep, adultMax, earliestDeparture, iso, label as optLabel,
  type WizardForm, type WizardStep, type DetailStep, type Errors, type Traveller,
} from "./wizard";
/** A question's step: before payment (destination, personal) or after payment (trip, passport, spouse, employment). */
export type QStep = Exclude<WizardStep, "payment"> | DetailStep;
const PRE: QStep[] = ["destination", "personal"];
export const isPreStep = (s: QStep) => PRE.includes(s);

export type Opt = { value: string; label: string };
export type QKind = "country" | "choice" | "yesno" | "text" | "date" | "dates" | "contact" | "textarea" | "countries" | "pair" | "traveller";
/** One text field of a "pair" screen (two fields on one page). */
export type PairField = { key: keyof WizardForm; label: string; placeholder: string; contentType?: string; autoComplete?: string };
export type Question = {
  id: string; step: QStep; keys: (keyof WizardForm)[];
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
/** The account's saved travellers (lib/travellers.ts fetchTravellers, set by the wizard screen): the "Who is travelling?"
 *  question applies only when there is at least one. Kept here (not in lib/travellers.ts) to avoid an import cycle. */
let travellers: Traveller[] = [];
export const setTravellers = (list: Traveller[]) => { travellers = list; };
export const getTravellers = () => travellers;

export const QUESTIONS: Question[] = [
  // ======== BEFORE PAYMENT: the website's steps and fields, in its order ========
  // ---- Step 1, Destination (website components/apply/destination-step.tsx) ----
  { id: "destination", step: "destination", keys: ["destination"], label: "Destination Country (Schengen)", required: true, kind: "country", names: SCHENGEN, searchPlaceholder: "Search country..." },
  // Signed in with saved travellers (lib/travellers.ts): the website's "Who is travelling?" drop-down, asked right after the
  // destination. Picking one fills every answer it carries (nationality, name, passport number and expiry, date of birth,
  // phone, emirate) and the wizard jumps to the first question still open, so a returning customer is not asked for
  // their nationality or passport again. Owns no form key: never an error, never on Review.
  { id: "traveller", step: "destination", keys: [], label: "Who is travelling?", required: true, kind: "traveller", hint: "Pick a saved traveller to fill in the details. You can still edit them.",
    applies: () => !!accountEmail && getTravellers().length > 0 },
  { id: "nationality", step: "destination", keys: ["nationality"], label: "Nationality", required: true, kind: "country", names: UAE_NATIONALITIES, searchPlaceholder: "Search nationality...",
    allNames: SCHENGEN_VISA_REQUIRED },
  // ---- Step 2 (website components/apply/nationality-step.tsx) ----
  // Country of residence is always the UAE (RESIDENCE_COUNTRIES), set in emptyForm, so it has no screen.
  { id: "name", step: "personal", keys: ["firstName", "lastName"], label: "Your Name", required: true, kind: "pair", hint: "As on your passport.",
    fields: [{ key: "firstName", label: "First Name", placeholder: "Enter first name", contentType: "givenName", autoComplete: "given-name" },
      { key: "lastName", label: "Last Name", placeholder: "Enter last name", contentType: "familyName", autoComplete: "family-name" }] },
  { id: "passportNumber", step: "personal", keys: ["passportNumber"], label: "Passport Number", required: true, kind: "text", placeholder: "e.g. A1234567",
    hint: "As printed on your passport's photo page.", text: { caps: "characters", upper: true },
    onPick: (v) => (v.trim() ? { hasValidPassport: "yes" } : {}) },
  // Email + phone on one screen. Signed in: the account email is used and only the phone is shown (see accountEmail).
  { id: "contact", step: "personal", keys: ["email", "phone", "phoneLocal", "phoneCountry", "whatsappOptIn"], label: "Email & Phone Number", required: true, kind: "contact" },
  { id: "travellingWith", step: "personal", keys: ["spouseAccompanying"], label: "Travelling with", required: true, kind: "choice",
    options: [{ value: "no", label: "Just me" }, { value: "yes", label: "With my spouse" }],
    hint: "With your spouse: two applicants. Spouse details are asked after payment.",
    onPick: (v, f) => (v === "yes"
      ? { maritalStatus: "married", travelingWith: "spouse" }
      : { maritalStatus: "single", ...(f.travelingWith === "spouse" ? { travelingWith: "alone" } : {}) }) },
  { id: "dateOfBirth", step: "personal", keys: ["dateOfBirth"], label: "Date of Birth", required: true, kind: "date", placeholder: "Select date of birth", max: () => iso(adultMax()), dateStyle: "wheel", defaultDate: () => "1990-01-01" },
  { id: "cityOfResidence", step: "personal", keys: ["cityOfResidence"], label: "Emirate you live in", required: true, kind: "choice", options: EMIRATE_OPTIONS },

  // ======== AFTER PAYMENT (Continue application) ========
  // ---- Trip Details ----
  { id: "purposeOfTrip", step: "trip", keys: ["purposeOfTrip"], label: "Purpose of Trip", required: true, kind: "choice", options: PURPOSES },
  // Departure + return (+ flexible) on one screen: "Fixed dates" range calendar or "Flexible" window.
  { id: "dates", step: "trip", keys: ["travelStartDate", "travelEndDate", "datesFlexible"], label: "When are you travelling?", required: true, kind: "dates" },
  { id: "travelingWith", step: "trip", keys: ["travelingWith"], label: "Who are you traveling with?", required: true, kind: "choice", options: COMPANIONS },
  { id: "hotelCategory", step: "trip", keys: ["hotelCategory"], label: "Accommodation Preferences", required: true, kind: "choice", options: HOTELS },
  { id: "fundingSource", step: "trip", keys: ["fundingSource"], label: "Funding Source", required: true, kind: "choice", options: FUNDING },
  { id: "balanceRange", step: "trip", keys: ["balanceRange"], label: "Approx. Bank Balance Range", required: true, kind: "choice", options: BALANCE },
  { id: "isFirstSchengenVisa", step: "trip", keys: ["isFirstSchengenVisa"], label: "Is this your first Schengen Visa?", required: true, kind: "yesno" },
  { id: "previousRefusals", step: "trip", keys: ["previousRefusals"], label: "Have you ever had a visa refusal?", required: true, kind: "yesno",
    onPick: (v) => (v === "no" ? { refusalDetails: "" } : {}) },
  { id: "refusalDetails", step: "trip", keys: ["refusalDetails"], label: "Refusal Details", required: true, kind: "textarea", applies: (f) => f.previousRefusals === "yes",
    hint: "Please specify the country, date, and reason stated in the refusal letter. We will formulate a mitigation explanation in your cover letter.",
    placeholder: "e.g., Rejected by France in Nov 2025 due to insufficient justification of travel purpose..." },
  { id: "willVisitOtherCountries", step: "trip", keys: ["willVisitOtherCountries"], label: "Will you be visiting other Schengen countries?", required: false, kind: "yesno",
    onPick: (v) => (v === "no" ? { additionalCountries: [] } : {}) },
  { id: "additionalCountries", step: "trip", keys: ["additionalCountries"], label: "Additional Countries to Visit", required: false, kind: "countries", applies: (f) => f.willVisitOtherCountries === "yes",
    hint: "Add other Schengen countries you plan to visit during your trip" },
  // Last trip question, as on the website's trip step. Rows that answered the older "Emirates ID" question are not asked.
  { id: "residenceVisaValid", step: "trip", keys: ["residenceVisaValid"], label: "Is your UAE residence visa valid at least 3 months after your return date?", required: true, kind: "yesno",
    applies: (f) => !f.hasEmiratesId,
    note: (f) => (f.residenceVisaValid === "no" ? { tone: "amber", text: "Most embassies need your UAE residence visa to be valid at least 3 months after you return. Renew it before your appointment; our team will guide you." } : null) },
  // ---- Passport, only when the number is still missing (older rows) ----
  { id: "hasValidPassport", step: "passport", keys: ["hasValidPassport"], label: "Do you have a valid passport?", required: true, kind: "yesno",
    hint: "Your passport should have at least 6 months validity from your travel date.",
    onPick: (v) => (v === "no" ? { passportNumber: "" } : {}),
    note: (f) => (f.hasValidPassport === "no" ? { tone: "amber", text: "You'll need a valid passport (at least 6 months validity from your travel date) before your visa appointment. Our team will contact you." } : null) },
  { id: "passportNumberAfter", step: "passport", keys: ["passportNumber"], label: "Passport Number", required: true, kind: "text", placeholder: "e.g. A1234567", applies: (f) => f.hasValidPassport !== "no",
    text: { caps: "characters", upper: true } },
  // ---- Spouse Information, only when married and the spouse travels ----
  { id: "spouseName", step: "spouse", keys: ["spouseFirstName", "spouseLastName"], label: "Spouse Name", required: true, kind: "pair", hint: "As on your spouse's passport.",
    fields: [{ key: "spouseFirstName", label: "Spouse First Name", placeholder: "Enter first name" }, { key: "spouseLastName", label: "Spouse Last Name", placeholder: "Enter last name" }] },
  { id: "spouseHasValidPassport", step: "spouse", keys: ["spouseHasValidPassport"], label: "Does your spouse have a valid passport?", required: true, kind: "yesno",
    hint: "Your spouse's passport should have at least 6 months validity from your travel date.",
    note: (f) => (f.spouseHasValidPassport === "no" ? { tone: "amber", text: "Your spouse will need to obtain a valid passport before applying for a visa." } : null) },
  // ---- Employment ----
  { id: "employmentStatus", step: "employment", keys: ["employmentStatus"], label: "Employment Status", required: true, kind: "choice", options: EMPLOYMENT,
    onPick: (v) => (v !== "employed" ? { hasNOC: "" } : {}) },
  // Employed: Job Title + Company Name on one screen. Business owner / freelancer: company name only.
  { id: "jobCompany", step: "employment", keys: ["jobTitle", "companyName"], label: "Job Title & Company", required: true, kind: "pair", applies: EMP,
    fields: [{ key: "jobTitle", label: "Job Title", placeholder: "Enter job title", contentType: "jobTitle" }, { key: "companyName", label: "Company Name", placeholder: "Enter company name", contentType: "organizationName" }] },
  { id: "companyName", step: "employment", keys: ["companyName"], label: "Company Name", required: true, kind: "text", placeholder: "Enter company name", applies: BIZ, text: { caps: "words", contentType: "organizationName" } },
  { id: "employmentStartDate", step: "employment", keys: ["employmentStartDate"], label: "Employment Start Date", required: true, kind: "date", placeholder: "Select start date", applies: EMP, max: todayIso, dateStyle: "wheel" },
  { id: "monthlySalary", step: "employment", keys: ["monthlySalary"], label: "Monthly Salary Range", required: true, kind: "choice", options: SALARY, applies: EMP },
  { id: "hasNOC", step: "employment", keys: ["hasNOC"], label: "Do you have a No Objection Certificate?", required: false, kind: "yesno", applies: EMP },
  { id: "averageMonthlyIncome", step: "employment", keys: ["averageMonthlyIncome"], label: "Average Monthly Income", required: true, kind: "text", placeholder: "e.g., 15,000 AED", applies: BIZ },
];
export const Q_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
/** Form keys asked after payment: the only answers Continue application may write (lib/data.ts saveAfterPayment). */
export const POST_KEYS: (keyof WizardForm)[] = [...new Set(QUESTIONS.filter((q) => !isPreStep(q.step)).flatMap((q) => q.keys))];
export const REVIEW = "review";

export type Phase = "pre" | "post";
/** Questions that apply to this form, in order. "pre" = the wizard before payment, "post" = Continue application. */
export function activeQuestions(f: WizardForm, phase: Phase = "pre"): Question[] {
  // After payment: every Continue step in the website's order (spouse only when the spouse travels). Answered
  // questions are skipped by the screen, so the customer sees exactly the steps the website's /continue shows.
  const steps: QStep[] = phase === "pre" ? PRE_PAYMENT_STEPS.filter((s) => s !== "payment") as QStep[] : DETAIL_STEPS.filter((s) => s !== "spouse" || showSpouse(f));
  return steps.flatMap((s) => QUESTIONS.filter((q) => q.step === s && (!q.applies || q.applies(f))));
}
/** The questions Continue application asks for this row: the same after-payment steps for website and app rows
 *  (the website's /continue asks trip, passport if missing, spouse and employment too). Shared by the screen and
 *  needsContinue. `website` is kept for callers; it no longer changes the questions. */
export function continueQuestions(f: WizardForm, _website?: boolean): Question[] {
  return activeQuestions(f, "post");
}
const TOO_SOON = "Departure must be at least 15 days from today";
/** firstError for Continue application. The 15-day minimum applies when the departure date is picked: a date already
 *  saved on the row (`saved`) stays an answer as the trip gets closer, so a finished application is not reopened. */
export const continueError = (q: Question, f: WizardForm, saved: WizardForm) => {
  const e = firstError(q, f);
  return e === TOO_SOON && !!saved.travelStartDate && f.travelStartDate === saved.travelStartDate ? undefined : e;
};
/** True when Continue application still has a required question to ask (f = the answers on the row). */
export const continueNeeded = (f: WizardForm, website: boolean) => continueQuestions(f, website).some((q) => !!continueError(q, f, f));
/** Errors for one question: the website's step validation, limited to this question's fields. */
export function questionErrors(q: Question, f: WizardForm): Errors {
  const all = isPreStep(q.step) ? validateStep(q.step as WizardStep, f) : validateDetailStep(q.step as DetailStep, f); const out: Errors = {};
  for (const k of q.keys) if (all[k]) out[k] = all[k];
  return out;
}
export const firstError = (q: Question, f: WizardForm) => Object.values(questionErrors(q, f))[0] as string | undefined;
/** A real answer, not a default. Email & Phone owns the dial code (`phoneCountry`, "AE" on a blank form) and the
 *  WhatsApp opt-in; neither is an answer, so the screen stays open until there is an email and a phone number.
 *  Signed in, the account email counts (the email field is not shown). */
export const isAnswered = (q: Question, f: WizardForm) => {
  if (q.kind === "contact") return !!(getAccountEmail() || f.email.trim()) && !!(f.phone.trim() || f.phoneLocal.trim());
  return q.keys.some((k) => { const v = f[k]; return Array.isArray(v) ? v.length > 0 : typeof v === "boolean" ? false : !!String(v ?? "").trim(); });
};
/** First question that still has an error (null when the whole application is valid). */
export const firstInvalid = (f: WizardForm, phase: Phase = "pre") => activeQuestions(f, phase).find((q) => !!firstError(q, f)) ?? null;
/** First required question still open (null when every required answer is in, so the wizard can go to Review).
 *  The traveller picker owns no form key, so picking someone never stops on that screen. A question is open when
 *  it has no real answer or the website's validation still rejects it — including Email & Phone, whose dial-code
 *  default used to look like an answer and skip a traveller with no email or phone straight to Review. */
export const firstUnanswered = (f: WizardForm) =>
  activeQuestions(f).find((q) => q.required && q.keys.length > 0 && (!isAnswered(q, f) || !!firstError(q, f))) ?? null;

/** Page ids: "q:<questionId>" or "review". Old pages (step slugs, v1 page names) map to the step's first question. */
const LEGACY: Record<string, WizardStep> = { nationality: "destination", residence: "personal", contact: "personal", passport: "personal", marital: "personal", spouse: "personal" };
export function normalizePage(p: string | null | undefined, f: WizardForm): string {
  if (!p) return `q:${activeQuestions(f)[0].id}`;
  if (p === "q:nationalityOther") return "q:nationality"; // removed free-text question
  if (p === "q:firstName" || p === "q:lastName") return "q:name"; // merged screens
  if (p === "q:email" || p === "q:phone") return "q:contact";
  if (p === "q:travelStartDate" || p === "q:travelEndDate" || p === "q:datesFlexible") p = "q:dates"; // merged into one Dates screen
  if (p === "q:countryOfResidence" || p === "q:hasEmiratesId") p = "q:cityOfResidence"; // no screen any more
  if (p === "q:maritalStatus" || p === "q:spouseAccompanying") p = "q:travellingWith"; // one "Travelling with" screen, as on the website
  if (p === REVIEW || p === "payment" || p === "documents") return REVIEW;
  // A question that is now asked after payment (old drafts): continue at the first open question, or Review.
  if (p.startsWith("q:") && Q_BY_ID[p.slice(2)] && !isPreStep(Q_BY_ID[p.slice(2)].step)) { const bad = firstInvalid(f); return bad ? `q:${bad.id}` : REVIEW; }
  if (p.startsWith("q:")) { const q = Q_BY_ID[p.slice(2)]; if (q && activeQuestions(f).includes(q)) return p; if (q) return pageForStep(q.step, f); }
  const step = (["destination", "personal"] as string[]).includes(p) ? (p as WizardStep) : LEGACY[p] ?? "destination";
  return pageForStep(step, f);
}
export function pageForStep(step: WizardStep | QStep, f: WizardForm): string {
  if (step === "payment") return REVIEW;
  const qs = activeQuestions(f); const q = qs.find((x) => x.step === step) ?? qs[0];
  return `q:${q.id}`;
}
export const stepOfPage = (p: string): WizardStep => {
  if (!p.startsWith("q:")) return "payment";
  const s = Q_BY_ID[p.slice(2)]?.step;
  return s && isPreStep(s) ? (s as WizardStep) : "destination";
};

/** Progress grouped by the website's step names: one segment per visible step, filled by position inside it. */
export function progressOf(f: WizardForm, page: string) {
  const steps = PRE_PAYMENT_STEPS; const qs = activeQuestions(f);
  const cur = page.startsWith("q:") ? Q_BY_ID[page.slice(2)] : null;
  const curStep: WizardStep = cur && isPreStep(cur.step) ? (cur.step as WizardStep) : "payment";
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
  if (q.kind === "traveller") return [f.firstName, f.lastName].filter(Boolean).join(" ");
  const v = f[q.keys[0]] as any;
  switch (q.kind) {
    case "choice": return v ? t(optLabel(q.options!, v)) : "";
    case "yesno": return v === "yes" ? t("Yes") : v === "no" ? t("No") : "";
    case "date": return v ? fmtDate(v) : "";
    case "dates": return f.travelStartDate ? `${fmtDate(f.travelStartDate)}${f.travelEndDate ? ` – ${fmtDate(f.travelEndDate)}` : ""}${f.datesFlexible === "yes" ? ` · ${t("Flexible")}` : ""}` : "";
    case "contact": return [accountEmail ? "" : f.email.trim(), phoneDisplay(f.phone)].filter(Boolean).join(" · ");
    case "pair": return (q.fields ?? []).map((x) => String(f[x.key] ?? "").trim()).filter(Boolean).join(q.id === "jobCompany" ? " · " : " ");
    case "countries": return f.additionalCountries.map((a) => `${t(a.country)} (${fmtDate(a.arrivalDate)} – ${fmtDate(a.departureDate)})`).join("\n");
    case "country": return v ? t(v) : "";
    default: return String(v ?? "");
  }
}
