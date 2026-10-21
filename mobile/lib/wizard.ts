// Mirrors the website wizard (ezvisa.net/apply, web repo lib/wizard-steps.ts + components/apply/*):
// same step slugs, order, fields, options and validation rules.

export type WizardStep = "personal" | "spouse" | "employment" | "trip-details" | "payment";
export type YesNo = "yes" | "no" | "";

export type WizardForm = {
  // personal
  destination: string; nationality: string; countryOfResidence: string; cityOfResidence: string; hasEmiratesId: YesNo;
  firstName: string; lastName: string; email: string; phone: string; phoneCountry: string; phoneLocal: string; whatsappOptIn: boolean;
  dateOfBirth: string; passportNumber: string; passportExpiry: string; hasValidPassport: YesNo;
  maritalStatus: "" | "single" | "married" | "divorced" | "widowed"; spouseAccompanying: YesNo;
  // spouse
  spouseFirstName: string; spouseLastName: string; spouseHasValidPassport: YesNo; spouseOccupation: string;
  // employment
  employmentStatus: "" | "employed" | "business" | "freelancer" | "student" | "unemployed" | "retired";
  jobTitle: string; companyName: string; employmentStartDate: string; monthlySalary: string; hasNOC: YesNo; averageMonthlyIncome: string;
  // trip details
  purposeOfTrip: string; travelStartDate: string; travelEndDate: string; datesFlexible: YesNo;
  travelingWith: string; hotelCategory: string; fundingSource: string; balanceRange: string;
  isFirstSchengenVisa: YesNo; previousRefusals: YesNo; refusalDetails: string;
  willVisitOtherCountries: YesNo; additionalCountries: { country: string; arrivalDate: string; departureDate: string }[]; itinerary: string;
};

export const emptyForm: WizardForm = {
  destination: "", nationality: "", countryOfResidence: "United Arab Emirates", cityOfResidence: "", hasEmiratesId: "",
  firstName: "", lastName: "", email: "", phone: "", phoneCountry: "AE", phoneLocal: "", whatsappOptIn: true,
  dateOfBirth: "", passportNumber: "", passportExpiry: "", hasValidPassport: "", maritalStatus: "", spouseAccompanying: "",
  spouseFirstName: "", spouseLastName: "", spouseHasValidPassport: "", spouseOccupation: "",
  employmentStatus: "", jobTitle: "", companyName: "", employmentStartDate: "", monthlySalary: "", hasNOC: "", averageMonthlyIncome: "",
  purposeOfTrip: "", travelStartDate: "", travelEndDate: "", datesFlexible: "", travelingWith: "", hotelCategory: "", fundingSource: "", balanceRange: "",
  isFirstSchengenVisa: "", previousRefusals: "", refusalDetails: "", willVisitOtherCountries: "", additionalCountries: [], itinerary: "",
};

