// Unit tests for the wizard's validation rules and date maths. Run: `npm test` (every case in 3 time zones).
// "today" is fixed so the results don't depend on when the suite runs.
// @ts-ignore node module in a node-only check
import { test } from "node:test";
// @ts-ignore node module in a node-only check
import assert from "node:assert/strict";
import { addDays, addMonths, daysBetween, dateLocaleTag, fromIso, isIsoDate, monthGrid, toIso, todayIso } from "../lib/dates";
import { presetEnd, PRESETS, tapDay } from "../lib/dateRange";
import { emptyForm, passportNeededUntil, tripDays, validatePersonal, validateTrip, latestBirthDate, earliestDepartureDate, type WizardForm } from "../lib/wizard";
import { normalizePage, questionErrors, Q_BY_ID } from "../lib/questions";

const TODAY = "2026-10-22";
const personal = (x: Partial<WizardForm> = {}): WizardForm => ({
  ...emptyForm, destination: "France", nationality: "India", countryOfResidence: "United Arab Emirates", cityOfResidence: "Dubai", hasEmiratesId: "yes",
  firstName: "Asha", lastName: "Rao", email: "asha.rao@example.com", phone: "+971501234567", phoneLocal: "501234567", dateOfBirth: "1990-05-01",
  hasValidPassport: "yes", passportNumber: "A1234567", passportExpiry: "2030-01-01", maritalStatus: "single", ...x,
});
const trip = (x: Partial<WizardForm> = {}): WizardForm => personal({
  purposeOfTrip: "tourism", travelStartDate: "2026-11-10", travelEndDate: "2026-11-17", datesFlexible: "no", travelingWith: "alone", hotelCategory: "4-star",
  fundingSource: "self", balanceRange: "25000-50000", isFirstSchengenVisa: "yes", previousRefusals: "no", ...x,
});
const P = (f: WizardForm) => validatePersonal(f, TODAY);
const Tr = (f: WizardForm) => validateTrip(f, TODAY);

test("valid forms have no errors", () => {
  assert.deepEqual(P(personal()), {});
  assert.deepEqual(Tr(trip()), {});
});

test("required fields", () => {
  for (const k of ["destination", "firstName", "lastName", "email", "dateOfBirth", "hasValidPassport", "maritalStatus"] as const)
    assert.ok(P(personal({ [k]: "" }))[k], `${k} required`);
  assert.ok(P(personal({ phone: "", phoneLocal: "" })).phone);
  for (const k of ["purposeOfTrip", "travelStartDate", "travelEndDate", "datesFlexible", "travelingWith", "hotelCategory", "fundingSource", "balanceRange", "isFirstSchengenVisa", "previousRefusals"] as const)
    assert.ok(Tr(trip({ [k]: "" }))[k], `${k} required`);
  assert.ok(Tr(trip({ previousRefusals: "yes", refusalDetails: " " })).refusalDetails);
});

test("passport number: required only, as on the website (no format rule)", () => {
  assert.equal(P(personal({ passportNumber: "" })).passportNumber, "Passport number is required");
  assert.equal(P(personal({ passportNumber: "   " })).passportNumber, "Passport number is required");
  for (const n of ["A1234567", "Z12345678", "P0123456A", "X"]) assert.equal(P(personal({ passportNumber: n })).passportNumber, undefined, n);
  assert.equal(P(personal({ hasValidPassport: "no", passportNumber: "" })).passportNumber, undefined); // not asked without a valid passport
});

test("departure: at least 15 days ahead (so never in the past)", () => {
  assert.equal(earliestDepartureDate(TODAY), "2026-11-06");
  assert.equal(Tr(trip({ travelStartDate: "2026-11-06", travelEndDate: "2026-11-10" })).travelStartDate, undefined);
  for (const d of ["2026-11-05", TODAY, "2026-10-21", "2025-12-01"])
    assert.equal(Tr(trip({ travelStartDate: d, travelEndDate: "2026-11-20" })).travelStartDate, "Departure must be at least 15 days from today", d);
});

test("return after departure; same-day trip rejected (web server: end <= start)", () => {
  assert.equal(Tr(trip({ travelStartDate: "2026-11-10", travelEndDate: "2026-11-10" })).travelEndDate, "Return date must be after departure date");
  assert.equal(Tr(trip({ travelStartDate: "2026-11-10", travelEndDate: "2026-11-09" })).travelEndDate, "Return date must be after departure date");
  assert.equal(Tr(trip({ travelStartDate: "2026-11-10", travelEndDate: "2026-11-11" })).travelEndDate, undefined);
});

