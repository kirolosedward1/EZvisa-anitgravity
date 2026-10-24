import assert from "node:assert/strict"
import { test } from "node:test"
import { localizePath, signOutAction } from "./route-path.ts"

test("English paths are unchanged", () => {
  assert.equal(localizePath("/apply", false), "/apply")
  assert.equal(localizePath("/apply?to=France", false), "/apply?to=France")
  assert.equal(localizePath("/login?next=/dashboard", false), "/login?next=/dashboard")
})

test("Arabic pages prefix internal routes", () => {
  assert.equal(localizePath("/", true), "/ar")
  assert.equal(localizePath("/apply", true), "/ar/apply")
  assert.equal(localizePath("/apply?to=France", true), "/ar/apply?to=France")
  assert.equal(localizePath("/#faq", true), "/ar/#faq")
  assert.equal(localizePath("/pricing#refunds", true), "/ar/pricing#refunds")
  assert.equal(localizePath("/destinations/france", true), "/ar/destinations/france")
})

test("Arabic paths, API routes, and external URLs are left alone", () => {
  assert.equal(localizePath("/ar", true), "/ar")
  assert.equal(localizePath("/ar/apply", true), "/ar/apply")
  assert.equal(localizePath("/ar/apply?step=payment", true), "/ar/apply?step=payment")
  assert.equal(localizePath("/api/download-document?token=1", true), "/api/download-document?token=1")
  assert.equal(localizePath("https://wa.me/971547109533", true), "https://wa.me/971547109533")
  assert.equal(localizePath("//evil.com", true), "//evil.com")
})

test("next query values stay on the Arabic site", () => {
  assert.equal(localizePath("/login?next=/dashboard", true), "/ar/login?next=%2Far%2Fdashboard")
  assert.equal(localizePath("/login?next=/ar/apply", true), "/ar/login?next=/ar/apply")
  assert.equal(localizePath("/signup?next=/continue/abc", true), "/ar/signup?next=%2Far%2Fcontinue%2Fabc")
})

test("sign-out posts through the locale rewrite", () => {
  assert.equal(signOutAction(false), "/api/auth/signout")
  assert.equal(signOutAction(true), "/ar/api/auth/signout")
})
