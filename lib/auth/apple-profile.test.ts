import assert from "node:assert/strict"
import { test } from "node:test"
import { EMAIL_RE } from "./errors.ts"
import {
  APPLE_SIGN_IN_LABEL,
  appleMetadataPatch,
  applePersonName,
  isAppleRelayEmail,
  metadataFullName,
} from "./apple-profile.ts"
import { translations } from "../translations/index.ts"

const relay = "xq2k9f7h@privaterelay.appleid.com"

test("the Apple button label is the English HIG line and Apple's Arabic line", () => {
  assert.equal(APPLE_SIGN_IN_LABEL.en, "Sign in with Apple")
  assert.equal(APPLE_SIGN_IN_LABEL.ar, "تسجيل الدخول باستخدام Apple")
  assert.equal(translations.en.authForm.signInApple, APPLE_SIGN_IN_LABEL.en)
  assert.equal(translations.ar.authForm.signInApple, APPLE_SIGN_IN_LABEL.ar)
  assert.equal(translations.en.authForm.signUpApple, "Sign up with Apple")
  assert.equal(translations.en.authForm.signUpGoogle, "Sign up with Google")
  assert.equal(translations.ar.authForm.signUpApple, "التسجيل باستخدام Apple")
  assert.equal(translations.ar.authForm.signUpGoogle, "التسجيل باستخدام Google")
  assert.equal(translations.ar.authForm.signInGoogle, "تسجيل الدخول باستخدام Google")
  assert.equal(translations.en.authForm.orDivider, "or")
  assert.equal(translations.ar.authForm.orDivider, "أو")
  assert.equal(translations.en.authForm.sameEmailFirst, "Already have an account? Sign in with the same email first.")
  assert.equal(translations.ar.authForm.sameEmailFirst, "لديك حساب بالفعل؟ سجّل الدخول بالبريد الإلكتروني نفسه أولًا.")
  assert.equal(/[٠-٩۰-۹]/.test(APPLE_SIGN_IN_LABEL.ar), false)
})

test("a hidden relay address is a real email and is not a person's name", () => {
  assert.equal(isAppleRelayEmail(relay), true)
  assert.equal(isAppleRelayEmail(`  ${relay.toUpperCase()}  `), true)
  assert.equal(isAppleRelayEmail("person@icloud.com"), false)
  assert.equal(isAppleRelayEmail("person@example.com"), false)
  assert.equal(EMAIL_RE.test(relay), true)
  assert.equal(metadataFullName({ full_name: "xq2k9f7h" }, relay), "")
  assert.equal(metadataFullName({ full_name: relay }, relay), "")
  assert.equal(applePersonName({ name: { firstName: "", lastName: "" } }, relay), null)
})

test("a missing Apple name is left blank and a relay address is flagged", () => {
  const patch = appleMetadataPatch({
    email: relay,
    app_metadata: { provider: "apple" },
    user_metadata: {},
  })
  assert.deepEqual(patch, { apple_private_email: true })
  assert.equal(patch && "email" in patch, false)
  assert.equal(patch && "full_name" in patch, false)
})

test("a name Apple sent once is stored, and a later empty sign-in does not erase it", () => {
  const first = appleMetadataPatch({
    email: relay,
    identities: [{ provider: "apple", identity_data: { name: { firstName: "Layla", lastName: "Hassan" } } }],
    user_metadata: {},
  })
  assert.equal(first?.full_name, "Layla Hassan")
  assert.equal(first?.first_name, "Layla")
  assert.equal(first?.last_name, "Hassan")
  assert.equal(first?.apple_private_email, true)

  const again = appleMetadataPatch({
    email: relay,
    app_metadata: { provider: "apple", providers: ["apple"] },
    user_metadata: { full_name: "Layla Hassan", first_name: "Layla", last_name: "Hassan", apple_private_email: true },
  })
  assert.equal(again, null)
})

test("a shared Apple email is not marked as a relay, and other providers are left alone", () => {
  assert.equal(
    appleMetadataPatch({
      email: "layla@icloud.com",
      app_metadata: { provider: "apple" },
      user_metadata: { full_name: "Layla Hassan" },
    }),
    null,
  )
  assert.equal(
    appleMetadataPatch({
      email: relay,
      app_metadata: { provider: "google" },
      user_metadata: {},
    }),
    null,
  )
  assert.deepEqual(
    appleMetadataPatch({
      email: "layla@icloud.com",
      app_metadata: { provider: "apple" },
      user_metadata: { apple_private_email: true },
    }),
    { apple_private_email: false },
  )
})
