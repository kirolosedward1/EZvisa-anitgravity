import assert from "node:assert/strict"
import { test } from "node:test"
import { groupTrips, tripKey, tripMates } from "./trips.ts"

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
