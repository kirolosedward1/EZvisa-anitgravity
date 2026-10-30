import assert from "node:assert/strict"
import { test } from "node:test"
import { isRowIn, latestUpload, rowState, toDocumentReviews, uploadRecords } from "./document-reviews.ts"

const reviews = toDocumentReviews([
  { document_type: "photo", status: "rejected", note: "  Plain white background, please.  ", reviewed_at: "2026-03-11T09:10:00.000Z" },
  { document_type: "passportCopy", status: "approved", note: null, reviewed_at: "2026-03-11T09:00:00.000Z" },
  { document_type: "passportCopy", status: "checking", note: null, reviewed_at: "2026-03-10T09:00:00.000Z" },
  { document_type: "bankStatement", status: "unknown", reviewed_at: "2026-03-11T09:00:00.000Z" },
  null,
])

test("reviews: newest per type wins, unknown statuses are dropped, notes are trimmed", () => {
  assert.equal(reviews.passportCopy.status, "approved")
  assert.equal(reviews.photo.note, "Plain white background, please.")
  assert.equal(reviews.bankStatement, undefined)
  assert.deepEqual(toDocumentReviews("not rows"), {})
})

test("row state: flag, review and a newer upload", () => {
  assert.equal(rowState("bankStatement", false, reviews), "missing")
  assert.equal(rowState("bankStatement", true, reviews), "received")
  assert.equal(rowState("passportCopy", true, reviews), "approved")
  // Rejected stands while no newer file arrived, even though the has_* flag is still set.
  assert.equal(rowState("photo", true, reviews, [{ type: "photo", name: "a.jpg", at: "2026-03-10T10:45:00.000Z" }]), "rejected")
  assert.equal(rowState("photo", true, reviews, [{ type: "photo", name: "b.jpg", at: "2026-03-12T08:00:00.000Z" }]), "received")
  assert.equal(isRowIn("rejected"), false)
  assert.equal(isRowIn("checking"), true)
})

test("uploads: newest of a type, never the storage path", () => {
  const notes = JSON.stringify({ uploads: [
    { type: "photo", path: "id/photo_1.jpg", name: "old.jpg", at: "2026-03-10T10:00:00.000Z" },
    { type: "photo", path: "id/photo_2.jpg", name: "new.jpg", at: "2026-03-11T10:00:00.000Z" },
  ] })
  const records = uploadRecords(notes)
  assert.equal(latestUpload(records, "photo")?.name, "new.jpg")
  assert.equal("path" in records[0], false)
  assert.deepEqual(uploadRecords(null), [])
})
