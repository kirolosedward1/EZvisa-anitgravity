// Node-only checks: which questions are asked before payment (wizard) and which after (Continue application).
// The split and the rules are the website's (contract 2026-10-24.x): destination -> who is travelling -> pay, then
// trip -> passport (if missing) -> spouse (if travelling) -> employment.
// Run: bun scripts/run-check.ts scripts/payment-split-check.ts
import { activeQuestions, normalizePage, setAccountEmail, firstInvalid, continueNeeded, Q_BY_ID } from "../lib/questions";
import { emptyForm, validatePersonal, validateStep, detailSteps, priceAed, PRICE_AED, type WizardForm } from "../lib/wizard";
declare const process: any;

let fail = 0;
const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const ids = (f: WizardForm, phase: "pre" | "post") => activeQuestions(f, phase).map((q) => q.id);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

setAccountEmail(null);
ok(same(ids(emptyForm, "pre"), ["destination", "nationality", "name", "passportNumber", "contact", "travellingWith", "dateOfBirth", "cityOfResidence"]),
  "pre: the website's order (destination step, then who is travelling)");
ok(same([...new Set(activeQuestions(emptyForm, "pre").map((q) => q.step))], ["destination", "personal"]), "pre: two steps before Review & pay");
ok(!ids(emptyForm, "pre").includes("countryOfResidence") && emptyForm.countryOfResidence === "United Arab Emirates", "residence is UAE without a screen");

const pre: WizardForm = { ...emptyForm, destination: "France", nationality: "India", cityOfResidence: "Dubai", firstName: "A", lastName: "B",
  email: "ab@example.com", phoneLocal: "501234567", phone: "+971501234567", dateOfBirth: "1990-01-01", passportNumber: "N1234567", spouseAccompanying: "no" };
ok(Object.keys(validatePersonal(pre)).length === 0 && Object.keys(validateStep("destination", pre)).length === 0 && !firstInvalid(pre),
  "pre: complete without trip, spouse or employment answers");
ok(!!validatePersonal({ ...pre, passportNumber: "" }).passportNumber, "pre: passport number is required (website rule)");
ok(!!validatePersonal({ ...pre, cityOfResidence: "" }).cityOfResidence, "pre: the emirate is required");
ok(validatePersonal({ ...pre, dateOfBirth: "2015-01-01" }).dateOfBirth === "The main applicant must be 18 or older.", "pre: 18+ with the website's message");

// "Travelling with": Just me / With my spouse sets the marital status and the price, as on the website.
const tw = Q_BY_ID.travellingWith;
ok(same(tw.onPick!("yes", pre), { maritalStatus: "married", travelingWith: "spouse" }), "With my spouse: married + travelling with spouse");
ok(same(tw.onPick!("no", { ...pre, travelingWith: "spouse" }), { maritalStatus: "single", travelingWith: "alone" }), "Just me: single, and no longer with spouse");
ok(priceAed("yes") === PRICE_AED * 2 && priceAed(undefined, "spouse") === PRICE_AED * 2 && priceAed("no") === PRICE_AED, "price: two applicants when either answer says spouse");

setAccountEmail("me@example.com");
ok(ids(emptyForm, "pre").includes("contact"), "signed in: the contact screen stays (phone only)");
setAccountEmail(null);

const post = ids({ ...emptyForm, hasValidPassport: "yes", employmentStatus: "employed", previousRefusals: "yes", willVisitOtherCountries: "yes" }, "post");
for (const id of ["purposeOfTrip", "dates", "travelingWith", "hotelCategory", "refusalDetails", "additionalCountries", "residenceVisaValid", "passportNumberAfter", "employmentStatus", "jobCompany"])
  ok(post.includes(id), `post: asks ${id}`);
ok(post.indexOf("residenceVisaValid") > post.indexOf("additionalCountries") && post.indexOf("residenceVisaValid") < post.indexOf("hasValidPassport"),
  "post: the residence visa question ends the trip step, as on the website");
ok(!post.includes("dateOfBirth") && !post.includes("passportExpiry") && !post.includes("itinerary") && !post.includes("hasEmiratesId"),
  "post: no date of birth (asked before payment), passport expiry, itinerary or Emirates ID");
ok(!ids({ ...emptyForm }, "post").some((id) => id.startsWith("spouse")) && ids({ ...emptyForm, maritalStatus: "married", spouseAccompanying: "yes" }, "post").includes("spouseName"),
  "post: spouse questions only when the spouse travels");
ok(!ids({ ...emptyForm, hasEmiratesId: "yes" }, "post").includes("residenceVisaValid"), "website rows that answered Emirates ID are not asked the residence question");
ok(same(detailSteps(pre), ["trip", "employment"]), "detailSteps after paying: trip and employment (passport number already given)");
ok(continueNeeded(pre, false) && continueNeeded(pre, true), "after paying, Continue is needed for app and website rows alike");

ok(normalizePage("q:firstName", emptyForm) === "q:name" && normalizePage("q:phone", emptyForm) === "q:contact", "old drafts resume on the merged screens");
ok(normalizePage("q:maritalStatus", emptyForm) === "q:travellingWith", "old drafts on marital status resume on Travelling with");
ok(normalizePage("q:travelStartDate", pre) === "review", "an old draft on a moved question goes to Review when the pre-payment part is done");
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
