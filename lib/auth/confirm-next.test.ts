import assert from "node:assert/strict"
import { test } from "node:test"
import { AUTH_MESSAGE } from "./errors.ts"
import {
  APP_AUTH_CALLBACK,
  CONFIRM_NEXT_FALLBACK,
  confirmDestination,
  confirmLoginPath,
  safeConfirmNext,
} from "./confirm-next.ts"
import { safeNext } from "./redirect.ts"
import { translations } from "../translations/index.ts"

const fallback = CONFIRM_NEXT_FALLBACK

test("relative next paths are kept", () => {
  assert.equal(safeConfirmNext(null), fallback)
  assert.equal(safeConfirmNext(undefined), fallback)
  assert.equal(safeConfirmNext(""), fallback)
  assert.equal(safeConfirmNext("/dashboard"), "/dashboard")
  assert.equal(safeConfirmNext("/"), "/")
  assert.equal(safeConfirmNext("/ar"), "/ar")
  assert.equal(safeConfirmNext("/ar/dashboard"), "/ar/dashboard")
  assert.equal(safeConfirmNext("/reset-password"), "/reset-password")
  assert.equal(safeConfirmNext("/account?tab=profile"), "/account?tab=profile")
  assert.equal(safeConfirmNext("%2Fdashboard"), "/dashboard")
})

test("open redirects and encoded copies fall back", () => {
  const rejected = [
    "//evil.com",
    "///evil.com",
    "https://evil.com",
    "http://evil.com",
    "https://www.ezvisa.net/dashboard",
    "http://www.ezvisa.net/dashboard",
    "/\\evil.com",
    "/\\\\evil.com",
    "\\/evil.com",
    "/%2Fevil.com",
    "/%2fevil.com",
    "/%5Cevil.com",
    "/%5cevil.com",
    "%2F%2Fevil.com",
    "/%252Fevil.com",
    "/%252f%252fevil.com",
    "https:%2F%2Fevil.com",
    "https:%2f%2fevil.com",
    "/%09/evil.com",
    "/\t/evil.com",
    "javascript:alert(1)",
    "/javascript:alert(1)",
    "javascript:%2F%2Fevil.com",
    "/foo//evil.com",
    "/.//evil.com",
    " /dashboard",
    "/dashboard ",
    "/dashboard\n",
    "/\uFF0Fevil.com",
    "/\u2215evil.com",
    "ezvisa://evil.com",
    "ezvisa://auth/callback.evil.com",
    "ezvisa://auth.evil.com/callback",
    "ezvisa://evil.com/auth/callback",
    "ezvisa://evil.com@auth/callback",
    "ezvisa://auth@evil.com/callback",
    "ezvisa://auth/callback/extra",
    "ezvisa://auth/callback?type=magiclink&next=https://evil.com",
    "ezvisa://auth/callback?next=https://evil.com",
    "ezvisa://auth/Callback",
    "exp://localhost/--/auth/callback",
    "ezvisa://auth/callback%2f%2e%2e%2fevil",
    "ezvisa:\\\\auth\\callback",
  ]
  for (const value of rejected) {
    assert.equal(safeConfirmNext(value), fallback, value)
  }
})

test("the app callback is allowed and canonicalised", () => {
  assert.equal(safeConfirmNext("ezvisa://auth/callback"), APP_AUTH_CALLBACK)
  assert.equal(safeConfirmNext("EZVISA://auth/callback"), APP_AUTH_CALLBACK)
  assert.equal(safeConfirmNext("ezvisa://Auth/callback"), APP_AUTH_CALLBACK)
  assert.equal(safeConfirmNext("ezvisa://auth/callback?type=magiclink"), `${APP_AUTH_CALLBACK}?type=magiclink`)
  assert.equal(safeConfirmNext("ezvisa://auth/callback?type=signup"), `${APP_AUTH_CALLBACK}?type=signup`)
  assert.equal(safeConfirmNext("ezvisa://auth/callback?type=recovery"), `${APP_AUTH_CALLBACK}?type=recovery`)
  assert.equal(safeConfirmNext("ezvisa%3A%2F%2Fauth%2Fcallback"), APP_AUTH_CALLBACK)
  assert.equal(safeConfirmNext("ezvisa://auth/callback?type=javascript"), fallback)
})

test("recovery stays on the reset page unless the link is handing off to the app", () => {
  assert.equal(confirmDestination("recovery", "/dashboard"), "/reset-password")
  assert.equal(confirmDestination("recovery", "//evil.com"), "/reset-password")
  assert.equal(confirmDestination("recovery", "/ar/dashboard"), "/ar/reset-password")
  assert.equal(confirmDestination("recovery", null, true), "/ar/reset-password")
  assert.equal(
    confirmDestination("recovery", "ezvisa://auth/callback?type=recovery"),
    `${APP_AUTH_CALLBACK}?type=recovery`,
  )
})

test("arabic next is preserved, and a bad next does not switch the sign-in page to Arabic", () => {
  assert.equal(confirmDestination("magiclink", "/ar/apply"), "/ar/apply")
  assert.equal(confirmDestination("signup", "/dashboard", true), "/ar/dashboard")
  assert.equal(confirmDestination("magiclink", "https://evil.com"), fallback)
  assert.equal(confirmLoginPath("/ar/dashboard"), "/ar/login")
  assert.equal(confirmLoginPath("//evil.com"), "/login")
  assert.equal(confirmLoginPath("/%2Fevil.com"), "/login")
  assert.equal(confirmLoginPath(null, true), "/ar/login")
})

test("the existing callback helper is unchanged and still rejects the app scheme", () => {
  assert.equal(safeNext("ezvisa://auth/callback"), "/dashboard")
  assert.equal(safeNext("//evil.com"), "/dashboard")
  assert.equal(safeNext("https://evil.com"), "/dashboard")
  assert.equal(safeNext("/apply"), "/apply")
})

test("the expired-link copy matches the auth message and has an Arabic translation", () => {
  assert.equal(translations.en.auth.linkExpired, AUTH_MESSAGE["link-expired"])
  assert.equal(
    translations.ar.auth.linkExpired,
    "انتهت صلاحية هذا الرابط أو سبق استخدامه. اطلب رابطًا جديدًا.",
  )
})
