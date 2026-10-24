import assert from "node:assert/strict"
import { test } from "node:test"
import { AUTH_MESSAGE, type AuthIssue } from "./errors.ts"
import { issueFromClientMessage, loginErrorText, loginInfoText, noticeFromQuery } from "./login-notice.ts"
import { translations } from "../translations/index.ts"

const CODES = Object.keys(AUTH_MESSAGE) as AuthIssue[]

test("every auth error code has the English message and a Modern Standard Arabic line", () => {
  for (const code of CODES) {
    assert.equal(translations.en.auth.errors[code], AUTH_MESSAGE[code], code)
    assert.equal(loginErrorText("en", code), AUTH_MESSAGE[code], code)
    const arabic = loginErrorText("ar", code)
    assert.equal(arabic, translations.ar.auth.errors[code], code)
    assert.equal(arabic.length > 0, true, code)
    assert.notEqual(arabic, AUTH_MESSAGE[code], code)
  }
  assert.equal(translations.en.auth.errors["link-expired"], translations.en.auth.linkExpired)
  assert.equal(translations.ar.auth.errors["link-expired"], translations.ar.auth.linkExpired)
})

test("a login URL shows the mapped message, and never the raw error text", () => {
  assert.equal(noticeFromQuery(null, null), null)
  assert.equal(noticeFromQuery("", "magiclink"), null)

  for (const code of CODES) {
    const notice = noticeFromQuery(code, "magiclink")
    assert.deepEqual(notice, { tone: "error", code })
    assert.equal(loginErrorText("en", code), AUTH_MESSAGE[code])
    assert.equal(loginErrorText("ar", code).includes(code), false)
  }

  const raw = "Database error: password authentication failed for user postgres"
  const unknown = noticeFromQuery(raw, "signup")
  assert.deepEqual(unknown, { tone: "error", code: "unknown" })
  assert.equal(loginErrorText("en", "unknown"), AUTH_MESSAGE.unknown)
  assert.equal(loginErrorText("en", "unknown").includes("Database"), false)
  assert.equal(loginErrorText("ar", "unknown").includes(raw), false)
  assert.equal(loginErrorText("ar", "unknown"), "حدث خطأ. أعد المحاولة.")

  assert.deepEqual(noticeFromQuery("otp_expired", "recovery"), { tone: "error", code: "unknown" })
  assert.deepEqual(noticeFromQuery("other-device", "magiclink"), { tone: "error", code: "other-device" })
  assert.deepEqual(noticeFromQuery("other-device", "signup"), { tone: "info", code: "email-confirmed" })
  assert.equal(loginInfoText("en", "email-confirmed"), "Email confirmed. Sign in with your email and password.")
  assert.equal(loginInfoText("ar", "email-confirmed"), "تم تأكيد البريد الإلكتروني. سجّل الدخول ببريدك الإلكتروني وكلمة المرور.")
  assert.equal(loginInfoText("en", "confirmation-resent"), "Confirmation email sent again. Check your inbox.")
  assert.equal(loginErrorText("en", "password-required"), "Enter your password.")
  assert.equal(loginErrorText("ar", "password-required"), "أدخل كلمة المرور.")
})

test("a client message that is not an error code is not shown as-is", () => {
  assert.equal(issueFromClientMessage("wrong-credentials"), "wrong-credentials")
  assert.equal(issueFromClientMessage(AUTH_MESSAGE.offline), "offline")
  assert.equal(issueFromClientMessage("Google sign-in isn't set up yet. Please use email for now."), "disabled")
  assert.equal(issueFromClientMessage("This site isn't allowed to receive Google sign-ins yet. Please use email for now."), "disabled")
  const raw = "<script>alert(1)</script> invalid login credentials"
  assert.equal(issueFromClientMessage(raw), "wrong-credentials")
  assert.equal(loginErrorText("ar", issueFromClientMessage(raw)).includes("<script>"), false)
  assert.equal(issueFromClientMessage("totally unexpected provider boom"), "unknown")
  assert.equal(loginErrorText("en", "unknown").includes("boom"), false)
})
