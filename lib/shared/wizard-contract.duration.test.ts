import assert from "node:assert/strict"
import { test } from "node:test"
import { fixedDatesAccepted, fixedTripRange, schengenStayDays } from "../dates.ts"
import { applicationColumns, emptyAnswers, inclusiveStayDays, MAX_STAY_DAYS, readiness, tripDays, validateTrip, type WizardAnswers } from "./wizard-contract.ts"

/** The app's stay count (mobile/lib/data.ts days() and mobile/lib/wizard.ts tripDays()). */
const appDays = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1

const plusDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86400000).toISOString().slice(0, 10)

const columns = (start: string, end: string) =>
  applicationColumns(
    { travelStartDate: start, travelEndDate: end },
    "a@example.com",
    "trip-details",
    {},
    { platform: "web", source: "website" },
  )

test("same-day trip is 1 inclusive day", () => {
  assert.equal(inclusiveStayDays("2026-12-10", "2026-12-10"), 1)
  assert.equal(tripDays({ travelStartDate: "2026-12-10", travelEndDate: "2026-12-10" }), 1)
  assert.equal(columns("2026-12-10", "2026-12-10").duration_days, 1)
  assert.equal(appDays("2026-12-10", "2026-12-10"), 1)
})

test("10-night trip is 11 inclusive days", () => {
  assert.equal(inclusiveStayDays("2026-12-10", "2026-12-20"), 11)
  assert.equal(tripDays({ travelStartDate: "2026-12-10", travelEndDate: "2026-12-20" }), 11)
  assert.equal(columns("2026-12-10", "2026-12-20").duration_days, 11)
  assert.equal(appDays("2026-12-10", "2026-12-20"), 11)
})

test("a missing date does not store a duration", () => {
  assert.equal(columns("2026-12-10", "").duration_days, null)
  assert.equal(columns("", "2026-12-20").duration_days, null)
  assert.equal(tripDays({ travelStartDate: "2026-12-10", travelEndDate: "" }), 0)
})

test("stored duration matches the app formula across month and year boundaries", () => {
  const spans = [
    ["2026-01-31", "2026-02-01"],
    ["2026-02-28", "2026-03-01"],
    ["2027-12-01", "2028-01-01"],
    ["2026-06-01", plusDays("2026-06-01", 89)],
    ["2026-06-01", plusDays("2026-06-01", 90)],
  ] as const
  for (const [start, end] of spans) {
    assert.equal(columns(start, end).duration_days, appDays(start, end))
    assert.equal(inclusiveStayDays(start, end), appDays(start, end))
  }
})

test("the 90-day limit counts inclusive days", () => {
  const start = "2027-06-01"
  const within = plusDays(start, MAX_STAY_DAYS - 1)
  const over = plusDays(start, MAX_STAY_DAYS)
  assert.equal(tripDays({ travelStartDate: start, travelEndDate: within }), 90)
  assert.equal(tripDays({ travelStartDate: start, travelEndDate: over }), 91)
  const base: WizardAnswers = {
    ...emptyAnswers,
    purposeOfTrip: "tourism",
    travelStartDate: start,
    datesFlexible: "no",
    travelingWith: "alone",
    hotelCategory: "3-star",
    fundingSource: "self",
    balanceRange: "under-10000",
    isFirstSchengenVisa: "yes",
    previousRefusals: "no",
    passportExpiry: "2030-01-01",
  }
  assert.equal(validateTrip({ ...base, travelEndDate: within }).travelEndDate, undefined)
  assert.equal(validateTrip({ ...base, travelEndDate: over }).travelEndDate, "Schengen visits are limited to 90 days")
})

const stayCheck = (start: string, end: string) =>
  readiness({ ...emptyAnswers, travelStartDate: start, travelEndDate: end }).checks.find((check) => check.label.startsWith("Stay duration"))

test("readiness counts 3–12 Nov as 10 inclusive days", () => {
  assert.equal(inclusiveStayDays("2026-11-03", "2026-11-12"), 10)
  assert.equal(schengenStayDays("2026-11-03", "2026-11-12"), 10)
  assert.deepEqual(stayCheck("2026-11-03", "2026-11-12"), {
    label: "Stay duration (10 days) within Schengen 90-day legal limit",
    passed: true,
  })
})

test("readiness accepts 90 inclusive days and rejects 91", () => {
  const start = "2027-06-01"
  const within = plusDays(start, MAX_STAY_DAYS - 1)
  const over = plusDays(start, MAX_STAY_DAYS)
  assert.deepEqual(stayCheck(start, within), {
    label: "Stay duration (90 days) within Schengen 90-day legal limit",
    passed: true,
  })
  assert.deepEqual(stayCheck(start, over), { label: "Stay duration exceeds 90 days", passed: false })
  assert.equal(fixedDatesAccepted(start, within), true)
  assert.equal(fixedDatesAccepted(start, over), false)
})

test("a same-day trip is 1 day and the picker accepts it", () => {
  const day = "2027-06-01"
  const answers: WizardAnswers = {
    ...emptyAnswers,
    purposeOfTrip: "tourism",
    travelStartDate: day,
    travelEndDate: day,
    datesFlexible: "no",
    travelingWith: "alone",
    hotelCategory: "3-star",
    fundingSource: "self",
    balanceRange: "under-10000",
    isFirstSchengenVisa: "yes",
    previousRefusals: "no",
    passportExpiry: "2030-01-01",
  }
  assert.equal(tripDays(answers), 1)
  assert.equal(validateTrip(answers).travelEndDate, undefined)
  assert.deepEqual(stayCheck(day, day), {
    label: "Stay duration (1 days) within Schengen 90-day legal limit",
    passed: true,
  })
  assert.deepEqual(fixedTripRange(day, day), { start: day, end: day })
  assert.equal(fixedDatesAccepted(day, day), true)
  assert.equal(schengenStayDays(day, day), 1)
})

test("a one-night trip is 2 inclusive days", () => {
  assert.equal(inclusiveStayDays("2026-11-03", "2026-11-04"), 2)
  assert.equal(schengenStayDays("2026-11-03", "2026-11-04"), 2)
  assert.deepEqual(stayCheck("2026-11-03", "2026-11-04"), {
    label: "Stay duration (2 days) within Schengen 90-day legal limit",
    passed: true,
  })
  assert.deepEqual(fixedTripRange("2026-11-12", "2026-11-03"), { start: "2026-11-03", end: "" })
  assert.equal(fixedDatesAccepted("2026-11-12", "2026-11-03"), false)
})
