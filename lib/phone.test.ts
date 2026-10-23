import assert from "node:assert/strict"
import { test } from "node:test"
import { hasInvalidPhone, isValidPhone } from "./phone"

test("1111111 is rejected", () => {
  assert.equal(isValidPhone("1111111"), false)
  // The wizard stores the same digits with the UAE dial code in front.
  assert.equal(isValidPhone("+971 1111111"), false)
  assert.equal(isValidPhone("+971555555555"), false)
})

test("+971501234567 is accepted", () => {
  assert.equal(isValidPhone("+971501234567"), true)
  assert.equal(isValidPhone("+971 50 123 4567"), true)
})

test("Arabic-digit input is accepted", () => {
  assert.equal(isValidPhone("+٩٧١٥٠١٢٣٤٥٦٧"), true)
  assert.equal(isValidPhone("٥٠١٢٣٤٥٦٧"), true)
})

test("Persian-digit input is accepted", () => {
  assert.equal(isValidPhone("+۹۷۱۵۰۱۲۳۴۵۶۷"), true)
})

test("a submitted phone is rejected only when it is present and invalid", () => {
  assert.equal(hasInvalidPhone("1111111"), true)
  assert.equal(hasInvalidPhone("+971 1111111"), true)
  assert.equal(hasInvalidPhone("+9711234"), true)
  assert.equal(hasInvalidPhone("+9711234567890123"), true)
  assert.equal(hasInvalidPhone("+971501234567"), false)
  assert.equal(hasInvalidPhone("+٩٧١٥٠١٢٣٤٥٦٧"), false)
  assert.equal(hasInvalidPhone(""), false)
  assert.equal(hasInvalidPhone("   "), false)
  assert.equal(hasInvalidPhone(undefined), false)
})

test("too short or too long numbers are rejected", () => {
  // Four local digits: the old check counted "+971" and treated this as 7 digits.
  assert.equal(isValidPhone("+9711234"), false)
  assert.equal(isValidPhone("123456"), false)
  // Thirteen local digits, past the UAE maximum and the 7–12 fallback.
  assert.equal(isValidPhone("+9711234567890123"), false)
  assert.equal(isValidPhone("1234567890123"), false)
})
