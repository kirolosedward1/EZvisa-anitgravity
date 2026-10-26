import assert from "node:assert/strict"
import { test } from "node:test"
import { appleSignInEnabled } from "./apple-signin-flag.ts"

const ENV = "NEXT_PUBLIC_APPLE_SIGNIN_ENABLED"

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

test("Apple sign-in stays off unless the public flag is exactly true", () => {
  withFlag(undefined, () => assert.equal(appleSignInEnabled(), false))
  for (const off of ["", "false", "TRUE", "True", "1", "yes", " true "]) {
    withFlag(off, () => assert.equal(appleSignInEnabled(), false, JSON.stringify(off)))
  }
  withFlag("true", () => assert.equal(appleSignInEnabled(), true))
})
