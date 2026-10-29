import assert from "node:assert/strict"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { insurancePreference, applicationInsurance, withInsurancePreference } from "./insurance.ts"
import { getStepNumber, getStepSlug } from "./wizard-steps.ts"
import { ProgressTracker } from "../components/dashboard/progress-tracker.tsx"
import { priceAed } from "./shared/wizard-contract.ts"

test("only explicit insurance choices are accepted, never inferred from paid or covered labels", () => {
  for (const invalid of [undefined, null, "", "paid", "covered", "yes", true, { quote: true }]) assert.equal(insurancePreference(invalid), undefined)
  assert.equal(insurancePreference("quote"), "quote")
  assert.equal(insurancePreference("own"), "own")
})

test("saved preference survives JSON notes and legacy notes remain unselected", () => {
  assert.equal(applicationInsurance(JSON.stringify({ insurancePreference: "quote", applicantCount: 1 })), "quote")
  assert.equal(applicationInsurance(JSON.stringify({ insurancePreference: "own", wizard: {} })), "own")
  for (const notes of [null, "", "bad json", "null", '{"payment_status":"paid"}']) assert.equal(applicationInsurance(notes), undefined)
})

test("retired insurance links resume at payment without changing payment/spouse links", () => {
  assert.equal(getStepSlug(getStepNumber("insurance")), "payment")
  assert.equal(getStepSlug(5), "payment")
  assert.equal(getStepNumber("payment"), 4)
  assert.equal(getStepNumber("spouse"), 2)
  assert.equal(getStepSlug(3), "destination")
})

test("dashboard puts Insurance after Payment without marking a legacy policy complete", () => {
  const html = renderToStaticMarkup(createElement(ProgressTracker, { progress: { key: "payment", finished: false }, arabic: false, showInsurance: true }))
  assert.ok(html.indexOf("Payment") < html.indexOf("Insurance"))
  const insurance = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/g)?.[1] || ""
  assert.match(insurance, /Preference not recorded/)
  assert.doesNotMatch(insurance, /completed/)
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1)
})

test("quote is a completed preference, not evidence of purchased insurance; service fee is unchanged", () => {
  const html = renderToStaticMarkup(createElement(ProgressTracker, { progress: { key: "payment", finished: false }, arabic: false, showInsurance: true, insurance: "quote" }))
  assert.match(html, /Separate quote requested/)
  assert.doesNotMatch(html, /policy purchased|cover confirmed/i)
  assert.equal(priceAed("no", "solo"), 249)
  assert.equal(priceAed("yes", "spouse"), 498)
})


test("public tracking does not include the dashboard-only insurance step", () => {
  const html = renderToStaticMarkup(createElement(ProgressTracker, { progress: { key: "documents", finished: false }, arabic: false }))
  assert.doesNotMatch(html, /Insurance/)
})

test("saving insurance preserves uploads, traveller answers and existing metadata", () => {
  const previous = { wizard: { passportNumber: "ABC123" }, uploads: { photo: "photo.jpg" }, source: "website" }
  assert.deepEqual(JSON.parse(withInsurancePreference(JSON.stringify(previous), "quote")), { ...previous, insurancePreference: "quote" })
  for (const notes of ["bad json", "null", "[]"]) assert.throws(() => withInsurancePreference(notes, "own"))
})
