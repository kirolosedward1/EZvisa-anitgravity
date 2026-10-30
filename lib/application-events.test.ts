import assert from "node:assert/strict"
import { test } from "node:test"
import { activityFor, specialistName, toApplicationEvents } from "./application-events.ts"
import { toDocumentReviews } from "./document-reviews.ts"

const notes = JSON.stringify({
  uploads: [
    { type: "passportCopy", path: "p", name: "a.jpg", at: "2026-03-10T10:41:00.000Z" },
    { type: "photo", path: "p", name: "b.jpg", at: "2026-03-10T10:45:00.000Z" },
    { type: "bankStatement", path: "p", name: "c.pdf", at: "2026-03-12T08:00:00.000Z" },
  ],
  specialist: { name: "Layla" },
})
const app = { additional_notes: notes, paid_at: "2026-03-10T08:20:00.000Z", payment_status: "paid", payment_amount: 249 }
const reviews = toDocumentReviews([
  { document_type: "passportCopy", status: "approved", reviewed_at: "2026-03-11T09:00:00.000Z" },
  { document_type: "residencyCopy", status: "approved", reviewed_at: "2026-03-11T09:05:00.000Z" },
  { document_type: "photo", status: "rejected", note: "Plain background", reviewed_at: "2026-03-11T09:10:00.000Z" },
])

test("activity is rebuilt from the row: newest first, same-day uploads and approvals grouped", () => {
  const list = activityFor(app, reviews)
  assert.deepEqual(list.map((e) => e.kind), ["uploaded", "rejected", "approved", "uploaded", "paid"])
  assert.deepEqual(list[2].docs, ["passportCopy", "residencyCopy"])
  assert.equal(list[3].n, 2)
  assert.equal(list[4].amount, 249)
})

test("uploads always come from the row; reviews merge stored events with older review rows", () => {
  const events = toApplicationEvents([
    { kind: "document_uploaded", payload: { document_type: "bankStatement" }, created_at: "2026-03-12T08:00:01.000Z" },
    { kind: "document_reviewed", payload: { document_type: "photo", status: "approved" }, created_at: "2026-03-13T09:00:00.000Z" },
  ])
  const list = activityFor(app, reviews, events)
  // Three uploads in two lines, as without events; no duplicate for the stored bank statement upload.
  assert.deepEqual(list.filter((e) => e.kind === "uploaded").map((e) => e.n), [1, 2])
  // Photo: the stored approval replaces the older rejected review row; passport + residency still come from rows.
  assert.equal(list.some((e) => e.kind === "rejected"), false)
  assert.deepEqual(list.filter((e) => e.kind === "approved").map((e) => e.docs), [["photo"], ["passportCopy", "residencyCopy"]])
})

test("stored events replace the rebuilt lines of the same kind", () => {
  const events = toApplicationEvents([
    { kind: "payment_received", payload: { amount: 249 }, created_at: "2026-03-10T08:21:00.000Z" },
    { kind: "specialist_assigned", payload: { name: "Nour" }, created_at: "2026-03-11T08:00:00.000Z" },
    { kind: "bogus", payload: {}, created_at: "2026-03-11T08:00:00.000Z" },
    { kind: "status_changed", payload: { to: "ready" }, created_at: "not a date" },
  ])
  assert.equal(events.length, 2)
  const list = activityFor(app, reviews, events)
  assert.equal(list.filter((e) => e.kind === "paid").length, 1)
  assert.equal(list.find((e) => e.kind === "paid")!.at, "2026-03-10T08:21:00.000Z")
  assert.equal(specialistName(app, events), "Nour")
  assert.equal(specialistName(app), "Layla")
  assert.equal(specialistName({ additional_notes: null }), "")
})
