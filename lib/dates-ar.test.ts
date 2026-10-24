import assert from "node:assert/strict"
import { test } from "node:test"
import { formatArabicDate } from "./dates.ts"

test("an Arabic calendar date is day, month name, year, with Western digits", () => {
  const formatted = formatArabicDate("2026-10-24")
  assert.equal(formatted, "24 أكتوبر 2026")
  assert.equal(formatted.includes(","), false)
  assert.equal(/[٠-٩۰-۹]/.test(formatted), false)
})

test("a timestamp keeps the UAE calendar day and adds the clock without a comma", () => {
  const formatted = formatArabicDate("2026-10-24T08:00:00.000Z", true)
  assert.equal(formatted.startsWith("24 أكتوبر 2026"), true)
  assert.equal(formatted.includes(","), false)
  assert.equal(/[٠-٩۰-۹]/.test(formatted), false)
  assert.match(formatted, /24 أكتوبر 2026 في \d/)
})
