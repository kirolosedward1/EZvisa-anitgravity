import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { calculateRequiredFunds } from './bank-requirements'

test('Spain applies the 2026 minimum per person, then the daily amount for longer stays', () => {
  assert.equal(calculateRequiredFunds('spain', 3, 2).totalForeign, 2197.8)
  assert.equal(calculateRequiredFunds('spain', 10, 1).totalForeign, 1221)
})
test('Italy uses the correct duration band and group amounts', () => {
  for (const [days, people, expected] of [[5,1,269.6],[6,1,269.58],[10,2,526.6],[11,1,455.01],[20,2,940.04],[21,1,792.27],[21,2,953.26]]) {
    assert.equal(calculateRequiredFunds('italy',days,people).totalForeign, expected)
  }
})
test('Accommodation affects France but does not invent a German or Dutch surcharge', () => {
  assert.equal(calculateRequiredFunds('france', 10, 1, true).totalForeign, 650)
  assert.equal(calculateRequiredFunds('france', 10, 1, false).totalForeign, 1200)
  for (const country of ['germany','netherlands']) {
    assert.equal(calculateRequiredFunds(country, 10, 1, true).totalForeign, calculateRequiredFunds(country, 10, 1, false).totalForeign)
  }
})
test('Swiss amounts retain CHF and Greece retains its short-stay minimum', () => {
  assert.equal(calculateRequiredFunds('switzerland', 5, 2).currency, 'CHF')
  assert.equal(calculateRequiredFunds('switzerland', 5, 2).totalForeign, 1000)
  assert.equal(calculateRequiredFunds('greece', 2, 2).totalForeign, 600)
})
