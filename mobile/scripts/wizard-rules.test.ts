// Wizard rules: config order, conditions, dependent clearing, progress and country search.
// Run: node --import ./scripts/ts-hooks.mjs scripts/wizard-rules.test.ts   (from mobile/, Node 22.18+)
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyForm, applyTraveller, coerceResidence, validatePersonal, validatePassport, validateStep, UAE_NATIONALITIES, OTHER_NATIONALITY, SCHENGEN_VISA_REQUIRED, SCHENGEN, UAE_EMIRATES, RESIDENCE_COUNTRIES, type TravellerDetails, type WizardForm } from "../lib/wizard";
import { QUESTIONS, Q_BY_ID, REVIEW, activeQuestions, firstUnanswered, progressOf, normalizePage, setAccountEmail, setTravellers, partsOf, questionErrors } from "../lib/questions";
import { searchCountries } from "../lib/search";
import { WORLD } from "../lib/world";
import { AR } from "../lib/ar";

const form = (x: Partial<WizardForm> = {}): WizardForm => ({ ...emptyForm, ...x });
const ids = (f: WizardForm) => activeQuestions(f).map((q) => q.id);
const EMPLOYED = form({ employmentStatus: "employed", hasNOC: "yes" });

const postIds = (f: WizardForm) => activeQuestions(f, "post").map((q) => q.id);

test("before payment: the website's destination and traveller steps, in its order", () => {
  assert.deepEqual(ids(form()), [
    "destination", "nationality", "name", "contact", "travellingWith", "dateOfBirth", "cityOfResidence",
  ]);
  // After payment, passport validity comes before the number (only asked when the number is still missing).
  const post = postIds(form({ hasValidPassport: "yes" }));
  assert.ok(post.indexOf("hasValidPassport") < post.indexOf("passportDetails"));
  assert.ok(!post.includes("passportExpiry") && !post.includes("dateOfBirth"));
});

test("saved travellers: \"Who is travelling?\" opens the traveller step when signed in with saved travellers", () => {
  setAccountEmail("me@example.com"); setTravellers([{ id: "t1", relationship: "self", firstName: "A", lastName: "B" }]);
  try {
    assert.deepEqual(ids(form()).slice(0, 4), ["destination", "traveller", "nationality", "name"]);
    setTravellers([]);
    assert.ok(!ids(form()).includes("traveller"), "no saved travellers: no question");
  } finally { setAccountEmail(null); setTravellers([]); }
});

/** Where the wizard goes after a saved traveller is applied: the first required question still open, or Review. */
const afterTraveller = (t: TravellerDetails, extra: Partial<WizardForm> = {}) => {
  const f = applyTraveller(form({ destination: "France", maritalStatus: "single", spouseAccompanying: "no", ...extra }), t);
  return firstUnanswered(f)?.id ?? REVIEW;
};
const FILLED: TravellerDetails = {
  firstName: "Amina", lastName: "Hassan", nationality: "India", passportNumber: "A1234567",
  dateOfBirth: "1990-01-01", cityOfResidence: "Dubai", phone: "+971501234567", phoneCountry: "AE", phoneLocal: "501234567",
};

test("saved traveller with no email or phone stops at the contact question", () => {
  const noPhone: TravellerDetails = {
    firstName: FILLED.firstName, lastName: FILLED.lastName, nationality: FILLED.nationality,
    passportNumber: FILLED.passportNumber, dateOfBirth: FILLED.dateOfBirth, cityOfResidence: FILLED.cityOfResidence,
  };
  assert.equal(afterTraveller(noPhone), "contact");
});

test("saved traveller with every field filled goes to Review", () => {
  assert.equal(afterTraveller(FILLED, { email: "amina@example.com" }), REVIEW);
});

test("trip questions follow the website order, ending with the residence visa", () => {
  const f = form({ previousRefusals: "yes", willVisitOtherCountries: "yes" });
  assert.deepEqual(activeQuestions(f, "post").filter((q) => q.step === "trip").map((q) => q.id), [
    "purposeOfTrip", "dates", "travelingWith", "hotelCategory", "funding", "visaHistory", "willVisitOtherCountries", "additionalCountries", "residenceVisaValid",
  ]);
  // Canvas merged screens: funding + balance, and first visa + refusals (+ details only after a "yes").
  assert.deepEqual(partsOf(Q_BY_ID.funding, f).map((q) => q.id), ["fundingSource", "balanceRange"]);
  assert.deepEqual(partsOf(Q_BY_ID.visaHistory, f).map((q) => q.id), ["isFirstSchengenVisa", "previousRefusals", "refusalDetails"]);
  assert.deepEqual(partsOf(Q_BY_ID.visaHistory, form({ previousRefusals: "no" })).map((q) => q.id), ["isFirstSchengenVisa", "previousRefusals"]);
});

