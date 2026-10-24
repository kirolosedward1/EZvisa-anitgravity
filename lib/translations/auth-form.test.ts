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

test("support and receipt lines stay English and use Modern Standard Arabic on /ar", () => {
  assert.equal(translations.en.support.whatsApp, "WhatsApp Support")
  assert.equal(translations.ar.support.whatsApp, "دعم واتساب")
  assert.equal(translations.en.support.message, "Message us on WhatsApp")
  assert.equal(translations.ar.support.message, "راسلنا عبر واتساب")
  assert.equal(
    translations.en.receipt.missingAmount,
    "This payment has no amount on file, so we can't issue a receipt here. Message us on WhatsApp and we'll send one.",
  )
  assert.equal(/[٠-٩۰-۹]/.test(translations.ar.receipt.missingAmount), false)
  assert.equal(/[A-Za-z]{4,}/.test(translations.ar.receipt.missingAmount), false)
  assert.notEqual(translations.ar.receipt.missingAmount, translations.en.receipt.missingAmount)
  assert.equal(translations.en.dashboardEmpty.title, "No applications yet")
  assert.equal(translations.ar.dashboardEmpty.title, "لا توجد طلبات بعد")
  assert.equal(translations.en.dashboardEmpty.before, "We couldn't find any visa applications for")
  assert.equal(translations.en.dashboardEmpty.after, "If you applied with a different email, sign in with that one instead.")
  assert.equal(/[٠-٩۰-۹]/.test(translations.ar.dashboardEmpty.before + translations.ar.dashboardEmpty.after), false)
  assert.equal(/[A-Za-z]{4,}/.test(translations.ar.dashboardEmpty.title), false)
  assert.equal(translations.en.dashboardHome.welcomeBack, "Welcome back,")
  assert.equal(translations.ar.dashboardHome.welcomeBack, "مرحبًا بعودتك،")
  assert.equal(translations.en.dashboardHome.signedInAs, "Signed in as")
  assert.equal(translations.ar.dashboardHome.signedInAs, "تم تسجيل الدخول باسم")
  assert.equal(translations.en.authForm.newPasswordTitle, "Set new password")
  assert.equal(translations.ar.authForm.newPasswordTitle, "تعيين كلمة مرور جديدة")
  assert.equal(translations.en.authForm.resetTitle, "Reset password")
  assert.equal(translations.ar.authForm.resetTitle, "إعادة تعيين كلمة المرور")
  assert.equal(translations.en.authForm.resetSent, "We've sent a password reset link to your email.")
  assert.equal(translations.ar.authForm.resetSent, "أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.")
  assert.equal(/[٠-٩۰-۹]/.test(translations.ar.dashboardHome.welcomeBack + translations.ar.authForm.newPasswordTitle + translations.ar.authForm.resetSent), false)
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
