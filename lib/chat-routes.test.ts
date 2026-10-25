import assert from "node:assert/strict"
import { test } from "node:test"
import { suppressesChat } from "./chat-routes.ts"

test("auth pages and their Arabic copies suppress the chat bubble", () => {
  for (const path of [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/ar/login",
    "/ar/signup",
    "/ar/forgot-password",
    "/ar/reset-password",
    "/login/",
    "/ar/login?next=/dashboard",
  ]) {
    assert.equal(suppressesChat(path), true, path)
  }
})

test("the rest of the site still shows chat, including the wizard pages that were already hidden", () => {
  assert.equal(suppressesChat("/"), false)
  assert.equal(suppressesChat("/pricing"), false)
  assert.equal(suppressesChat("/contact"), false)
  assert.equal(suppressesChat("/ar"), false)
  assert.equal(suppressesChat("/apply"), true)
  assert.equal(suppressesChat("/continue/abc"), true)
  assert.equal(suppressesChat("/payment-success"), true)
  assert.equal(suppressesChat("/checkout"), true)
  assert.equal(suppressesChat(null), false)
})
