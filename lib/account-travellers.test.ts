import assert from "node:assert/strict"
import { test } from "node:test"
import { applicationsFor, initialsOf, isUnder18, passportState } from "./account-travellers.ts"

const now = new Date("2026-10-30T09:00:00Z")

test("passport state: expired, within six months, fine, or unknown", () => {
  assert.equal(passportState("2026-10-01", now), "expired")
  assert.equal(passportState("2027-03-20", now), "soon")
  assert.equal(passportState("2027-04-30", now), "soon")
  assert.equal(passportState("2027-05-01", now), "ok")
  assert.equal(passportState("2031-06-30", now), "ok")
  assert.equal(passportState("", now), null)
  assert.equal(passportState("not a date", now), null)
})

test("under 18 turns false on the 18th birthday", () => {
  assert.equal(isUnder18("2015-05-02", now), true)
  assert.equal(isUnder18("2008-10-31", now), true)
  assert.equal(isUnder18("2008-10-30", now), false)
  assert.equal(isUnder18(undefined, now), false)
})

test("applications are matched by name, ignoring case and spacing", () => {
  assert.equal(applicationsFor("Marcus Vance", ["marcus  vance", "Elena Vance", "MARCUS VANCE", null]), 2)
  assert.equal(applicationsFor("", ["", ""]), 0)
})

test("initials use the first and last name", () => {
  assert.equal(initialsOf("Sara Al Mansoor"), "SM")
  assert.equal(initialsOf("kirolos"), "K")
})
