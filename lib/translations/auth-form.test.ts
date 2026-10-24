import assert from "node:assert/strict"
import { test } from "node:test"
import { AUTH_MESSAGE, type AuthIssue } from "../auth/errors.ts"
import { authFormErrorText } from "./auth-form.ts"
import { translations } from "./index.ts"

const CODES = Object.keys(AUTH_MESSAGE) as AuthIssue[]

test("forgot-password and signup copy is Modern Standard Arabic with Western digits", () => {
  const arabic = JSON.stringify(translations.ar.authForm)
  assert.equal(/[٠-٩۰-۹]/.test(arabic), false)
  assert.equal(translations.ar.authForm.passwordTooShort.includes("6"), true)
  assert.equal(translations.ar.authForm.errors["weak-password"].includes("8"), true)
  for (const code of CODES) {
    assert.equal(translations.en.authForm.errors[code], AUTH_MESSAGE[code], code)
    const line = translations.ar.authForm.errors[code]
    assert.equal(line.length > 0, true, code)
    assert.notEqual(line, AUTH_MESSAGE[code], code)
  }
})

test("an Arabic auth form never shows the raw provider error", () => {
  const raw = "Unable to validate email address: invalid format"
  assert.equal(authFormErrorText("ar", { message: raw }), translations.ar.authForm.errors["invalid-email"])
  assert.equal(authFormErrorText("ar", { message: raw }).includes("Unable"), false)
  assert.equal(authFormErrorText("ar", { message: "User already registered" }), translations.ar.authForm.errors.exists)
  const googleOff = "Google sign-in isn't set up yet. Please use email for now."
  assert.equal(authFormErrorText("ar", googleOff), translations.ar.authForm.googleUnavailable)
  assert.equal(authFormErrorText("ar", googleOff).includes("isn't"), false)
  assert.equal(authFormErrorText("ar", "This site isn't allowed to receive Google sign-ins yet. Please use email for now."), translations.ar.authForm.googleRedirect)
  assert.equal(authFormErrorText("en", { message: raw }), raw)
  assert.equal(authFormErrorText("en", googleOff), googleOff)
})
