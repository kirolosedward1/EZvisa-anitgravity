// Wizard rules: config order, conditions, dependent clearing, progress and country search.
// Run: node --import ./scripts/ts-hooks.mjs scripts/wizard-rules.test.ts   (from mobile/, Node 22.18+)
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyForm, cleanForm, validatePersonal, NATIONALITY_OPTIONS, SCHENGEN_VISA_REQUIRED, SCHENGEN, UAE_EMIRATES, RESIDENCE_COUNTRIES, type WizardForm } from "../lib/wizard";
import { QUESTIONS, Q_BY_ID, activeQuestions, reviewQuestions, employmentQuestions, answer, progressOf, normalizePage } from "../lib/questions";
import { searchCountries } from "../lib/search";
import { WORLD } from "../lib/world";
import { AR } from "../lib/ar";

const form = (x: Partial<WizardForm> = {}): WizardForm => ({ ...emptyForm, ...x });
const ids = (f: WizardForm) => activeQuestions(f).map((q) => q.id);
const EMPLOYED = form({ employmentStatus: "employed", hasNOC: "yes" });

test("personal questions follow the website order; valid passport comes before passport number", () => {
  const f = form({ hasValidPassport: "yes", maritalStatus: "married" });
  assert.deepEqual(reviewQuestions(f).filter((q) => q.step === "personal").map((q) => q.id), [
    "destination", "nationality", "countryOfResidence", "cityOfResidence", "hasEmiratesId", "firstName", "lastName", "email", "phone",
    "dateOfBirth", "hasValidPassport", "passportNumber", "maritalStatus", "spouseAccompanying",
  ]);
  assert.ok(ids(f).indexOf("hasValidPassport") < ids(f).indexOf("passportNumber"));
});

test("trip questions follow the website order", () => {
  const f = form({ previousRefusals: "yes", willVisitOtherCountries: "yes" });
  assert.deepEqual(activeQuestions(f).filter((q) => q.step === "trip-details").map((q) => q.id), [
    "purposeOfTrip", "travelStartDate", "travelEndDate", "datesFlexible", "travelingWith", "hotelCategory", "fundingSource", "balanceRange",
    "isFirstSchengenVisa", "previousRefusals", "refusalDetails", "willVisitOtherCountries", "additionalCountries", "itinerary",
  ]);
});

test("passport number only after 'yes'; 'no' clears it and blocks", () => {
  assert.ok(!ids(form()).includes("passportNumber"));
  assert.ok(!ids(form({ hasValidPassport: "no" })).includes("passportNumber"));
  assert.ok(ids(form({ hasValidPassport: "yes" })).includes("passportNumber"));
  assert.deepEqual(answer(Q_BY_ID.hasValidPassport, "no", form({ hasValidPassport: "yes", passportNumber: "A1" })), { hasValidPassport: "no", passportNumber: "" });
  assert.ok(validatePersonal(form({ hasValidPassport: "no" })).hasValidPassport);
  assert.equal(Q_BY_ID.passportExpiry, undefined, "passport expiry was removed (owner decision)");
});

