import assert from "node:assert/strict"
import { test } from "node:test"
import { socialMetadataPatch } from "./social-profile"

test("Google profile fills name and avatar without inventing age", () => {
  assert.deepEqual(socialMetadataPatch({ email: "person@example.com", user_metadata: {}, identities: [{ provider: "google", identity_data: { name: "Test Person", picture: "https://lh3.googleusercontent.com/example", email: "not-the-login@example.com" } }] }), { full_name: "Test Person", avatar_url: "https://lh3.googleusercontent.com/example" })
})

test("customer edits and uploaded avatars take priority over provider data", () => {
  assert.equal(socialMetadataPatch({ user_metadata: { full_name: "Chosen Name", avatar_path: "user/avatar.jpg", date_of_birth: "1990-01-01" }, identities: [{ provider: "google", identity_data: { name: "Provider Name", picture: "https://example.com/photo", birthdate: "1980-01-01" } }] }), null)
})

test("Apple relay accounts retain a real supplied name and never fabricate a photo or age", () => {
  assert.deepEqual(socialMetadataPatch({ email: "random@privaterelay.appleid.com", app_metadata: { provider: "apple" }, user_metadata: {}, identities: [{ provider: "apple", identity_data: { name: { firstName: "Test", lastName: "Person" } } }] }), { full_name: "Test Person", name: "Test Person", first_name: "Test", last_name: "Person", apple_private_email: true })
  assert.deepEqual(socialMetadataPatch({ email: "random@privaterelay.appleid.com", app_metadata: { provider: "apple" }, user_metadata: { full_name: "random" } }), { apple_private_email: true })
})

test("only full valid birthdates and HTTPS provider photos are imported", () => {
  assert.deepEqual(socialMetadataPatch({ user_metadata: { full_name: "Person", birthdate: "1990-01-01", picture: "javascript:alert(1)" } }), { date_of_birth: "1990-01-01" })
  assert.equal(socialMetadataPatch({ user_metadata: { full_name: "Person", birthdate: "--01-01", age: 30, picture: "https://user:password@example.com/photo" } }), null)
})
