import assert from "node:assert/strict"
import { test } from "node:test"
import { AUTH_MESSAGE } from "./errors.ts"
import { POPUP_DONE_PATH, isPopupLanding } from "./popup.ts"
import {
  APP_AUTH_CALLBACK,
  ARABIC_ACCOUNT_LANDING,
  CONFIRM_NEXT_FALLBACK,
  callbackLanding,
  callbackTargetWhenNoCredential,
  confirmDestination,
  confirmFailureTarget,
  confirmLoginPath,
  confirmNextFromQuery,
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
  assert.equal(safeConfirmNext("/ar"), ARABIC_ACCOUNT_LANDING)
  assert.equal(safeConfirmNext("/ar/"), ARABIC_ACCOUNT_LANDING)
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
    "http://www.ezvisa.net/dashboard",
    "http://ezvisa.net/dashboard",
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

test("absolute next is accepted only for the two exact site origins", () => {
  assert.equal(safeConfirmNext("https://www.ezvisa.net/ar/dashboard"), "/ar/dashboard")
  assert.equal(safeConfirmNext("https://www.ezvisa.net/dashboard"), "/dashboard")
  assert.equal(safeConfirmNext("https://ezvisa.net/dashboard"), "/dashboard")
  assert.equal(safeConfirmNext("https://ezvisa.net/apply?step=2"), "/apply?step=2")
  assert.equal(safeConfirmNext("https://WWW.EZVISA.NET/account"), "/account")
  assert.equal(safeConfirmNext("https://www.ezvisa.net:443/dashboard"), "/dashboard")
  assert.equal(safeConfirmNext("https://www.ezvisa.net/dashboard#section"), "/dashboard#section")
  assert.equal(safeConfirmNext("https://www.ezvisa.net/ar/dashboard/"), "/ar/dashboard")
  assert.equal(safeConfirmNext("https://www.ezvisa.net/destinations/france"), "/destinations/france")
  assert.equal(safeConfirmNext("https://ezvisa.net/ar/"), ARABIC_ACCOUNT_LANDING)
  assert.equal(safeConfirmNext("https://www.ezvisa.net/ar"), ARABIC_ACCOUNT_LANDING)
  assert.equal(safeConfirmNext("https://www.ezvisa.net/ar/"), ARABIC_ACCOUNT_LANDING)
  assert.equal(safeConfirmNext("https://www.ezvisa.net/ar/not-a-page"), ARABIC_ACCOUNT_LANDING)
  assert.equal(safeConfirmNext("/ar/nope"), ARABIC_ACCOUNT_LANDING)
  assert.equal(safeConfirmNext("https://www.ezvisa.net/ar/continue/abc"), "/ar/continue/abc")

  const rejected = [
    "https://www.ezvisa.net.evil.com/dashboard",
    "https://www.ezvisa.net.evil.com",
    "https://ezvisa.net.evil.com/ar/dashboard",
    "https://www.ezvisa.net%2eevil.com/dashboard",
    "https://notezvisa.net/dashboard",
    "https://www.ezvisa.net./dashboard",
    "https://user@www.ezvisa.net/dashboard",
    "https://user:pass@ezvisa.net/dashboard",
    "https://www.ezvisa.net:444/dashboard",
    "https://ezvisa.net:8443/ar/dashboard",
    "http://www.ezvisa.net/ar/dashboard",
    "https://evil.com/https://www.ezvisa.net/dashboard",
    "https://www.ezvisa.net/dashboard?next=https://evil.com",
    "https://www.ezvisa.net/dashboard#https://evil.com",
    "https://www.ezvisa.net/%2Fevil.com",
    "https://www.ezvisa.net/\\evil.com",
  ]
  for (const value of rejected) assert.equal(safeConfirmNext(value), fallback, value)

  assert.equal(confirmDestination("magiclink", "https://www.ezvisa.net/ar/dashboard"), "/ar/dashboard")
  assert.equal(confirmDestination("magiclink", "https://www.ezvisa.net/ar/"), ARABIC_ACCOUNT_LANDING)
  assert.equal(confirmDestination("signup", "https://ezvisa.net/apply"), "/apply")
  assert.equal(confirmDestination("recovery", "https://www.ezvisa.net/ar/dashboard"), "/ar/reset-password")
  assert.equal(confirmDestination("recovery", "https://ezvisa.net/reset-password"), "/reset-password")
  assert.equal(confirmLoginPath("https://www.ezvisa.net/ar/dashboard"), "/ar/login")
  assert.equal(confirmLoginPath("https://ezvisa.net/ar/"), "/ar/login")
  assert.equal(confirmLoginPath("https://www.ezvisa.net.evil.com/ar/dashboard"), "/login")
  assert.equal(
    confirmDestination("magiclink", "ezvisa://auth/callback?type=magiclink"),
    `${APP_AUTH_CALLBACK}?type=magiclink`,
  )
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

test("an unencoded next split on & is discarded and falls back to the locale default", () => {
  const split = new URLSearchParams(
    "token_hash=abc&type=magiclink&next=https://www.ezvisa.net/dashboard?a=1&b=2",
  )
  const read = confirmNextFromQuery(split)
  assert.equal(read.rawNext, null)
  assert.equal(read.splitArabic, false)
  assert.equal(confirmDestination("magiclink", read.rawNext, read.splitArabic), "/dashboard")
  assert.equal(split.get("next"), "https://www.ezvisa.net/dashboard?a=1")

  const arabic = new URLSearchParams(
    "token_hash=abc&type=magiclink&next=https://www.ezvisa.net/ar/apply?a=1&b=2",
  )
  const ar = confirmNextFromQuery(arabic)
  assert.equal(ar.rawNext, null)
  assert.equal(ar.splitArabic, true)
  assert.equal(confirmDestination("magiclink", ar.rawNext, ar.splitArabic), ARABIC_ACCOUNT_LANDING)
  assert.equal(confirmDestination("recovery", ar.rawNext, ar.splitArabic), "/ar/reset-password")
  assert.equal(confirmFailureTarget(ar.rawNext, "magiclink", ar.splitArabic), "/ar/login?error=link-expired&type=magiclink")

  const encoded = new URL(
    "https://www.ezvisa.net/auth/confirm?token_hash=abc&type=magiclink&next=" +
      encodeURIComponent("https://www.ezvisa.net/dashboard?a=1&b=2"),
  )
  const kept = confirmNextFromQuery(encoded.searchParams)
  assert.equal(kept.rawNext, "https://www.ezvisa.net/dashboard?a=1&b=2")
  assert.equal(kept.splitArabic, false)
  assert.equal(confirmDestination("magiclink", kept.rawNext, kept.splitArabic), "/dashboard?a=1&b=2")

  const lookalike = new URLSearchParams(
    "token_hash=abc&type=magiclink&next=https://www.ezvisa.net.evil.com/dashboard?a=1&b=2",
  )
  const evil = confirmNextFromQuery(lookalike)
  assert.equal(evil.rawNext, null)
  assert.equal(confirmDestination("magiclink", evil.rawNext, evil.splitArabic), "/dashboard")

  const app = new URLSearchParams(
    "token_hash=abc&type=magiclink&next=ezvisa://auth/callback?type=magiclink&b=2",
  )
  const handedOff = confirmNextFromQuery(app)
  assert.equal(handedOff.rawNext, null)
  assert.equal(confirmDestination("magiclink", handedOff.rawNext, handedOff.splitArabic), "/dashboard")

  const repeated = new URL(
    "https://www.ezvisa.net/auth/confirm?token_hash=abc&type=magiclink&next=" +
      encodeURIComponent("https://www.ezvisa.net/ar/dashboard") +
      "&next=https://evil.com",
  )
  const dup = confirmNextFromQuery(repeated.searchParams)
  assert.equal(dup.rawNext, null)
  assert.equal(dup.splitArabic, true)
  assert.equal(confirmDestination("magiclink", dup.rawNext, dup.splitArabic), ARABIC_ACCOUNT_LANDING)
})

test("a failed verification with an Arabic next goes to the Arabic sign-in page", () => {
  assert.equal(
    confirmFailureTarget("/ar/dashboard", "magiclink"),
    "/ar/login?error=link-expired&type=magiclink&next=%2Far%2Fdashboard",
  )
  assert.equal(
    confirmFailureTarget("https://www.ezvisa.net/ar/apply", "signup"),
    "/ar/login?error=link-expired&type=signup&next=%2Far%2Fapply",
  )
  assert.equal(
    confirmFailureTarget("https://ezvisa.net/ar/", "recovery"),
    "/ar/login?error=link-expired&type=recovery&next=%2Far%2Fdashboard",
  )
  assert.equal(
    confirmFailureTarget("https://www.ezvisa.net/ar/not-a-page", "invite"),
    "/ar/login?error=link-expired&type=invite&next=%2Far%2Fdashboard",
  )
  assert.equal(confirmFailureTarget("/dashboard", "magiclink"), "/login?error=link-expired&type=magiclink")
  assert.equal(confirmFailureTarget("https://www.ezvisa.net/dashboard", "email"), "/login?error=link-expired&type=email")
  assert.equal(confirmFailureTarget("https://evil.com", "magiclink"), "/login?error=link-expired&type=magiclink")
  assert.equal(confirmFailureTarget("https://www.ezvisa.net.evil.com/ar/dashboard", "signup"), "/login?error=link-expired&type=signup")
  assert.equal(confirmFailureTarget("//evil.com", "nope"), "/login?error=link-expired")
  assert.equal(confirmFailureTarget(null, "magiclink", true), "/ar/login?error=link-expired&type=magiclink")
})

test("email callback URLs unwrap to the inner page, and the app scheme stays", () => {
  assert.equal(confirmDestination("magiclink", "/auth/callback?type=magiclink"), "/dashboard")
  assert.equal(confirmDestination("magiclink", "/auth/callback?type=magiclink&next=/apply"), "/apply")
  assert.equal(confirmDestination("signup", "/api/auth/callback?next=/dashboard"), "/dashboard")
  assert.equal(confirmDestination("signup", "/api/auth/callback?next=/account?tab=profile"), "/account?tab=profile")
  assert.equal(
    confirmDestination("magiclink", "https://www.ezvisa.net/auth/callback?type=magiclink&next=%2Fapply"),
    "/apply",
  )
  assert.equal(
    confirmDestination("signup", "https://ezvisa.net/api/auth/callback?next=%2Fdashboard"),
    "/dashboard",
  )
  assert.equal(
    confirmDestination("magiclink", "/auth/callback?next=/api/auth/callback?next=/apply"),
    "/apply",
  )
  assert.equal(
    confirmDestination("magiclink", "/auth/callback?next=" + encodeURIComponent("/api/auth/callback?next=/apply")),
    "/apply",
  )
  assert.equal(
    confirmDestination("magiclink", "/auth/callback?redirect=/account"),
    "/account",
  )
  assert.equal(
    confirmDestination("magiclink", "ezvisa://auth/callback?type=magiclink"),
    `${APP_AUTH_CALLBACK}?type=magiclink`,
  )
  assert.equal(confirmDestination("magiclink", "ezvisa://auth/callback"), APP_AUTH_CALLBACK)
  assert.equal(
    confirmDestination("magiclink", "/auth/callback?next=" + encodeURIComponent("ezvisa://auth/callback?type=magiclink")),
    `${APP_AUTH_CALLBACK}?type=magiclink`,
  )
  assert.equal(confirmDestination("recovery", "/auth/callback?type=recovery"), "/reset-password")
  assert.equal(confirmDestination("recovery", "https://www.ezvisa.net/auth/callback?type=recovery"), "/reset-password")
})

test("unwrapped callback targets reject open redirects", () => {
  const rejected = [
    "/auth/callback?next=https://evil.com",
    "/auth/callback?next=//evil.com",
    "/auth/callback?redirect=//evil.com",
    "/api/auth/callback?next=https://evil.com/steal",
    "/auth/callback?next=" + encodeURIComponent("https://www.ezvisa.net.evil.com/dashboard"),
    "/auth/callback?next=" + encodeURIComponent("/api/auth/callback?next=https://evil.com"),
    "https://evil.com/auth/callback?next=/dashboard",
    "https://www.ezvisa.net.evil.com/auth/callback?next=/apply",
    "https://user@www.ezvisa.net/auth/callback?next=/dashboard",
  ]
  for (const value of rejected) {
    const landed = confirmDestination("magiclink", value)
    assert.equal(landed, "/dashboard", value)
    assert.equal(landed.includes("evil"), false, value)
    assert.equal(callbackTargetWhenNoCredential(true, value, "magiclink").includes("evil"), false, value)
  }
  assert.equal(callbackTargetWhenNoCredential(true, "//evil.com", "magiclink"), "/dashboard")
  assert.equal(callbackTargetWhenNoCredential(true, "https://evil.com", "signup"), "/dashboard")
})

test("a callback with a session continues, and without one shows the expired link", () => {
  assert.equal(callbackTargetWhenNoCredential(true, "/apply", "magiclink"), "/apply")
  assert.equal(callbackTargetWhenNoCredential(true, "/auth/callback?next=/apply", "magiclink"), "/apply")
  assert.equal(callbackTargetWhenNoCredential(true, "/api/auth/callback?next=/account", "signup"), "/account")
  assert.equal(
    callbackTargetWhenNoCredential(false, "/apply", "magiclink"),
    "/login?error=link-expired&type=magiclink&next=%2Fapply",
  )
  assert.equal(callbackTargetWhenNoCredential(false, null, "magiclink"), "/login?error=link-expired&type=magiclink")
  assert.equal(callbackTargetWhenNoCredential(true, "/dashboard", "recovery"), "/reset-password")
  assert.equal(callbackLanding("/apply", "magiclink"), "/apply")
  assert.equal(callbackLanding("/auth/callback?next=https://evil.com", "magiclink"), "/dashboard")
})

test("arabic callback links stay on /ar, including errors and reset-password", () => {
  assert.equal(confirmDestination("magiclink", "/auth/callback?type=magiclink&next=/ar/apply"), "/ar/apply")
  assert.equal(confirmDestination("magiclink", "/auth/callback?locale=ar&next=/dashboard"), "/ar/dashboard")
  assert.equal(confirmDestination("signup", "/api/auth/callback?next=/ar/dashboard"), "/ar/dashboard")
  assert.equal(
    confirmDestination("magiclink", "https://www.ezvisa.net/auth/callback?type=magiclink&locale=ar"),
    "/ar/dashboard",
  )
  assert.equal(confirmDestination("recovery", "/auth/callback?type=recovery&locale=ar"), "/ar/reset-password")
  assert.equal(confirmDestination("recovery", "/auth/callback?next=/ar/account", true), "/ar/reset-password")
  assert.equal(
    confirmFailureTarget("/auth/callback?next=/ar/apply", "magiclink"),
    "/ar/login?error=link-expired&type=magiclink&next=%2Far%2Fapply",
  )
  assert.equal(
    callbackTargetWhenNoCredential(true, "/apply", "magiclink", { locale: "ar" }),
    "/ar/apply",
  )
  assert.equal(
    callbackTargetWhenNoCredential(true, "/dashboard", "recovery", { requestArabic: true }),
    "/ar/reset-password",
  )
  assert.equal(
    callbackTargetWhenNoCredential(false, "/apply", "signup", { locale: "ar" }),
    "/ar/login?error=link-expired&type=signup&next=%2Far%2Fapply",
  )
  assert.equal(
    callbackTargetWhenNoCredential(false, "/ar/dashboard", "magiclink"),
    "/ar/login?error=link-expired&type=magiclink&next=%2Far%2Fdashboard",
  )
  const english = callbackTargetWhenNoCredential(false, "/apply", "magiclink")
  assert.equal(english.startsWith("/login?"), true)
  assert.equal(english.includes("/ar/"), false)
})

test("the expired-link copy matches the auth message and has an Arabic translation", () => {
  assert.equal(translations.en.auth.linkExpired, AUTH_MESSAGE["link-expired"])
  assert.equal(
    translations.ar.auth.linkExpired,
    "انتهت صلاحية هذا الرابط أو سبق استخدامه. اطلب رابطًا جديدًا.",
  )
})

test("popup sign-in lands on the popup page in both languages", () => {
  assert.equal(callbackLanding(POPUP_DONE_PATH, "signup"), POPUP_DONE_PATH)
  assert.equal(callbackLanding(POPUP_DONE_PATH, "signup", { locale: "ar" }), `/ar${POPUP_DONE_PATH}`)
  assert.equal(isPopupLanding(callbackLanding(POPUP_DONE_PATH, "signup", { locale: "ar" })), true)
  assert.equal(isPopupLanding(`${POPUP_DONE_PATH}?x=1`), true)
  assert.equal(isPopupLanding("/auth/popup-done-evil"), false)
  assert.equal(isPopupLanding("/apply?next=/auth/popup-done"), false)
})