test("90-day limit (web server: duration > 90 rejected)", () => {
  assert.equal(Tr(trip({ travelStartDate: "2026-11-10", travelEndDate: addDays("2026-11-10", 90) })).travelEndDate, undefined);
  assert.equal(Tr(trip({ travelStartDate: "2026-11-10", travelEndDate: addDays("2026-11-10", 91) })).travelEndDate, "Schengen visits are limited to 90 days");
});

test("not-a-date values are treated as missing", () => {
  assert.equal(Tr(trip({ travelStartDate: "2026-02-30" })).travelStartDate, "Please select a departure date");
  assert.equal(Tr(trip({ travelEndDate: "17/11/2026" })).travelEndDate, "Please select a return date");
});

test("passport expiry exactly 3 months after return is accepted; one day less is not", () => {
  const f = { travelStartDate: "2026-11-10", travelEndDate: "2026-11-17" };
  assert.equal(passportNeededUntil(f.travelEndDate), "2027-02-17");
  assert.deepEqual(P(personal({ ...f, passportExpiry: "2027-02-17" })), {});
  assert.deepEqual(Tr(trip({ ...f, passportExpiry: "2027-02-17" })), {});
  assert.equal(P(personal({ ...f, passportExpiry: "2027-02-16" })).passportExpiry, "Passport must be valid 3 months after return");
  assert.equal(Tr(trip({ ...f, passportExpiry: "2027-02-16" })).travelEndDate, "Passport must be valid 3 months after return");
});

test("passport expiry: end of month and leap years (clamped to the month's last day)", () => {
  // return 30 Nov 2026 -> needed 28 Feb 2027 (no 30 Feb; not 2 March)
  const a = { travelStartDate: "2026-11-20", travelEndDate: "2026-11-30" };
  assert.equal(passportNeededUntil(a.travelEndDate), "2027-02-28");
  assert.equal(Tr(trip({ ...a, passportExpiry: "2027-02-28" })).travelEndDate, undefined);
  assert.ok(Tr(trip({ ...a, passportExpiry: "2027-02-27" })).travelEndDate);
  // return 30 Nov 2027 -> needed 29 Feb 2028 (leap year)
  assert.equal(passportNeededUntil("2027-11-30"), "2028-02-29");
  assert.ok(P(personal({ travelEndDate: "2027-11-30", passportExpiry: "2028-02-28" })).passportExpiry);
  assert.equal(P(personal({ travelEndDate: "2027-11-30", passportExpiry: "2028-02-29" })).passportExpiry, undefined);
  // 31 Aug -> 30 Nov; 31 Dec -> 31 Mar (year rollover)
  assert.equal(passportNeededUntil("2026-08-31"), "2026-11-30");
  assert.equal(passportNeededUntil("2026-12-31"), "2027-03-31");
});

test("passport before trip dates are known: 3 months from today", () => {
  assert.equal(passportNeededUntil("", TODAY), "2027-01-22");
  assert.equal(P(personal({ passportExpiry: "2027-01-22" })).passportExpiry, undefined);
  assert.equal(P(personal({ passportExpiry: "2027-01-21" })).passportExpiry, "Passport must be valid for 3 more months");
});

test("changing the return date after the passport expiry re-checks the expiry", () => {
  const f = trip({ passportExpiry: "2027-03-01", travelStartDate: "2026-11-10", travelEndDate: "2026-11-24" });
  assert.deepEqual(Tr(f), {}); assert.deepEqual(P(f), {});
  const later = { ...f, travelEndDate: "2026-12-05" }; // needs 2027-03-05 now
  assert.equal(Tr(later).travelEndDate, "Passport must be valid 3 months after return");
  assert.equal(P(later).passportExpiry, "Passport must be valid 3 months after return");
  const earlier = { ...later, travelEndDate: "2026-11-30" }; // needs 2027-02-28 again
  assert.deepEqual(Tr(earlier), {}); assert.deepEqual(P(earlier), {});
});

test("date of birth: 18 or older (web: max = today - 18 years)", () => {
  assert.equal(latestBirthDate(TODAY), "2008-10-22");
  assert.equal(P(personal({ dateOfBirth: "2008-10-22" })).dateOfBirth, undefined);
  assert.equal(P(personal({ dateOfBirth: "2008-10-23" })).dateOfBirth, "You must be 18 or older");
  assert.equal(latestBirthDate("2028-02-29"), "2010-02-28");
});