test("nationality: single choice from the website list minus UAE, all visa-required", () => {
  const q = Q_BY_ID.nationality;
  assert.equal(q.kind, "choice");
  assert.deepEqual(q.options!.map((o) => o.value), ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria", "Saudi Arabia", "Philippines", "Bangladesh"]);
  assert.ok(!NATIONALITY_OPTIONS.includes("United Arab Emirates"));
  for (const n of NATIONALITY_OPTIONS) assert.ok(SCHENGEN_VISA_REQUIRED.includes(n), `${n} must need a Schengen visa`);
  assert.equal(validatePersonal(form({ nationality: "Nepal" })).nationality, "Please select your nationality");
  assert.equal(validatePersonal(form({ nationality: "India" })).nationality, undefined);
  assert.equal(cleanForm(form({ nationality: "United Arab Emirates" })).nationality, "");
});

test("residence is UAE only and fixed: shown in review, never a screen, not counted", () => {
  assert.deepEqual(RESIDENCE_COUNTRIES, ["United Arab Emirates"]);
  assert.equal(Q_BY_ID.countryOfResidence.kind, "fixed");
  assert.ok(!ids(form()).includes("countryOfResidence"));
  assert.ok(reviewQuestions(form()).some((q) => q.id === "countryOfResidence"));
  assert.equal(cleanForm(form({ countryOfResidence: "Saudi Arabia", cityOfResidence: "dubai" })).countryOfResidence, "United Arab Emirates");
  assert.equal(cleanForm(form({ cityOfResidence: "dubai" })).cityOfResidence, "Dubai");
  assert.equal(normalizePage("q:countryOfResidence", form()), "q:cityOfResidence");
});

test("city = the 7 emirates, no flags", () => {
  const q = Q_BY_ID.cityOfResidence;
  assert.deepEqual(q.options!.map((o) => o.value), ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"]);
  assert.deepEqual(UAE_EMIRATES, q.options!.map((o) => o.value));
  assert.ok(!q.flags);
});

test("destination: the website's 29 Schengen countries in a searchable sheet", () => {
  assert.equal(Q_BY_ID.destination.kind, "sheet");
  assert.equal(SCHENGEN.length, 29);
  assert.deepEqual(Q_BY_ID.destination.names, SCHENGEN);
});

test("self-employed applicants never see NOC", () => {
  for (const s of ["business", "freelancer", "student", "unemployed", "retired", ""] as const) {
    const f = form({ employmentStatus: s });
    assert.ok(!employmentQuestions(f).some((q) => q.id === "hasNOC"), `NOC shown for ${s || "no status"}`);
    assert.ok(!ids(f).includes("hasNOC"));
  }
  assert.ok(employmentQuestions(EMPLOYED).some((q) => q.id === "hasNOC"));
  assert.deepEqual(employmentQuestions(form({ employmentStatus: "business" })).map((q) => q.id), ["employmentStatus", "companyName", "averageMonthlyIncome"]);
});

test("changing employment after NOC was answered removes the NOC answer", () => {
  for (const s of ["business", "freelancer", "student"]) assert.equal(answer(Q_BY_ID.employmentStatus, s, EMPLOYED).hasNOC, "");
  assert.equal(answer(Q_BY_ID.employmentStatus, "employed", EMPLOYED).hasNOC, undefined, "staying employed keeps it");
  assert.equal(cleanForm(form({ employmentStatus: "freelancer", hasNOC: "yes" })).hasNOC, "");
});

test("going back keeps answers: navigation never changes the form", () => {
  const f = form({ destination: "France", nationality: "India", hasValidPassport: "yes", passportNumber: "A1" });
  const before = JSON.stringify(f);
  activeQuestions(f); progressOf(f, "q:passportNumber"); normalizePage("q:nationality", f);
  assert.equal(JSON.stringify(f), before);
});

test("progress counts only the screens that apply", () => {
  const single = form({ hasValidPassport: "no", maritalStatus: "single" });
  const married = form({ hasValidPassport: "yes", maritalStatus: "married", spouseAccompanying: "yes" });
  const ps = progressOf(single, "q:destination"), pm = progressOf(married, "q:destination");
  assert.deepEqual(ps.steps, ["personal", "trip-details", "payment"]);
  assert.deepEqual(pm.steps, ["personal", "spouse", "trip-details", "payment"]);
  // single: no passport number, no spouse question, no residence screen
  assert.equal(ps.segs[0].count, activeQuestions(single).filter((q) => q.step === "personal").length);
  assert.equal(ps.segs[0].count, 11);
  assert.equal(pm.segs[0].count, 13);
  assert.equal(pm.segs[1].count, 4);
  assert.equal(ps.segs[0].fill, 0);
  const last = progressOf(single, "q:maritalStatus");
  assert.equal(last.segs[0].index, 11); assert.ok(last.segs[0].fill < 1);
  assert.equal(progressOf(single, "q:purposeOfTrip").segs[0].fill, 1);
  assert.equal(progressOf(single, "review").segs.at(-1)!.fill, 1);
});

test("old pages map to live ones", () => {
  assert.equal(normalizePage("q:passportExpiry", form({ hasValidPassport: "yes" })), "q:passportNumber");
  assert.equal(normalizePage("q:nationalityOther", form()), "q:nationality");
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
  const names = [...SCHENGEN, ...NATIONALITY_OPTIONS, ...UAE_EMIRATES, ...QUESTIONS.flatMap((q) => q.options?.map((o) => o.label) ?? []), ...QUESTIONS.map((q) => q.label)];
  const missing = [...new Set(names)].filter((n) => !AR[n]);
  assert.deepEqual(missing, []);
});
