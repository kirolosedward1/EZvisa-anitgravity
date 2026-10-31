import assert from "node:assert/strict"
import { test } from "node:test"
import { formatUaeLocal, hasInvalidPhone, isValidPhone, leadPhoneForSend, phoneTypingValue, uaeLocalDigits, uaeMobileE164 } from "./phone"

/** The field's onChange: each new character is appended, then only Western digits (and a leading +) are kept. */
function typePhone(chars: string) {
  let value = ""
  for (const char of chars) value = phoneTypingValue(value + char)
  return value
}

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

test("typing or pasting a repeated dial code is not stripped until validation", () => {
  const typed = typePhone("971971501234567")
  assert.equal(typed, "971971501234567")
  assert.equal(uaeMobileE164(typed), null)

  const typedWithTrunk = typePhone("00971971501234567")
  assert.equal(typedWithTrunk, "00971971501234567")
  assert.equal(uaeMobileE164(typedWithTrunk), null)

  assert.equal(phoneTypingValue("971971501234567"), "971971501234567")
  assert.equal(uaeMobileE164(phoneTypingValue("971971501234567")), null)
  assert.equal(phoneTypingValue("00971971501234567"), "00971971501234567")
  assert.equal(uaeMobileE164("00971971501234567"), null)

  // A trunk 0 stays on screen; blur and submit are what turn it into +971501234567.
  assert.equal(typePhone("0501234567"), "0501234567")
  assert.equal(uaeMobileE164(typePhone("0501234567")), "+971501234567")
  assert.equal(phoneTypingValue("+971 50-123 4567"), "+971501234567")
  assert.equal(phoneTypingValue("50+123"), "50123")
})

test("type, blur, then validate rejects a doubled 971 in every prefix form", () => {
  // Blur rewrites only when uaeMobileE164 accepts the typed value. Continue blurs the field.
  const blur = (raw: string) => uaeMobileE164(raw) ?? raw
  for (const input of ["971971501234567", "00971971501234567", "+971971501234567"]) {
    const typed = typePhone(input)
    const blurred = blur(typed)
    assert.equal(blurred, typed)
    assert.equal(uaeMobileE164(blurred), null)
    assert.equal(isValidPhone(blurred), false)
    // One strip leaves the second 971. Validating that remainder would strip again and accept it.
    const once = uaeLocalDigits(blurred)
    assert.equal(once.startsWith("971"), true)
    assert.equal(uaeMobileE164(blurred), null)
  }
  const valid = blur(typePhone("0501234567"))
  assert.equal(valid, "+971501234567")
  assert.equal(uaeMobileE164(valid), "+971501234567")
})

test("a HubSpot lead rejects an invalid phone and sends +971XXXXXXXXX when valid", () => {
  for (const phone of ["50123", "971971501234567", "+201012345678"]) {
    assert.deepEqual(leadPhoneForSend(phone), { error: "Enter a valid phone number." })
  }
  assert.deepEqual(leadPhoneForSend(""), { phone: "" })
  assert.deepEqual(leadPhoneForSend("   "), { phone: "" })
  assert.deepEqual(leadPhoneForSend(undefined), { phone: "" })
  assert.deepEqual(leadPhoneForSend("0501234567"), { phone: "+971501234567" })
  assert.deepEqual(leadPhoneForSend("+971 50 123 4567"), { phone: "+971501234567" })
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

test("UAE numbers typed without a dial code are shown grouped 00 000 0000, display only", () => {
  assert.equal(formatUaeLocal("5"), "5")
  assert.equal(formatUaeLocal("501"), "50 1")
  assert.equal(formatUaeLocal("501234567"), "50 123 4567")
  assert.equal(formatUaeLocal("0501234567"), "050 123 4567")
  assert.equal(formatUaeLocal("+971501234567"), "+971501234567")
  assert.equal(formatUaeLocal("971501234567"), "971501234567")
  assert.equal(formatUaeLocal("00971501234567"), "00971501234567")
  // The field keeps digits only, so a grouped value typed back in validates the same.
  assert.equal(uaeMobileE164(phoneTypingValue(formatUaeLocal("501234567"))), "+971501234567")
})
