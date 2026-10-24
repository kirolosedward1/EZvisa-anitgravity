import assert from "node:assert/strict"
import { test } from "node:test"
import { hasInvalidPhone, isValidPhone, uaeMobileE164 } from "./phone"

test("1111111 is rejected", () => {
  assert.equal(isValidPhone("1111111"), false)
  assert.equal(isValidPhone("+971 1111111"), false)
  assert.equal(isValidPhone("+971555555555"), false)
  assert.equal(isValidPhone("555555555"), false)
})

test("a UAE mobile is accepted and stored as +971XXXXXXXXX", () => {
  assert.equal(isValidPhone("+971501234567"), true)
  assert.equal(isValidPhone("+971 50 123 4567"), true)
  assert.equal(isValidPhone("0501234567"), true)
  assert.equal(isValidPhone("501234567"), true)
  assert.equal(uaeMobileE164("0501234567"), "+971501234567")
  assert.equal(uaeMobileE164("501234567"), "+971501234567")
  assert.equal(uaeMobileE164("+971 50 123 4567"), "+971501234567")
  assert.equal(uaeMobileE164("00971501234567"), "+971501234567")
})

test("continue-application saves 0501234567 and 00971 50 123 4567 as +971501234567", () => {
  assert.equal(uaeMobileE164("0501234567"), "+971501234567")
  assert.equal(uaeMobileE164("00971 50 123 4567"), "+971501234567")
})

test("Arabic-digit input is accepted", () => {
  assert.equal(isValidPhone("+٩٧١٥٠١٢٣٤٥٦٧"), true)
  assert.equal(isValidPhone("٥٠١٢٣٤٥٦٧"), true)
  assert.equal(uaeMobileE164("+٩٧١٥٠١٢٣٤٥٦٧"), "+971501234567")
})

test("Persian-digit input is accepted", () => {
  assert.equal(isValidPhone("+۹۷۱۵۰۱۲۳۴۵۶۷"), true)
  assert.equal(uaeMobileE164("۰۵۰۱۲۳۴۵۶۷"), "+971501234567")
})

test("a submitted phone is rejected only when it is present and invalid", () => {
  assert.equal(hasInvalidPhone("1111111"), true)
  assert.equal(hasInvalidPhone("+971 1111111"), true)
  assert.equal(hasInvalidPhone("50123"), true)
  assert.equal(hasInvalidPhone("+9711234567890123"), true)
  assert.equal(hasInvalidPhone("+971501234567"), false)
  assert.equal(hasInvalidPhone("+٩٧١٥٠١٢٣٤٥٦٧"), false)
  assert.equal(hasInvalidPhone(""), false)
  assert.equal(hasInvalidPhone("   "), false)
  assert.equal(hasInvalidPhone(undefined), false)
})

test("too short, repeated dial code, and foreign numbers are rejected", () => {
  assert.equal(isValidPhone("50123"), false)
  assert.equal(uaeMobileE164("50123"), null)
  assert.equal(isValidPhone("+9711234"), false)
  assert.equal(isValidPhone("123456"), false)
  assert.equal(isValidPhone("+9711234567890123"), false)
  assert.equal(isValidPhone("1234567890123"), false)
  // Prefix is stripped once; a second 971 is not a UAE mobile.
  assert.equal(isValidPhone("971971501234567"), false)
  assert.equal(isValidPhone("00971971501234567"), false)
  assert.equal(uaeMobileE164("971971501234567"), null)
  assert.equal(uaeMobileE164("00971971501234567"), null)
  // A foreign number, with or without the fixed +971 prefix, is not stored.
  assert.equal(isValidPhone("+20 1012345678"), false)
  assert.equal(isValidPhone("+201012345678"), false)
  assert.equal(isValidPhone("+971201012345678"), false)
  assert.equal(uaeMobileE164("+971201012345678"), null)
  assert.equal(uaeMobileE164("+20 1012345678"), null)
})