type Opt = { value: string; label: string };
export const SCHENGEN = ["Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland"];
export const NATIONALITIES = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria", "United Arab Emirates", "Saudi Arabia", "Philippines", "Bangladesh"];
/** Largest UAE expat nationalities that need a Schengen visa (visa-exempt passports such as UAE, UK, US are left out). "Other" opens a free-text field. */
// Nationals who NEED a Schengen short-stay visa: Regulation (EU) 2018/1806, Annex I (1. States + 2. the Palestinian Authority),
// consolidated version 02018R1806-20251230 (in force 30.12.2025, last amended by Reg. (EU) 2025/2441).
// Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02018R1806-20251230 (checked 2026-10-19).
// Names follow lib/world.ts (e.g. "DR Congo", "Cabo Verde", "Gambia", "Myanmar", "Russian Federation", "Sao Tome and Principe").
// Annex II (visa-exempt, e.g. UAE, UK, US, Canada, Japan, Australia, Brazil) and EU/EEA/Swiss nationals are deliberately absent.
export const SCHENGEN_VISA_REQUIRED: string[] = ["Afghanistan", "Algeria", "Angola", "Armenia", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belize", "Benin", "Bhutan", "Bolivia", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Central African Republic", "Chad", "China", "Comoros", "Congo", "Cuba", "Côte d'Ivoire", "DR Congo", "Djibouti", "Dominican Republic", "Ecuador", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Fiji", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "India", "Indonesia", "Iran", "Iraq", "Jamaica", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Maldives", "Mali", "Mauritania", "Mongolia", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Niger", "Nigeria", "North Korea", "Oman", "Pakistan", "Palestine", "Papua New Guinea", "Philippines", "Qatar", "Russian Federation", "Rwanda", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sri Lanka", "Sudan", "Suriname", "Syria", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Uzbekistan", "Vanuatu", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];
export const needsSchengenVisa = (n?: string | null) => !!n && SCHENGEN_VISA_REQUIRED.includes(n);
export const OTHER_NATIONALITY = "Other nationality";
/** Top UAE resident nationalities (all in Annex I), then "Other nationality" which opens the full visa-required list. */
export const UAE_NATIONALITIES: string[] = ["India", "Pakistan", "Bangladesh", "Philippines", "Egypt", "Nepal", "Sri Lanka", "China", "Jordan", "Lebanon", "Syria", "Palestine", "Sudan", "Iran", "Iraq", "Yemen", "Afghanistan", "Morocco", "Tunisia", "Algeria", "Nigeria", "Kenya", "Ethiopia", "Uganda", "Ghana", "Cameroon", "South Africa", "Indonesia", "Vietnam", "Thailand", "Russian Federation", "Turkey", "Kazakhstan", "Uzbekistan", "Azerbaijan", OTHER_NATIONALITY];
/** Countries of residence offered in the wizard. UAE only for now; add names (as in lib/world.ts) to re-enable others. */
export const RESIDENCE_COUNTRIES: string[] = ["United Arab Emirates"];
export const DEFAULT_RESIDENCE = RESIDENCE_COUNTRIES[0];
/** City of residence = one of the 7 UAE emirates (stored as the English name). */
export const UAE_EMIRATES: string[] = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
export const EMIRATE_OPTIONS = UAE_EMIRATES.map((e) => ({ value: e, label: e }));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
export const matchEmirate = (v?: string | null) => (v ? UAE_EMIRATES.find((e) => norm(e) === norm(v)) ?? "" : "");
/** Coerce residence fields (old drafts, deep links) to the allowed values. */
export function coerceResidence<T extends { countryOfResidence: string; cityOfResidence: string; hasEmiratesId: YesNo }>(f: T): T {
  const country = RESIDENCE_COUNTRIES.includes(f.countryOfResidence) ? f.countryOfResidence : DEFAULT_RESIDENCE;
  const city = country === "United Arab Emirates" ? matchEmirate(f.cityOfResidence) : f.cityOfResidence;
  return { ...f, countryOfResidence: country, cityOfResidence: city, hasEmiratesId: country === "United Arab Emirates" ? f.hasEmiratesId : "" };
}
export const RESIDENCES = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Egypt", "Jordan"];
export const MARITAL: Opt[] = [{ value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" }, { value: "widowed", label: "Widowed" }];
export const EMPLOYMENT: Opt[] = [{ value: "employed", label: "Employed" }, { value: "business", label: "Business Owner" }, { value: "freelancer", label: "Freelancer" }, { value: "student", label: "Student" }, { value: "unemployed", label: "Unemployed" }, { value: "retired", label: "Retired" }];
export const SALARY: Opt[] = [{ value: "under-5000", label: "Under 5,000 AED" }, { value: "5000-10000", label: "5,000 - 10,000 AED" }, { value: "10000-15000", label: "10,000 - 15,000 AED" }, { value: "15000-plus", label: "15,000+ AED" }];
export const PURPOSES: Opt[] = [{ value: "tourism", label: "Tourism" }, { value: "business", label: "Business" }, { value: "family", label: "Family Visit" }, { value: "medical", label: "Medical Treatment" }, { value: "education", label: "Education/Training" }, { value: "other", label: "Other" }];
export const COMPANIONS: Opt[] = [{ value: "alone", label: "Traveling Alone" }, { value: "spouse", label: "With Spouse" }, { value: "family", label: "With Family" }, { value: "friends", label: "With Friends" }, { value: "group", label: "With Tour Group" }];
export const FUNDING: Opt[] = [{ value: "self", label: "Self-funded (Personal savings)" }, { value: "sponsor", label: "Sponsored (By family/friend)" }, { value: "company", label: "Sponsored (By employer/company)" }];
export const BALANCE: Opt[] = [{ value: "under-10000", label: "Under 10,000 AED" }, { value: "10000-25000", label: "10,000 - 25,000 AED" }, { value: "25000-50000", label: "25,000 - 50,000 AED" }, { value: "50000-plus", label: "50,000+ AED" }];
export const HOTELS: Opt[] = [{ value: "3-star", label: "3-Star Hotel / Mid-range" }, { value: "4-star", label: "4-Star Hotel / Premium" }, { value: "5-star", label: "5-Star Hotel / Luxury" }, { value: "sponsor", label: "Staying with Host (Sponsor Home)" }];
export const label = (opts: Opt[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

export const STEP_TITLES: Record<WizardStep, { title: string; description: string }> = {
  personal: { title: "Personal Information", description: "Profile & contact details" },
  spouse: { title: "Spouse Information", description: "Spouse details" },
  employment: { title: "Employment", description: "Work & income details" },
  "trip-details": { title: "Trip Details", description: "Travel intent & preferences" },
  payment: { title: "Review & Payment", description: "Confirm & complete payment" },
};
export const showSpouse = (f: WizardForm) => f.maritalStatus === "married" && f.spouseAccompanying === "yes";
/** Visible steps, exactly like the web (spouse only when married and the spouse travels). */
// Employment is asked AFTER payment in the app (app/continue/[id].tsx), so it is not a wizard step any more.
export const visibleSteps = (f: WizardForm): WizardStep[] => (showSpouse(f) ? ["personal", "spouse", "trip-details", "payment"] : ["personal", "trip-details", "payment"]);
/** Employment answers complete (website rules, validateEmployment). */
export const employmentComplete = (f: Partial<WizardForm>) => Object.keys(validateEmployment({ ...emptyForm, ...f } as WizardForm)).length === 0;
/** URL step slug -> step; "documents" is the web's legacy alias for payment; unknown -> personal. */
export function parseStep(s?: string): WizardStep {
  if (s === "documents") return "payment";
  if (s === "employment") return "trip-details"; // asked after payment now
  return (["personal", "spouse", "employment", "trip-details", "payment"] as string[]).includes(s ?? "") ? (s as WizardStep) : "personal";
}

// ---- validation (same rules as the web components) ----
export function isValidEmail(email: string) {
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return false;
  const [local, domain] = email.split("@");
  if (!local || local.length < 2 || !domain?.includes(".")) return false;
  return !["gmial.com", "yahooo.com", "hotmial.com", "gmai.com"].includes(domain.toLowerCase());
}
export function isValidPhone(phone: string) {
  const d = phone.trim().replace(/[^\d]/g, "");
  if (d.length < 7 || d.length > 15) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  if (d.length >= 8 && d.split("").every((x, i, a) => i === 0 || Number(x) === Number(a[i - 1]) + 1)) return false;
  return true;
}
const day = 864e5;
const today = () => { const t = new Date(); t.setHours(12, 0, 0, 0); return t; };
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const adultMax = () => { const t = today(); t.setFullYear(t.getFullYear() - 18); return t; };
export const earliestDeparture = () => new Date(today().getTime() + 15 * day);
/** Passport expiry >= return date + 3 months (or today + 3 months while the return date is unknown). */
export function passportCoversTrip(f: { passportExpiry: string; travelEndDate: string }) {
  if (!f.passportExpiry) return true;
  const base = f.travelEndDate ? new Date(f.travelEndDate + "T00:00:00") : new Date();
  const need = new Date(base.getFullYear(), base.getMonth() + 3, base.getDate());
  return new Date(f.passportExpiry + "T00:00:00").getTime() >= need.getTime();
}
export const tripDays = (f: WizardForm) => (f.travelStartDate && f.travelEndDate ? Math.ceil((Date.parse(f.travelEndDate) - Date.parse(f.travelStartDate)) / day) : 0);

export type Errors = Partial<Record<keyof WizardForm, string>>;
export function validatePersonal(f: WizardForm): Errors {
  const e: Errors = {};
  if (!f.destination) e.destination = "Please select a destination";
  if (!needsSchengenVisa(f.nationality)) e.nationality = "Please select your nationality";
  if (!RESIDENCE_COUNTRIES.includes(f.countryOfResidence)) e.countryOfResidence = "Please select your country of residence";
  if (!f.cityOfResidence.trim()) e.cityOfResidence = "City is required";
  else if (f.countryOfResidence === "United Arab Emirates" && !UAE_EMIRATES.includes(f.cityOfResidence)) e.cityOfResidence = "Please select your emirate";
  if (f.countryOfResidence === "United Arab Emirates" && !f.hasEmiratesId) e.hasEmiratesId = "Please choose Yes or No";
  if (!f.firstName.trim()) e.firstName = "First name is required";
  if (!f.lastName.trim()) e.lastName = "Last name is required";
  if (!f.email.trim()) e.email = "Email is required"; else if (!isValidEmail(f.email.trim())) e.email = "Please enter a valid email address. Check for typos in the domain.";
  if (!f.phoneLocal.trim() && !f.phone.trim()) e.phone = "Phone number is required"; else if (!isValidPhone(f.phone)) e.phone = "Please enter a valid phone number (7-15 digits).";
  if (!f.dateOfBirth) e.dateOfBirth = "Please select your date of birth (must be 18+)"; else if (Date.parse(f.dateOfBirth) > adultMax().getTime()) e.dateOfBirth = "You must be 18 or older";
  if (!f.hasValidPassport) e.hasValidPassport = "Please choose Yes or No";
  else if (f.hasValidPassport === "no") e.hasValidPassport = "You need a valid passport (at least 6 months validity from your travel date) before applying.";
  else {
    if (!f.passportNumber.trim()) e.passportNumber = "Passport number is required";
    // App-only field (kept in the wizard notes JSON; no DB column): valid >= 3 months after the return date.
    if (!f.passportExpiry) e.passportExpiry = "Please select your passport expiry date";
    else if (!passportCoversTrip(f)) e.passportExpiry = "Passport must be valid at least 3 months after your return date";
  }
  if (!f.maritalStatus) e.maritalStatus = "Please select your marital status";
  if (f.maritalStatus === "married" && !f.spouseAccompanying) e.spouseAccompanying = "Please choose Yes or No";
  return e;
}
export function validateSpouse(f: WizardForm): Errors {
  const e: Errors = {};
  if (!f.spouseFirstName.trim()) e.spouseFirstName = "First name is required";
  if (!f.spouseLastName.trim()) e.spouseLastName = "Last name is required";
  if (!f.spouseHasValidPassport) e.spouseHasValidPassport = "Please choose Yes or No";
  return e;
}
export function validateEmployment(f: WizardForm): Errors {
  const e: Errors = {};
  if (!f.employmentStatus) e.employmentStatus = "Please select your employment status";
  if (f.employmentStatus === "employed") {
    if (!f.jobTitle.trim()) e.jobTitle = "Job title is required";
    if (!f.companyName.trim()) e.companyName = "Company name is required";
    if (!f.employmentStartDate) e.employmentStartDate = "Start date is required";
    if (!f.monthlySalary) e.monthlySalary = "Please select a salary range";
  }
  if (f.employmentStatus === "business" || f.employmentStatus === "freelancer") {
    if (!f.companyName.trim()) e.companyName = "Company name is required";
    if (!f.averageMonthlyIncome.trim()) e.averageMonthlyIncome = "Average monthly income is required";
  }
  return e;
}
export function validateTrip(f: WizardForm): Errors {
  const e: Errors = {};
  if (!f.purposeOfTrip) e.purposeOfTrip = "Please select the purpose of your trip";
  if (!f.travelStartDate) e.travelStartDate = "Please select a departure date";
  else if (Date.parse(f.travelStartDate) < earliestDeparture().getTime() - day / 2) e.travelStartDate = "Departure must be at least 15 days from today";
  if (!f.travelEndDate) e.travelEndDate = "Please select a return date";
  else if (f.travelStartDate && tripDays(f) <= 0) e.travelEndDate = "Return date must be after departure date";
  else if (tripDays(f) > 90) e.travelEndDate = "Schengen visits are limited to 90 days";
  else if (f.passportExpiry && !passportCoversTrip(f)) e.travelEndDate = "Passport must be valid at least 3 months after your return date";
  if (!f.datesFlexible) e.datesFlexible = "Please choose Yes or No";
  if (!f.travelingWith) e.travelingWith = "Please select who you are traveling with";
  if (!f.hotelCategory) e.hotelCategory = "Please select an accommodation preference";
  if (!f.fundingSource) e.fundingSource = "Please select a funding source";
  if (!f.balanceRange) e.balanceRange = "Please select a balance range";
  if (!f.isFirstSchengenVisa) e.isFirstSchengenVisa = "Please choose Yes or No";
  if (!f.previousRefusals) e.previousRefusals = "Please choose Yes or No";
  if (f.previousRefusals === "yes" && !f.refusalDetails.trim()) e.refusalDetails = "Please add the refusal details";
  return e;
}
export const validateStep = (s: WizardStep, f: WizardForm): Errors =>
  s === "personal" ? validatePersonal(f) : s === "spouse" ? validateSpouse(f) : s === "employment" ? validateEmployment(f) : s === "trip-details" ? validateTrip(f) : {};
/** First visible step that is still incomplete, or null when everything is valid. */
export const firstIncomplete = (f: WizardForm): WizardStep | null => visibleSteps(f).find((s) => s !== "payment" && Object.keys(validateStep(s, f)).length > 0) ?? null;

/** Accept a country by exact name, case-insensitive name or slug (e.g. "egypt", "czech-republic"). */
export function matchCountry(raw: string | undefined, list: string[]): string | null {
  if (!raw) return null;
  const t = decodeURIComponent(raw).trim().toLowerCase().replace(/[-_+]+/g, " ");
  if (!t) return null;
  const alias: Record<string, string> = { russia: "Russian Federation", uae: "United Arab Emirates", czechia: "Czech Republic", ksa: "Saudi Arabia" };
  const hit = list.find((n) => n.toLowerCase() === t) ?? (alias[t] && list.includes(alias[t]) ? alias[t] : undefined);
  return hit ?? null;
}

/** True when the user has typed or picked anything (used for autosave/resume). */
export const hasAnswers = (f: WizardForm) => (Object.keys(emptyForm) as (keyof WizardForm)[]).some((k) => k !== "email" && JSON.stringify(f[k]) !== JSON.stringify(emptyForm[k]));
