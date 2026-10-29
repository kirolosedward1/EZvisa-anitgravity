// One question per screen, built ONLY from the website wizard (lib/wizard.ts mirrors web lib/wizard-steps.ts +
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
/** "+971500000000" -> "+971 50 000 0000" (shown as typed when it can't be parsed). */
export const phoneDisplay = (v: string) => { try { return parsePhoneNumberFromString(v)?.formatInternational() ?? v; } catch { return v; } };
// components/apply/*): the same fields, labels, options, order and validation. Each question owns one or more form keys;
// its errors are exactly validateStep(step) filtered to those keys, so the rules can never drift from the web.
import { WORLD } from "./world";
import type { GlobiPose } from "../components/globi/poses";
import type { IconName } from "../components/ui/core";
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
  /** The question Globi asks: the screen title, inside his speech bubble (app design canvas). `label` stays the website's
   *  field label (Review rows, accessibility of the answer controls). */
  ask: string | ((f: WizardForm) => string);
  /** Globi's pose on this question (canvas artboard). */
  pose: GlobiPose;
  /** Older helper line. Not shown under the question any more (canvas rule: no description line); kept for notes. */
  hint?: string;
  /** How the answers are drawn (canvas): list rows, two-column grid tiles, two tall tiles, or chips. Labels, sub-labels
   *  and icons are display only; the stored values stay the contract's. `{price}`/`{price2}`/`{country}` are filled in. */
  view?: { layout?: "list" | "grid" | "tiles" | "chips"; labels?: Record<string, string>; subs?: Record<string, string>; icons?: Record<string, IconName> };
  /** Tap Globi (canvas GlobiExplain): why the question is asked, what the answer is used for, who sees it. */
  explain: { why: string; usedFor: string; sharedWith: string };
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
  { id: "destination", explain: { why: "You apply through the country where you spend the most nights. It decides the embassy, the visa centre and the forms.", usedFor: "Application form, cover letter, visa centre", sharedWith: "The EZvisa team and the consulate" }, ask: "Where are you travelling?", pose: "destination", step: "destination", keys: ["destination"], label: "Destination Country (Schengen)", required: true, kind: "country", names: SCHENGEN, searchPlaceholder: "Search country..." },
  // Signed in with saved travellers (lib/travellers.ts): the website's "Who is travelling?" drop-down, asked right after the
  // destination. Picking one fills every answer it carries (nationality, name, passport number and expiry, date of birth,
  // phone, emirate) and the wizard jumps to the first question still open, so a returning customer is not asked for
  // their nationality or passport again. Owns no form key: never an error, never on Review.
  { id: "traveller", explain: { why: "Picking a saved traveller fills in what I already know, so you are not asked twice.", usedFor: "Name, nationality and passport details", sharedWith: "EZvisa only" }, ask: (f) => (f.destination ? "Who is travelling to {country}?" : "Who is travelling?"), pose: "passport", step: "destination", keys: [], label: "Who is travelling?", required: true, kind: "traveller", hint: "Pick a saved traveller to fill in the details. You can still edit them.",
    applies: () => !!accountEmail && getTravellers().length > 0 },
  { id: "nationality", explain: { why: "Your passport decides whether you need a Schengen visa and which documents the consulate asks for.", usedFor: "Application form, document list", sharedWith: "The consulate only" }, ask: "What passport do you hold?", pose: "passport", step: "destination", keys: ["nationality"], label: "Nationality", required: true, kind: "country", names: UAE_NATIONALITIES, searchPlaceholder: "Search nationality...",
    allNames: SCHENGEN_VISA_REQUIRED },
  // ---- Step 2 (website components/apply/nationality-step.tsx) ----
  // Country of residence is always the UAE (RESIDENCE_COUNTRIES), set in emptyForm, so it has no screen.
  { id: "name", explain: { why: "The name must match your passport exactly, or the consulate can reject the file.", usedFor: "Application form, cover letter, reservations", sharedWith: "The consulate only" }, ask: "What's your name?", pose: "writing", step: "personal", keys: ["firstName", "lastName"], label: "Your Name", required: true, kind: "pair", hint: "As on your passport.",
    fields: [{ key: "firstName", label: "First Name", placeholder: "Enter first name", contentType: "givenName", autoComplete: "given-name" },
      { key: "lastName", label: "Last Name", placeholder: "Enter last name", contentType: "familyName", autoComplete: "family-name" }] },
  // Passport number: asked after payment only (website traveller step and CLAUDE.md "Passport number stays after
  // payment"); see passportNumberAfter. A saved traveller still carries it, so it is never asked twice.
  // Email + phone on one screen. Signed in: the account email is used and only the phone is shown (see accountEmail).
  { id: "contact", explain: { why: "So the team can reach you about your file. WhatsApp is the fastest.", usedFor: "Updates about this application", sharedWith: "EZvisa only" }, ask: "Best number to reach you?", pose: "phone", step: "personal", keys: ["phone", "phoneLocal", "phoneCountry", "whatsappOptIn"], label: "Phone Number", required: true, kind: "contact" },
  { id: "travellingWith", explain: { why: "A spouse travelling with you gets their own application in the same file.", usedFor: "Price, number of applications", sharedWith: "EZvisa only" }, view: {"layout": "tiles", "labels": {"no": "Just me", "yes": "With my spouse"}, "subs": {"no": "{price} AED.", "yes": "Two applications in one file. {price2} AED."}}, ask: "Who's travelling with you?", pose: "companion", step: "personal", keys: ["spouseAccompanying"], label: "Travelling with", required: true, kind: "choice",
    options: [{ value: "no", label: "Just me" }, { value: "yes", label: "With my spouse" }],
    hint: "With your spouse: two applicants. Spouse details are asked after payment.",
    onPick: (v, f) => (v === "yes"
      ? { maritalStatus: "married", travelingWith: "spouse" }
      : { maritalStatus: "single", ...(f.travelingWith === "spouse" ? { travelingWith: "alone" } : {}) }) },
  { id: "dateOfBirth", explain: { why: "The consulate checks it against your passport. Applicants must be 18 or older.", usedFor: "Application form", sharedWith: "The consulate only" }, ask: "Your date of birth?", pose: "passport", step: "personal", keys: ["dateOfBirth"], label: "Date of Birth", required: true, kind: "date", placeholder: "Select date of birth", max: () => iso(adultMax()), dateStyle: "wheel", defaultDate: () => "1990-01-01" },
  { id: "cityOfResidence", explain: { why: "Your emirate decides which visa centre you book.", usedFor: "Visa centre, appointment", sharedWith: "The EZvisa team and the consulate" }, view: {"layout": "list"}, ask: "Which emirate do you live in?", pose: "destination", step: "personal", keys: ["cityOfResidence"], label: "Emirate you live in", required: true, kind: "choice", options: EMIRATE_OPTIONS },

  // ======== AFTER PAYMENT (Continue application) ========
  // ---- Trip Details ----
  { id: "purposeOfTrip", explain: { why: "The visa type and the documents depend on why you travel.", usedFor: "Visa type, cover letter", sharedWith: "The consulate only" }, view: {"layout": "list", "labels": {"family": "Visiting family or friends", "medical": "Medical", "education": "Study or training"}, "icons": {"tourism": "airplane", "business": "briefcase.fill", "family": "person.2.fill", "medical": "cross.case.fill", "education": "graduationcap.fill", "other": "plus"}}, ask: "What's the trip for?", pose: "travel", step: "trip", keys: ["purposeOfTrip"], label: "Purpose of Trip", required: true, kind: "choice", options: PURPOSES },
  // Departure + return (+ flexible) on one screen: "Fixed dates" range calendar or "Flexible" window.
  { id: "dates", explain: { why: "Consulates want a clear trip. Flexible is fine: we confirm exact dates before any booking.", usedFor: "Itinerary, flight and hotel reservations", sharedWith: "The consulate only" }, ask: "When are you travelling?", pose: "calendar", step: "trip", keys: ["travelStartDate", "travelEndDate", "datesFlexible"], label: "When are you travelling?", required: true, kind: "dates" },
  { id: "travelingWith", explain: { why: "Who travels with you shapes the itinerary and the cover letter.", usedFor: "Cover letter, itinerary", sharedWith: "The consulate only" }, view: {"layout": "list", "labels": {"alone": "Travelling alone", "spouse": "With spouse", "family": "With family", "friends": "With friends", "group": "With a tour group"}}, ask: "Who are you travelling with?", pose: "companion", step: "trip", keys: ["travelingWith"], label: "Who are you traveling with?", required: true, kind: "choice", options: COMPANIONS },
  { id: "hotelCategory", explain: { why: "The hotel reservation must match your budget and your bank statement.", usedFor: "Hotel reservation", sharedWith: "The consulate only" }, view: {"layout": "grid", "labels": {"3-star": "3-star", "4-star": "4-star", "5-star": "5-star", "sponsor": "With a host"}, "subs": {"3-star": "Mid-range", "4-star": "Premium", "5-star": "Luxury", "sponsor": "Family or friend's home. We'll ask for an invitation letter."}}, ask: "Where will you stay?", pose: "hotel", step: "trip", keys: ["hotelCategory"], label: "Accommodation Preferences", required: true, kind: "choice", options: HOTELS },
  { id: "fundingSource", explain: { why: "The consulate wants to see who pays for the trip.", usedFor: "Cover letter, document list", sharedWith: "The consulate only" }, view: {"layout": "list", "labels": {"self": "Myself", "sponsor": "A family member or friend", "company": "My employer"}, "subs": {"self": "Personal savings", "sponsor": "We'll ask for their sponsor letter and statement", "company": "Company letter and statement"}}, ask: "Who's paying for the trip?", pose: "wallet", step: "trip", keys: ["fundingSource"], label: "Funding Source", required: true, kind: "choice", options: FUNDING },
  { id: "balanceRange", explain: { why: "Your balance should cover the stay. A range is enough.", usedFor: "Cover letter", sharedWith: "The consulate only" }, view: {"layout": "chips", "labels": {"under-10000": "Under 10,000 AED", "10000-25000": "10,000 to 25,000", "25000-50000": "25,000 to 50,000", "50000-plus": "Over 50,000"}}, ask: "Roughly how much is in that account?", pose: "wallet", step: "trip", keys: ["balanceRange"], label: "Approx. Bank Balance Range", required: true, kind: "choice", options: BALANCE },
  { id: "isFirstSchengenVisa", explain: { why: "Earlier visas help your file. A first visa is common and fine.", usedFor: "Application form", sharedWith: "The consulate only" }, view: {"layout": "tiles"}, ask: "Is this your first Schengen visa?", pose: "passport", step: "trip", keys: ["isFirstSchengenVisa"], label: "Is this your first Schengen Visa?", required: true, kind: "yesno" },
  { id: "previousRefusals", explain: { why: "A refusal must be declared. Hiding one is the surest way to be refused again.", usedFor: "Application form, cover letter", sharedWith: "The consulate only" }, view: {"layout": "tiles"}, ask: "Have you ever had a visa refusal, anywhere?", pose: "passport", step: "trip", keys: ["previousRefusals"], label: "Have you ever had a visa refusal?", required: true, kind: "yesno",
    onPick: (v) => (v === "no" ? { refusalDetails: "" } : {}) },
  { id: "refusalDetails", explain: { why: "We explain what changed since the refusal in your cover letter.", usedFor: "Cover letter", sharedWith: "The EZvisa team and the consulate" }, ask: "What happened? Country, year and the reason on the letter", pose: "writing", step: "trip", keys: ["refusalDetails"], label: "Refusal Details", required: true, kind: "textarea", applies: (f) => f.previousRefusals === "yes",
    hint: "Please specify the country, date, and reason stated in the refusal letter. We will formulate a mitigation explanation in your cover letter.",
    placeholder: "e.g., Rejected by France in Nov 2025 due to insufficient justification of travel purpose..." },
  { id: "willVisitOtherCountries", explain: { why: "Every country you visit goes on the itinerary.", usedFor: "Itinerary", sharedWith: "The consulate only" }, view: {"layout": "tiles", "labels": {"no": "No, just {country}"}}, ask: "Visiting other Schengen countries too?", pose: "plane", step: "trip", keys: ["willVisitOtherCountries"], label: "Will you be visiting other Schengen countries?", required: false, kind: "yesno",
    onPick: (v) => (v === "no" ? { additionalCountries: [] } : {}) },
  { id: "additionalCountries", explain: { why: "The country with the most nights is where you apply.", usedFor: "Itinerary, embassy choice", sharedWith: "The consulate only" }, ask: "Which other countries, and when?", pose: "plane", step: "trip", keys: ["additionalCountries"], label: "Additional Countries to Visit", required: false, kind: "countries", applies: (f) => f.willVisitOtherCountries === "yes",
    hint: "Add other Schengen countries you plan to visit during your trip" },
  // Last trip question, as on the website's trip step. Rows that answered the older "Emirates ID" question are not asked.
  { id: "residenceVisaValid", explain: { why: "Most consulates need your UAE residence visa valid 3 months after you return.", usedFor: "Document check", sharedWith: "The EZvisa team and the consulate" }, view: {"layout": "tiles", "subs": {"yes": "Valid well past your return.", "no": "Expires before, or renewal pending. I'll flag it for the team."}}, ask: "Is your UAE residence visa valid at least 3 months after you return?", pose: "passport", step: "trip", keys: ["residenceVisaValid"], label: "Is your UAE residence visa valid at least 3 months after your return date?", required: true, kind: "yesno",
    applies: (f) => !f.hasEmiratesId,
    note: (f) => (f.residenceVisaValid === "no" ? { tone: "amber", text: "Most embassies need your UAE residence visa to be valid at least 3 months after you return. Renew it before your appointment; our team will guide you." } : null) },
  // ---- Passport, only when the number is still missing (older rows) ----
  { id: "hasValidPassport", explain: { why: "Your passport must be valid at least 3 months after you return. A No never blocks: we keep going.", usedFor: "Document check", sharedWith: "The EZvisa team and the consulate" }, view: {"layout": "tiles", "subs": {"yes": "I'll ask for the number next.", "no": "Renewing it, or it expires soon."}}, ask: "Do you have a valid passport?", pose: "passport", step: "passport", keys: ["hasValidPassport"], label: "Do you have a valid passport?", required: true, kind: "yesno",
    hint: "Your passport should have at least 6 months validity from your travel date.",
    onPick: (v) => (v === "no" ? { passportNumber: "" } : {}),
    note: (f) => (f.hasValidPassport === "no" ? { tone: "amber", text: "You'll need a valid passport (at least 6 months validity from your travel date) before your visa appointment. Our team will contact you." } : null) },
  { id: "passportNumberAfter", explain: { why: "The number goes on the form and the reservations.", usedFor: "Application form, reservations", sharedWith: "The consulate only" }, ask: "What's your passport number?", pose: "passport", step: "passport", keys: ["passportNumber"], label: "Passport Number", required: true, kind: "text", placeholder: "e.g. A1234567", applies: (f) => f.hasValidPassport !== "no",
    text: { caps: "characters", upper: true } },
  // ---- Spouse Information, only when married and the spouse travels ----
  { id: "spouseName", explain: { why: "Your spouse gets their own application in the same file.", usedFor: "Spouse's application form", sharedWith: "The consulate only" }, ask: "Who's the spouse travelling with you?", pose: "writing", step: "spouse", keys: ["spouseFirstName", "spouseLastName"], label: "Spouse Name", required: true, kind: "pair", hint: "As on your spouse's passport.",
    fields: [{ key: "spouseFirstName", label: "Spouse First Name", placeholder: "Enter first name" }, { key: "spouseLastName", label: "Spouse Last Name", placeholder: "Enter last name" }] },
  { id: "spouseHasValidPassport", explain: { why: "Their passport must be valid too. A No never blocks.", usedFor: "Document check", sharedWith: "The EZvisa team and the consulate" }, view: {"layout": "tiles", "labels": {"no": "No, add later"}}, ask: "Does your spouse have a valid passport?", pose: "companion", step: "spouse", keys: ["spouseHasValidPassport"], label: "Does your spouse have a valid passport?", required: true, kind: "yesno",
    hint: "Your spouse's passport should have at least 6 months validity from your travel date.",
    note: (f) => (f.spouseHasValidPassport === "no" ? { tone: "amber", text: "Your spouse will need to obtain a valid passport before applying for a visa." } : null) },
  // ---- Employment ----
  { id: "employmentStatus", explain: { why: "The consulate wants to see you have a reason to come back. An employer letter and a salary that matches your bank statement do that.", usedFor: "Cover letter, NOC request", sharedWith: "The consulate only" }, view: {"layout": "grid", "labels": {"business": "Business owner", "unemployed": "Not working"}, "subs": {"employed": "Salary certificate, NOC", "business": "Trade licence, no NOC", "freelancer": "Permit, no NOC", "student": "Enrolment letter", "unemployed": "Sponsor's documents", "retired": "Pension statement"}, "icons": {"employed": "briefcase.fill", "business": "building.2.fill", "freelancer": "laptopcomputer", "student": "graduationcap.fill", "unemployed": "person.fill", "retired": "leaf.fill"}}, ask: "What do you do for work?", pose: "documents", step: "employment", keys: ["employmentStatus"], label: "Employment Status", required: true, kind: "choice", options: EMPLOYMENT,
    onPick: (v) => (v !== "employed" ? { hasNOC: "" } : {}) },
  // Employed: Job Title + Company Name on one screen. Business owner / freelancer: company name only.
  { id: "jobCompany", explain: { why: "Your job and employer go on the form and the NOC.", usedFor: "Application form, NOC request", sharedWith: "The consulate only" }, ask: "Where do you work?", pose: "writing", step: "employment", keys: ["jobTitle", "companyName"], label: "Job Title & Company", required: true, kind: "pair", applies: EMP,
    fields: [{ key: "jobTitle", label: "Job Title", placeholder: "Enter job title", contentType: "jobTitle" }, { key: "companyName", label: "Company Name", placeholder: "Enter company name", contentType: "organizationName" }] },
  { id: "companyName", explain: { why: "Your business shows ties to the UAE. A trade licence works like an employer letter.", usedFor: "Application form, cover letter", sharedWith: "The consulate only" }, ask: "What's your business called?", pose: "writing", step: "employment", keys: ["companyName"], label: "Company Name", required: true, kind: "text", placeholder: "Enter company name", applies: BIZ, text: { caps: "words", contentType: "organizationName" } },
  { id: "employmentStartDate", explain: { why: "Time in your job shows stable ties to the UAE.", usedFor: "Application form", sharedWith: "The consulate only" }, ask: "When did you start there?", pose: "calendar", step: "employment", keys: ["employmentStartDate"], label: "Employment Start Date", required: true, kind: "date", placeholder: "Select start date", applies: EMP, max: todayIso, dateStyle: "wheel" },
  { id: "monthlySalary", explain: { why: "Your salary should match your bank statement. A range is enough.", usedFor: "Cover letter", sharedWith: "The consulate only" }, view: {"layout": "chips", "labels": {"under-5000": "Under 5,000 AED", "5000-10000": "5,000 to 10,000", "10000-15000": "10,000 to 15,000", "15000-plus": "Over 15,000"}}, ask: "Monthly salary range?", pose: "wallet", step: "employment", keys: ["monthlySalary"], label: "Monthly Salary Range", required: true, kind: "choice", options: SALARY, applies: EMP },
  { id: "hasNOC", explain: { why: "A No Objection Certificate from your employer is on most document lists. Not yet is fine.", usedFor: "Document list", sharedWith: "The EZvisa team and the consulate" }, view: {"layout": "tiles", "labels": {"no": "Not yet"}, "subs": {"yes": "I'll ask you to upload it next.", "no": "Added to \"To get later\". I'll send a template for HR."}}, ask: "Do you have a No Objection Certificate?", pose: "documents", step: "employment", keys: ["hasNOC"], label: "Do you have a No Objection Certificate?", required: false, kind: "yesno", applies: EMP },
  { id: "averageMonthlyIncome", explain: { why: "Your income should match your bank statement.", usedFor: "Cover letter", sharedWith: "The consulate only" }, ask: "Average monthly income?", pose: "wallet", step: "employment", keys: ["averageMonthlyIncome"], label: "Average Monthly Income", required: true, kind: "text", placeholder: "e.g., 15,000 AED", applies: BIZ },
];
/** The question text Globi asks (English key; the screen translates it with t()). */
export const askOf = (q: Question, f: WizardForm) => (typeof q.ask === "function" ? q.ask(f) : q.ask);
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
  // The email is the account's (canvas: the account is created at Review & pay), so Contact asks the phone only.
  if (q.kind === "contact") return !!(f.phone.trim() || f.phoneLocal.trim());
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
  if (p === "q:passportNumber") p = "q:contact"; // the number moved after payment: resume at the next traveller question
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
    case "contact": return phoneDisplay(f.phone);
    case "pair": return (q.fields ?? []).map((x) => String(f[x.key] ?? "").trim()).filter(Boolean).join(q.id === "jobCompany" ? " · " : " ");
    case "countries": return f.additionalCountries.map((a) => `${t(a.country)} (${fmtDate(a.arrivalDate)} – ${fmtDate(a.departureDate)})`).join("\n");
    case "country": return v ? t(v) : "";
    default: return String(v ?? "");
  }
}

/** How many of the questions before payment are answered (canvas: "Three answers are saved."). */
export const answeredCount = (f: WizardForm) => activeQuestions(f).filter((q) => isAnswered(q, f)).length;
/** Where a draft stands before payment: question `i` of `n` (canvas: "Details 3 of 7"); Review counts as the end. */
export function draftPosition(f: WizardForm, page: string) {
  const qs = activeQuestions(f); const n = qs.length;
  const at = page.startsWith("q:") ? qs.findIndex((q) => q.id === page.slice(2)) : -1;
  return { i: at >= 0 ? at + 1 : n, n };
}
