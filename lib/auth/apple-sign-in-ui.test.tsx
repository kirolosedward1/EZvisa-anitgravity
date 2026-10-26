import assert from "node:assert/strict"
import { test } from "node:test"
import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AppleSignInButton } from "../../components/auth/apple-sign-in.tsx"
import { SocialSignIn } from "../../components/auth/social-sign-in.tsx"
import { appleSignInEnabled } from "./apple-signin-flag.ts"

const ENV = "NEXT_PUBLIC_APPLE_SIGNIN_ENABLED"

const NOT_SET_UP = [
  "isn't set up yet",
  "Apple sign-in isn't set up yet. Please use email for now.",
  "تسجيل الدخول باستخدام Apple غير متاح بعد",
  "This site isn't allowed to receive Apple sign-ins yet",
]

function withFlag(value: string | undefined, run: () => void) {
  const previous = process.env[ENV]
  if (value === undefined) delete process.env[ENV]
  else process.env[ENV] = value
  try {
    run()
  } finally {
    if (previous === undefined) delete process.env[ENV]
    else process.env[ENV] = previous
  }
}

function markup(node: ReactElement) {
  return renderToStaticMarkup(node)
}

function englishStack() {
  return markup(createElement(SocialSignIn, {
    next: "/dashboard",
    appleLabel: "Sign in with Apple",
    googleLabel: "Continue with Google",
    linkingNote: "Already have an account? Sign in with the same email first.",
    divider: "or",
  }))
}

function arabicStack() {
  return markup(createElement(SocialSignIn, {
    next: "/dashboard",
    appleLabel: "تسجيل الدخول باستخدام Apple",
    googleLabel: "تسجيل الدخول باستخدام Google",
    linkingNote: "لديك حساب بالفعل؟ سجّل الدخول بالبريد الإلكتروني نفسه أولًا.",
    divider: "أو",
  }))
}

function assertAppleHidden(html: string, appleLabel: string, linkingNote: string, googleLabel: string, divider: string) {
  assert.equal(html.includes(appleLabel), false)
  assert.equal(html.includes(linkingNote), false)
  for (const line of NOT_SET_UP) assert.equal(html.includes(line), false, line)
  assert.equal(html.includes(googleLabel), true)
  assert.equal(html.match(/data-auth-divider=/g)?.length, 1)
  assert.equal(html.includes(`data-auth-divider="${divider}"`), true)
  assert.ok(html.indexOf(googleLabel) < html.indexOf(`data-auth-divider="${divider}"`))
  assert.match(html, /flex w-full min-w-0 flex-col gap-5/)
  assert.equal(html.includes("whitespace-nowrap"), false)
}

test("the Apple button is hidden unless NEXT_PUBLIC_APPLE_SIGNIN_ENABLED is true", () => {
  withFlag(undefined, () => {
    assert.equal(appleSignInEnabled(), false)
    assert.equal(markup(createElement(AppleSignInButton, { label: "Sign in with Apple" })), "")
    assertAppleHidden(englishStack(), "Sign in with Apple", "Already have an account? Sign in with the same email first.", "Continue with Google", "or")
    assertAppleHidden(
      arabicStack(),
      "تسجيل الدخول باستخدام Apple",
      "لديك حساب بالفعل؟ سجّل الدخول بالبريد الإلكتروني نفسه أولًا.",
      "تسجيل الدخول باستخدام Google",
      "أو",
    )
  })

  for (const off of ["", "false", "TRUE", "1", " true "]) {
    withFlag(off, () => {
      assert.equal(appleSignInEnabled(), false, JSON.stringify(off))
      assert.equal(markup(createElement(AppleSignInButton, { label: "Sign in with Apple" })), "", JSON.stringify(off))
      assert.equal(englishStack().includes("Sign in with Apple"), false, JSON.stringify(off))
      assert.equal(englishStack().includes("Already have an account?"), false, JSON.stringify(off))
    })
  }

  withFlag("true", () => {
    assert.equal(appleSignInEnabled(), true)
    const button = markup(createElement(AppleSignInButton, { label: "Sign in with Apple" }))
    assert.equal(button.includes("Sign in with Apple"), true)
    assert.equal(button.includes("isn't set up yet"), false)

    const en = englishStack()
    assert.equal(en.includes("Sign in with Apple"), true)
    assert.equal(en.includes("Continue with Google"), true)
    assert.equal(en.includes("Already have an account? Sign in with the same email first."), true)
    assert.equal(en.includes("isn't set up yet"), false)
    assert.equal(en.match(/data-auth-divider=/g)?.length, 1)
    assert.ok(en.indexOf("Sign in with Apple") < en.indexOf("Continue with Google"))
    assert.ok(en.indexOf("Continue with Google") < en.indexOf("Already have an account?"))
    assert.ok(en.indexOf("Already have an account?") < en.indexOf('data-auth-divider="or"'))

    const ar = arabicStack()
    assert.equal(ar.includes("تسجيل الدخول باستخدام Apple"), true)
    assert.equal(ar.includes("تسجيل الدخول باستخدام Google"), true)
    assert.equal(ar.includes("لديك حساب بالفعل؟ سجّل الدخول بالبريد الإلكتروني نفسه أولًا."), true)
    assert.equal(ar.includes("غير متاح بعد"), false)
    assert.equal(ar.match(/data-auth-divider=/g)?.length, 1)
    assert.ok(ar.indexOf("باستخدام Apple") < ar.indexOf("باستخدام Google"))
  })
})
