import assert from "node:assert/strict"
import { test } from "node:test"
import { POST } from "./route"

function leadRequest(phone: unknown) {
  return new Request("http://localhost/api/hubspot/create-lead", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ada@example.com", firstName: "Ada", phone }),
  })
}

test("HubSpot POST returns 400 before queueing an invalid phone", async () => {
  for (const phone of ["50123", "971971501234567", "+201012345678"]) {
    const response = await POST(leadRequest(phone))
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { success: false, message: "Enter a valid phone number." })
  }
})