test("group screens keep the contract's rules for each of their questions", () => {
  const g = Q_BY_ID.funding;
  assert.deepEqual(Object.keys(questionErrors(g, form())), ["fundingSource", "balanceRange"]);
  assert.deepEqual(questionErrors(g, form({ fundingSource: "self", balanceRange: "10000-25000" })), {});
  // A refusal needs its details; without a refusal the details are not asked.
  assert.equal(questionErrors(Q_BY_ID.visaHistory, form({ isFirstSchengenVisa: "yes", previousRefusals: "yes" })).refusalDetails, "Please add the refusal details");
  assert.deepEqual(questionErrors(Q_BY_ID.visaHistory, form({ isFirstSchengenVisa: "yes", previousRefusals: "no" })), {});
  // Passport expiry is optional, but when given it must cover the trip plus 3 months.
  const trip = { hasValidPassport: "yes" as const, passportNumber: "A1234567", travelStartDate: "2030-05-01", travelEndDate: "2030-05-10" };
  assert.deepEqual(questionErrors(Q_BY_ID.passportDetails, form(trip)), {});
  assert.equal(questionErrors(Q_BY_ID.passportDetails, form({ ...trip, passportExpiry: "2030-06-01" })).passportExpiry, "Passport must be valid at least 3 months after your return date");
  // Members are only asked inside their group.
  assert.ok(!activeQuestions(form({ hasValidPassport: "yes" }), "post").some((q) => q.memberOf));
});

test("after payment, the passport number is hidden for 'no', which clears it", () => {
  assert.ok(postIds(form()).includes("passportDetails"), "unanswered validity still asks for the number");
  assert.ok(!postIds(form({ hasValidPassport: "no" })).includes("passportDetails"));
  assert.ok(postIds(form({ hasValidPassport: "yes" })).includes("passportDetails"));
  assert.deepEqual(Q_BY_ID.hasValidPassport.onPick!("no", form({ hasValidPassport: "yes", passportNumber: "A1" })), { passportNumber: "" });
  assert.equal(validatePassport(form({ hasValidPassport: "no" })).passportNumber, undefined);
  assert.equal(validatePassport(form({ hasValidPassport: "yes" })).passportNumber, "Enter your passport number.");
  // Before payment the number is not asked or required, as on the website's traveller step (contract validatePersonal).
  assert.equal(validatePersonal(form()).passportNumber, undefined);
  assert.ok(!ids(form()).includes("passportNumber"));
});

test("nationality: UAE resident list, every named country visa-required, UAE itself excluded", () => {
  const q = Q_BY_ID.nationality;
  assert.equal(q.kind, "country");
  assert.deepEqual(q.names, UAE_NATIONALITIES);
  assert.ok(!UAE_NATIONALITIES.includes("United Arab Emirates"));
  for (const n of UAE_NATIONALITIES) {
    if (n === OTHER_NATIONALITY) continue;
    assert.ok(SCHENGEN_VISA_REQUIRED.includes(n), `${n} must need a Schengen visa`);
  }
  // The destination step validates it, with the website's message (visa-free passports are not offered there).
  assert.equal(validateStep("destination", form()).nationality, "Choose your nationality.");
  assert.equal(validateStep("destination", form({ nationality: "Nepal" })).nationality, undefined);
  assert.equal(validateStep("destination", form({ nationality: "India" })).nationality, undefined);
  assert.equal(validateStep("destination", form({ nationality: "United Arab Emirates" })).nationality, "Choose your nationality.");
});

test("residence is UAE only and fixed: never a screen, not counted", () => {
  assert.deepEqual(RESIDENCE_COUNTRIES, ["United Arab Emirates"]);
  assert.equal(Q_BY_ID.countryOfResidence, undefined);
  assert.ok(!ids(form()).includes("countryOfResidence"));
  assert.equal(coerceResidence(form({ countryOfResidence: "Saudi Arabia", cityOfResidence: "dubai" })).countryOfResidence, "United Arab Emirates");
  assert.equal(coerceResidence(form({ cityOfResidence: "dubai" })).cityOfResidence, "Dubai");
  assert.equal(normalizePage("q:countryOfResidence", form()), "q:cityOfResidence");
});

