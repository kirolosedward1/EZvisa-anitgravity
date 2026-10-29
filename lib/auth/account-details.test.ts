import assert from "node:assert/strict"
import { test } from "node:test"
import { accountBirthDate, accountDetails, todayDate, adultBirthdateCutoff, registrationDetails, hasAdultConfirmation, profileCompletionPath, accountAge } from "./account-details"

test("signup requires a name and a real non-future birthday", () => {
  assert.equal(accountDetails("  ", "1990-01-01", "2026-10-29").error, "name")
  assert.equal(accountDetails("Kirolos Edward", "", "2026-10-29").error, "birthdate")
  assert.equal(accountDetails("Kirolos Edward", "2001-02-29", "2026-10-29").error, "birthdate")
  assert.equal(accountDetails("Kirolos Edward", "2026-10-30", "2026-10-29").error, "birthdate")
})

test("profile metadata normalizes names and stores a date without timezone conversion", () => {
  assert.deepEqual(accountDetails("  Kirolos   Edward  ", "2000-02-29", "2026-10-29").data, { full_name: "Kirolos Edward", date_of_birth: "2000-02-29" })
  assert.deepEqual(accountDetails("محمد أحمد", "1994-12-31", "2026-10-29").data, { full_name: "محمد أحمد", date_of_birth: "1994-12-31" })
  assert.ok(accountDetails("Prince", "1980-01-01", "2026-10-29").data)
})

test("invalid profile birthdates never prefill a traveller form", () => {
  assert.equal(accountBirthDate({ date: "1990-01-01" }), "")
  assert.equal(accountBirthDate("2030-01-01", "2026-10-29"), "")
  assert.equal(accountBirthDate("1990-01-01", "2026-10-29"), "1990-01-01")
  assert.equal(todayDate(new Date(2026, 9, 29, 0, 30)), "2026-10-29")
})

test("adult registration accepts the eighteenth birthday, not the day before", () => {
  assert.ok(registrationDetails("Test Person", "2008-10-29", true, "2026-10-29").data)
  assert.equal(registrationDetails("Test Person", "2008-10-30", true, "2026-10-29").error, "underage")
  assert.equal(registrationDetails("Test Person", "2015-05-01", true, "2026-10-29").error, "underage")
  assert.equal(registrationDetails("Test Person", "1990-01-01", false, "2026-10-29").error, "confirmation")
  assert.equal(registrationDetails("Test Person", "1990-01-01", "true", "2026-10-29").error, "confirmation")
})

test("leap-day birthdays and UAE midnight have consistent age boundaries", () => {
  assert.equal(adultBirthdateCutoff("2024-02-29"), "2006-02-28")
  assert.equal(registrationDetails("Test Person", "2008-02-29", true, "2026-02-28").error, "underage")
  assert.ok(registrationDetails("Test Person", "2008-02-29", true, "2026-03-01").data)
  assert.equal(todayDate(new Date("2026-10-28T20:00:00Z")), "2026-10-29")
})

test("onboarding uses only the server-recorded age declaration, and retains safe destinations", () => {
  assert.equal(hasAdultConfirmation({ app_metadata: { ezvisa_adult_policy: 1 } }), true)
  assert.equal(hasAdultConfirmation({ app_metadata: { ezvisa_adult_policy: "1" } }), false)
  assert.equal(hasAdultConfirmation({ app_metadata: {} }), false)
  assert.equal(profileCompletionPath("/ar/dashboard"), "/ar/signup?profile=complete&next=%2Far%2Fdashboard")
  assert.equal(profileCompletionPath("//outside.example"), "/signup?profile=complete&next=%2Fdashboard")
  assert.equal(profileCompletionPath("/signup?profile=complete&next=%2Fapply"), "/signup?profile=complete&next=%2Fapply")
})

test("age is derived from the birthdate instead of storing a stale provider age", () => {
  assert.equal(accountAge("2008-10-30", "2026-10-29"), 17)
  assert.equal(accountAge("2008-10-29", "2026-10-29"), 18)
  assert.equal(accountAge("invalid", "2026-10-29"), null)
})