test("trip length equals the website server's duration_days formula", () => {
  const web = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
  for (let i = 0; i < 400; i += 7) {
    const a = addDays("2026-01-01", i);
    for (const n of [0, 1, 7, 30, 89, 90, 91]) assert.equal(tripDays({ travelStartDate: a, travelEndDate: addDays(a, n) }), web(a, addDays(a, n)));
  }
});

test("dates: calendar maths", () => {
  assert.ok(isIsoDate("2028-02-29")); assert.ok(!isIsoDate("2027-02-29")); assert.ok(!isIsoDate("2026-13-01")); assert.ok(!isIsoDate("2026-1-01")); assert.ok(!isIsoDate(""));
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28"); assert.equal(addMonths("2028-01-31", 1), "2028-02-29"); assert.equal(addMonths("2026-03-31", -1), "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01"); assert.equal(addDays("2028-02-28", 1), "2028-02-29"); assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2); // a DST weekend in Europe/US: still 2
});

test("no time-zone day shifts (runs in Asia/Dubai, UTC and America/Los_Angeles)", () => {
  // Every day of 2026-2028 survives the picker round trip (local Date at noon -> YYYY-MM-DD).
  for (let d = "2026-01-01"; d < "2029-01-01"; d = addDays(d, 1)) assert.equal(toIso(fromIso(d)), d);
  // "Today" is the phone's calendar date: 00:30 in Dubai on 23 Oct is still 22 Oct in UTC.
  const at = new Date("2026-10-22T20:30:00Z");
  const local = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  assert.equal(todayIso(at), local);
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Dubai") {
    assert.equal(todayIso(at), "2026-10-23");
    assert.equal(earliestDepartureDate(todayIso(at)), "2026-11-07"); // not the UTC date + 15 (2026-11-06)
  }
});

test("range picker: taps and quick presets", () => {
  let r = tapDay("2026-11-10", "", "", "start"); assert.deepEqual(r, { start: "2026-11-10", end: "", editing: "end" });
  r = tapDay("2026-11-17", r.start, r.end, r.editing); assert.deepEqual(r, { start: "2026-11-10", end: "2026-11-17", editing: "start" });
  assert.deepEqual(tapDay("2026-11-12", "2026-11-10", "2026-11-17", "start"), { start: "2026-11-12", end: "2026-11-17", editing: "end" }); // return kept
  assert.deepEqual(tapDay("2026-11-20", "2026-11-10", "2026-11-17", "start"), { start: "2026-11-20", end: "", editing: "end" }); // return dropped
  assert.deepEqual(tapDay("2026-11-08", "2026-11-10", "", "end"), { start: "2026-11-08", end: "", editing: "end" }); // earlier day = new departure
  assert.deepEqual(tapDay("2026-11-10", "2026-11-10", "", "end"), { start: "2026-11-10", end: "", editing: "end" }); // same day is no return
  assert.deepEqual(PRESETS.map((p) => presetEnd("2026-11-10", p)), ["2026-11-17", "2026-11-24", "2026-12-01", "2026-12-10"]);
  assert.equal(presetEnd("2027-01-31", PRESETS[3]), "2027-02-28");
});

test("month grid and locale tag", () => {
  const mon = monthGrid("2026-11", 2); // 1 Nov 2026 is a Sunday
  assert.equal(mon[0].indexOf("2026-11-01"), 6); assert.ok(mon.every((r) => r.length === 7)); assert.equal(mon.flat().filter(Boolean).length, 30);
  assert.equal(monthGrid("2026-11", 1)[0][0], "2026-11-01");
  assert.equal(monthGrid("2026-11", 7)[0][1], "2026-11-01"); // Saturday-first
  assert.equal(dateLocaleTag("en", "en-AE", "AE"), "en-AE"); assert.equal(dateLocaleTag("en", "fr-FR", "FR"), "en-FR");
  assert.equal(dateLocaleTag("ar", "en-AE", "AE"), "ar-AE"); assert.equal(dateLocaleTag("en"), "en-GB");
});

test("one range question: old draft pages resume on it; it owns both dates", () => {
  assert.equal(normalizePage("q:travelStartDate", trip()), "q:travelDates");
  assert.equal(normalizePage("q:travelEndDate", trip()), "q:travelDates");
  const e = questionErrors(Q_BY_ID.travelDates, trip({ travelStartDate: "", travelEndDate: "" }));
  assert.ok(e.travelStartDate && e.travelEndDate);
});
