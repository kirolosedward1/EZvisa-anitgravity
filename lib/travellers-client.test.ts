import assert from "node:assert/strict"
import { test } from "node:test"
import { applyTravellerToWebForm, fetchTravellers, isFreshTravellerForm } from "./travellers-client"

test("switching saved travellers preserves the trip but clears missing personal details", () => {
  const draft = { nationality: "EG", phone: "+971501234567", firstName: "Previous", lastName: "Person", passportNumber: "OLD12345", passportExpiry: "2030-01-01", dateOfBirth: "1980-01-01", cityOfResidence: "Dubai", destination: "France", travelStartDate: "2027-02-10", email: "account@example.com" }
  const next = applyTravellerToWebForm(draft, { id: "new-person", relationship: "other", firstName: "New", lastName: "Traveller", nationality: "India" })
  assert.equal(next.firstName, "New")
  assert.equal(next.nationality, "IN")
  assert.equal(next.passportNumber, "")
  assert.equal(next.passportExpiry, "")
  assert.equal(next.dateOfBirth, "")
  assert.equal(next.phone, "")
  assert.equal(next.cityOfResidence, "")
  assert.equal(next.destination, draft.destination)
  assert.equal(next.travelStartDate, draft.travelStartDate)
  assert.equal(next.email, draft.email)
  assert.equal(draft.passportNumber, "OLD12345")
})

test("non-UAE saved numbers cannot silently reuse the previous traveller's phone", () => {
  const next = applyTravellerToWebForm({ nationality: "EG", phone: "+971501234567" }, { id: "other", relationship: "other", phone: "+201001234567" })
  assert.equal(next.phone, "")
})

test("manually entered names block automatic traveller prefill", () => {
  assert.equal(isFreshTravellerForm({ firstName: "Typed name" }), false)
  assert.equal(isFreshTravellerForm({}), true)
})

test("signed-out traveller requests return an empty list, server failures stay retryable", async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(null, { status: 401 })
    assert.deepEqual(await fetchTravellers(), [])
    globalThis.fetch = async () => new Response(null, { status: 503 })
    await assert.rejects(fetchTravellers(), /Could not load saved travellers/)
    globalThis.fetch = async () => Response.json({ travellers: [{ id: "own-profile", relationship: "self" }] })
    assert.equal((await fetchTravellers())[0].id, "own-profile")
  } finally {
    globalThis.fetch = originalFetch
  }
})
