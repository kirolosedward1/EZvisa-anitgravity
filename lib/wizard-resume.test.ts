import test from "node:test"
import assert from "node:assert/strict"
import { parseResumeDraft, showResumeOnPath } from "./wizard-resume"

test("empty, corrupt and prefilled-only forms do not become abandoned applications", () => {
  for (const raw of [null, "broken", "null", "[]", "{}", '{"nationality":"EG"}', '{"destination":42}']) assert.equal(parseResumeDraft(raw, "payment"), null)
})
test("saved steps resume exactly; older drafts fall back without exposing personal data", () => {
  const raw = JSON.stringify({ nationality: "EG", destination: "France", firstName: "Test", email: "private@example.com" })
  assert.deepEqual(parseResumeDraft(raw, "payment"), { destination: "France", step: "payment" })
  assert.deepEqual(parseResumeDraft(raw, null), { destination: "France", step: "personal" })
  assert.deepEqual(parseResumeDraft('{"firstName":"Test"}', "invalid"), { destination: "", step: "destination" })
})
test("reminders stay out of the wizard and account flows in both languages", () => {
  for (const path of ["/", "/ar", "/apply", "/ar/apply", "/continue/123", "/dashboard", "/payment-success", "/login", "/track/token/upload", "/ar/account", "/admin/cases", "/staff/token"]) assert.equal(showResumeOnPath(path), false, path)
  for (const path of ["/destinations", "/ar/news", "/pricing"]) assert.equal(showResumeOnPath(path), true, path)
})
