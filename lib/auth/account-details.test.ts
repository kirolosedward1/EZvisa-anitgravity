import assert from "node:assert/strict"
import { test } from "node:test"
import { accountBirthDate, accountDetails, todayDate } from "./account-details"

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
