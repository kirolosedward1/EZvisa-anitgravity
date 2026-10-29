import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyAnswers, firstIncomplete, detailSteps, validatePersonal, type WizardAnswers } from "./wizard-contract.ts"
import { missingDetailSteps } from "../application-status.ts"

const traveller: WizardAnswers = {
  ...emptyAnswers,
  nationality: "Egypt", destination: "France",
  firstName: "Test", lastName: "Traveller", email: "traveller@example.com",
  phone: "+971509876543", dateOfBirth: "1990-01-01", cityOfResidence: "Dubai",
  maritalStatus: "single", spouseAccompanying: "no",
}

test("a traveller without a passport number can reach payment", () => {
  assert.deepEqual(validatePersonal(traveller), {})
  assert.equal(firstIncomplete(traveller), null)
  assert.ok(detailSteps(traveller).includes("passport"))
})

test("missing identity and contact details still block checkout", () => {
  assert.equal(firstIncomplete({ ...traveller, firstName: "" }), "personal")
  assert.equal(firstIncomplete({ ...traveller, email: "" }), "personal")
  assert.equal(firstIncomplete({ ...traveller, phone: "" }), "personal")
})

test("the continuation asks for a missing passport and accepts an existing saved number", () => {
  const paid = { payment_status: "paid", application_status: "submitted", additional_notes: JSON.stringify({ wizard: traveller }) }
  assert.ok(missingDetailSteps(paid).includes("passport"))
  assert.ok(!missingDetailSteps({ ...paid, passport_number: "TEST12345" }).includes("passport"))
  assert.ok(!detailSteps({ ...traveller, passportNumber: "TEST12345" }).includes("passport"))
})
