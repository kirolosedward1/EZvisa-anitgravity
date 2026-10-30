import assert from "node:assert/strict"
import { test } from "node:test"
import { groupTrips, recentEntries, tripKey, tripMates } from "./trips.ts"

const base = { email: "a@x.com", destination_country: "Italy", entry_date: "2026-07-01", exit_date: "2026-07-14", payment_status: "paid", application_status: "reviewing" }
const apps = [
  { ...base, id: "1" },
  { ...base, id: "2", destination_country: "Germany" },
  { ...base, id: "3", email: "A@X.com " },
  { ...base, id: "4", payment_status: "pending" },
  { ...base, id: "5", exit_date: "2026-07-15" },
]

test("trip key needs a paid open case with destination and both dates", () => {
  assert.equal(tripKey(apps[0]), "a@x.com|italy|2026-07-01|2026-07-14")
  assert.equal(tripKey(apps[3]), null)
  assert.equal(tripKey({ ...base, application_status: "cancelled" }), null)
  assert.equal(tripKey({ ...base, entry_date: "" }), null)
})

test("grouping keeps order and puts the trip where its first case was", () => {
  const entries = groupTrips(apps)
  assert.deepEqual(entries.map((e) => (e.kind === "trip" ? e.apps.map((a) => a.id).join("+") : e.app.id)), ["1+3", "2", "4", "5"])
})

test("trip mates include the case itself, or nothing outside a trip", () => {
  assert.deepEqual(tripMates(apps[2], apps).map((a) => a.id), ["1", "3"])
  assert.deepEqual(tripMates(apps[1], apps), [])
})

test("recent entries: first five, the open case swapped in when it is older", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ ...base, id: `m${i}`, destination_country: `C${i}` }))
  const entries = groupTrips(many)
  const ids = (list: ReturnType<typeof recentEntries>) => list.map((e) => (e.kind === "single" ? e.app.id : e.key))
  assert.deepEqual(ids(recentEntries(entries, "m1", 5)), ["m0", "m1", "m2", "m3", "m4"])
  assert.deepEqual(ids(recentEntries(entries, "m7", 5)), ["m0", "m1", "m2", "m3", "m7"])
  assert.deepEqual(ids(recentEntries(entries, undefined, 5)), ["m0", "m1", "m2", "m3", "m4"])
  assert.equal(recentEntries(entries.slice(0, 3), "m7", 5).length, 3)
})
