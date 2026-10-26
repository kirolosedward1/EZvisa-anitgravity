import assert from "node:assert/strict"
import { test } from "node:test"
import { dirhamNoun } from "./currency.ts"

/** Last two digits 11–99 take the accusative singular. */
const accusative = [11, 49, 99, 249, 498, 1249, 2099, 10011]

/** Hundreds and thousands stay in the base form. */
const plain = [100, 500, 1000, 2000, 10000, 1200, 2100]

test("amounts whose last two digits are 11–99 take درهمًا", () => {
  for (const amount of accusative) {
    assert.equal(dirhamNoun(amount), "درهمًا", String(amount))
  }
})

test("other amounts keep درهم", () => {
  for (const amount of plain) {
    assert.equal(dirhamNoun(amount), "درهم", String(amount))
  }
})