test("city = the 7 emirates, no flags", () => {
  const q = Q_BY_ID.cityOfResidence;
  assert.deepEqual(q.options!.map((o) => o.value), ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"]);
  assert.deepEqual(UAE_EMIRATES, q.options!.map((o) => o.value));
  assert.ok(!q.flags);
});

test("destination: the website's 29 Schengen countries in a searchable sheet", () => {
  assert.equal(Q_BY_ID.destination.kind, "country");
  assert.equal(SCHENGEN.length, 29);
  assert.deepEqual(Q_BY_ID.destination.names, SCHENGEN);
});

const employmentIds = (f: WizardForm) => activeQuestions(f, "post").filter((q) => q.step === "employment").map((q) => q.id);

test("self-employed applicants never see NOC", () => {
  for (const s of ["business", "freelancer", "student", "unemployed", "retired", ""] as const) {
    const f = form({ employmentStatus: s });
    assert.ok(!employmentIds(f).includes("hasNOC"), `NOC shown for ${s || "no status"}`);
    assert.ok(!postIds(f).includes("hasNOC"));
  }
  assert.ok(employmentIds(EMPLOYED).includes("hasNOC"));
  assert.deepEqual(employmentIds(form({ employmentStatus: "business" })), ["employmentStatus", "business"]);
  assert.deepEqual(employmentIds(EMPLOYED), ["employmentStatus", "work", "hasNOC"]);
});

test("changing employment after NOC was answered removes the NOC answer", () => {
  for (const s of ["business", "freelancer", "student"]) assert.equal(Q_BY_ID.employmentStatus.onPick!(s, EMPLOYED).hasNOC, "");
  assert.equal(Q_BY_ID.employmentStatus.onPick!("employed", EMPLOYED).hasNOC, undefined, "staying employed keeps it");
});

test("going back keeps answers: navigation never changes the form", () => {
  const f = form({ destination: "France", nationality: "India", hasValidPassport: "yes", passportNumber: "A1" });
  const before = JSON.stringify(f);
  activeQuestions(f); progressOf(f, "q:passportNumber"); normalizePage("q:nationality", f);
  assert.equal(JSON.stringify(f), before);
});

test("progress: destination, traveller, then review & pay", () => {
  const single = form({ spouseAccompanying: "no" });
  const married = form({ maritalStatus: "married", spouseAccompanying: "yes" });
  const ps = progressOf(single, "q:destination"), pm = progressOf(married, "q:destination");
  // Before payment the bar is the website's three steps. Spouse and trip are Continue application.
  assert.deepEqual(ps.steps, ["destination", "personal", "payment"]);
  assert.deepEqual(pm.steps, ["destination", "personal", "payment"]);
  assert.equal(ps.segs[0].count, 2);
  assert.equal(ps.segs[1].count, activeQuestions(single).filter((q) => q.step === "personal").length);
  assert.equal(ps.segs[1].count, 5); // name, contact, travelling with, date of birth, emirate (passport number is after payment)
  assert.equal(pm.segs[1].count, 5, "the spouse travelling adds no screen before payment");
  assert.equal(ps.segs[2].count, 1);
  assert.equal(ps.segs[0].fill, 0);
  const last = progressOf(single, "q:cityOfResidence");
  assert.equal(last.segs[1].index, 5); assert.ok(last.segs[1].fill < 1);
  assert.equal(progressOf(single, "review").segs[0].fill, 1);
  assert.equal(progressOf(single, "review").segs.at(-1)!.fill, 1);
});

test("old pages map to live ones", () => {
  assert.equal(normalizePage("q:nationalityOther", form()), "q:nationality");
  // Passport is after payment, so an old expiry page opens the first unanswered pre-payment question.
  assert.equal(normalizePage("q:passportExpiry", form({ hasValidPassport: "yes" })), "q:destination");
});

test("country search: partial words, accents, short names, Arabic", () => {
  assert.deepEqual(searchCountries(SCHENGEN, "ger"), ["Germany"]);
  assert.equal(searchCountries(SCHENGEN, "neth")[0], "Netherlands");
  assert.equal(searchCountries(SCHENGEN, "czechia")[0], "Czech Republic");
  assert.equal(searchCountries(SCHENGEN, "holland")[0], "Netherlands");
  assert.equal(searchCountries(SCHENGEN, "ألمانيا")[0], "Germany");
  assert.equal(searchCountries(SCHENGEN, "المانيا")[0], "Germany", "hamza-less spelling");
  assert.equal(searchCountries(SCHENGEN, "فرن")[0], "France", "Arabic prefix");
  const world = WORLD.map((w) => w.name);
  assert.equal(searchCountries(world, "rus fed")[0], "Russian Federation");
  assert.ok(searchCountries(world, "cote").includes("Côte d'Ivoire"));
  assert.equal(searchCountries(world, "uae")[0], "United Arab Emirates");
  assert.deepEqual(searchCountries(SCHENGEN, ""), SCHENGEN);
  assert.deepEqual(searchCountries(SCHENGEN, "zzz"), []);
});

test("every option has an Arabic label", () => {
  const names = [...SCHENGEN, ...UAE_NATIONALITIES, ...UAE_EMIRATES, ...QUESTIONS.flatMap((q) => q.options?.map((o) => o.label) ?? []), ...QUESTIONS.map((q) => q.label)];
  const missing = [...new Set(names)].filter((n) => !AR[n]);
  assert.deepEqual(missing, []);
});
