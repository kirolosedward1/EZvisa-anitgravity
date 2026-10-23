// Node-only checks: which questions are asked before payment (wizard) and which after (Continue application).
// Run: bun scripts/run-check.ts scripts/payment-split-check.ts
import { activeQuestions, normalizePage, setAccountEmail, firstInvalid, continueNeeded, continueQuestions } from "../lib/questions";
import { emptyForm, validatePersonal, postSteps, type WizardForm } from "../lib/wizard";
declare const process: any;

let fail = 0;
const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const ids = (f: WizardForm, phase: "pre" | "post") => activeQuestions(f, phase).map((q) => q.id);

setAccountEmail(null);
ok(JSON.stringify(ids(emptyForm, "pre")) === JSON.stringify(["destination", "nationality", "cityOfResidence", "name", "contact", "maritalStatus"]), "pre: destination, nationality, city, name, email+phone, marital status");
ok(ids({ ...emptyForm, maritalStatus: "married" }, "pre").at(-1) === "spouseAccompanying", "pre: married asks whether the spouse travels (price)");
ok(!ids(emptyForm, "pre").includes("countryOfResidence") && emptyForm.countryOfResidence === "United Arab Emirates", "residence is UAE without a screen");
const pre: WizardForm = { ...emptyForm, destination: "France", nationality: "India", cityOfResidence: "Dubai", firstName: "A", lastName: "B", email: "ab@example.com", phoneLocal: "501234567", phone: "+971501234567", maritalStatus: "single" };
ok(Object.keys(validatePersonal(pre)).length === 0 && !firstInvalid(pre), "pre: complete without dates, passport, date of birth, trip or employment");
setAccountEmail("me@example.com");
ok(ids(emptyForm, "pre").includes("contact"), "signed in: the contact screen stays (phone only)");
setAccountEmail(null);

const post = ids({ ...emptyForm, hasValidPassport: "yes", employmentStatus: "employed", previousRefusals: "yes", willVisitOtherCountries: "yes" }, "post");
for (const id of ["purposeOfTrip", "travelStartDate", "travelEndDate", "travelingWith", "hotelCategory", "residenceVisaValid", "dateOfBirth", "hasValidPassport", "passportNumber", "passportExpiry", "employmentStatus", "jobCompany", "refusalDetails", "additionalCountries"])
  ok(post.includes(id), `post: asks ${id}`);
ok(!post.includes("itinerary") && !post.includes("spouseOccupation") && !post.includes("hasEmiratesId"), "removed: itinerary, spouse occupation, Emirates ID");
ok(!postSteps({ ...emptyForm }).includes("spouse") && postSteps({ ...emptyForm, maritalStatus: "married", spouseAccompanying: "yes" }).includes("spouse"), "post: spouse questions only when the spouse travels");
ok(!ids({ ...emptyForm, hasEmiratesId: "yes" }, "post").includes("residenceVisaValid"), "website rows that answered Emirates ID are not asked the residence question");
ok(continueNeeded(pre, false), "after paying, the trip/passport/employment answers are still missing");
ok(normalizePage("q:firstName", emptyForm) === "q:name" && normalizePage("q:phone", emptyForm) === "q:contact", "old drafts resume on the merged screens");
ok(normalizePage("q:travelStartDate", pre) === "review", "an old draft on a moved question goes to Review when the pre-payment part is done");
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
