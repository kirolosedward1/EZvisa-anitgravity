// Wizard rules: config order, conditions, dependent clearing, progress and country search.
// Run: node --import ./scripts/ts-hooks.mjs scripts/wizard-rules.test.ts   (from mobile/, Node 22.18+)
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyForm, coerceResidence, validatePersonal, validatePassport, UAE_NATIONALITIES, OTHER_NATIONALITY, SCHENGEN_VISA_REQUIRED, SCHENGEN, UAE_EMIRATES, RESIDENCE_COUNTRIES, type WizardForm } from "../lib/wizard";
import { QUESTIONS, Q_BY_ID, activeQuestions, progressOf, normalizePage } from "../lib/questions";
import { searchCountries } from "../lib/search";
import { WORLD } from "../lib/world";
import { AR } from "../lib/ar";

const form = (x: Partial<WizardForm> = {}): WizardForm => ({ ...emptyForm, ...x });
const ids = (f: WizardForm) => activeQuestions(f).map((q) => q.id);
const EMPLOYED = form({ employmentStatus: "employed", hasNOC: "yes" });

const postIds = (f: WizardForm) => activeQuestions(f, "post").map((q) => q.id);

test("personal questions follow the website order; valid passport comes before passport number", () => {
  const f = form({ hasValidPassport: "yes", maritalStatus: "married" });
  assert.deepEqual(ids(f), [
    "destination", "nationality", "cityOfResidence", "name", "contact", "maritalStatus", "spouseAccompanying",
  ]);
  const post = postIds(f);
  assert.ok(post.indexOf("hasValidPassport") < post.indexOf("passportNumber"));
  assert.ok(post.indexOf("passportNumber") < post.indexOf("passportExpiry"));
});

test("trip questions follow the website order", () => {
  const f = form({ previousRefusals: "yes", willVisitOtherCountries: "yes" });
  assert.deepEqual(activeQuestions(f, "post").filter((q) => q.step === "trip-details").map((q) => q.id), [
    "purposeOfTrip", "dates", "travelingWith", "hotelCategory", "fundingSource", "balanceRange",
    "isFirstSchengenVisa", "previousRefusals", "refusalDetails", "willVisitOtherCountries", "additionalCountries",
  ]);
});

test("passport number is hidden for 'no', which clears the number and expiry", () => {
  assert.ok(postIds(form()).includes("passportNumber"), "unanswered validity still asks for the number");
  assert.ok(!postIds(form({ hasValidPassport: "no" })).includes("passportNumber"));
  assert.ok(!postIds(form({ hasValidPassport: "no" })).includes("passportExpiry"));
  assert.ok(postIds(form({ hasValidPassport: "yes" })).includes("passportNumber"));
  assert.ok(postIds(form({ hasValidPassport: "yes" })).includes("passportExpiry"));
  assert.deepEqual(Q_BY_ID.hasValidPassport.onPick!("no", form({ hasValidPassport: "yes", passportNumber: "A1" })), { passportNumber: "", passportExpiry: "" });
  assert.equal(validatePassport(form({ hasValidPassport: "no" })).hasValidPassport, undefined);
  assert.equal(validatePassport(form({ hasValidPassport: "no" })).passportNumber, undefined);
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
  assert.equal(validatePersonal(form()).nationality, "Please select your nationality");
  assert.equal(validatePersonal(form({ nationality: "Nepal" })).nationality, undefined);
  assert.equal(validatePersonal(form({ nationality: "India" })).nationality, undefined);
  assert.match(validatePersonal(form({ nationality: "United Arab Emirates" })).nationality ?? "", /don't need a Schengen visa/);
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
  assert.deepEqual(employmentIds(form({ employmentStatus: "business" })), ["employmentStatus", "companyName", "averageMonthlyIncome"]);
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

test("progress counts only the screens that apply", () => {
  const single = form({ hasValidPassport: "no", maritalStatus: "single" });
  const married = form({ hasValidPassport: "yes", maritalStatus: "married", spouseAccompanying: "yes" });
  const ps = progressOf(single, "q:destination"), pm = progressOf(married, "q:destination");
  // Before payment the bar is personal + payment. Spouse and trip are Continue application.
  assert.deepEqual(ps.steps, ["personal", "payment"]);
  assert.deepEqual(pm.steps, ["personal", "payment"]);
  assert.equal(ps.segs[0].count, activeQuestions(single).filter((q) => q.step === "personal").length);
  assert.equal(ps.segs[0].count, 6);
  assert.equal(pm.segs[0].count, 7);
  assert.equal(ps.segs[1].count, 1);
  assert.equal(ps.segs[0].fill, 0);
  const last = progressOf(single, "q:maritalStatus");
  assert.equal(last.segs[0].index, 6); assert.ok(last.segs[0].fill < 1);
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
