import { appleMetadataPatch, applePersonName, metadataFullName, type AppleAuthUser } from "./apple-profile"
import { accountBirthDate } from "./account-details"

function httpsPhoto(value: unknown): string {
  if (typeof value !== "string") return ""
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "" } catch { return "" }
}

/** Only fill missing fields; never replace a customer's chosen name/photo or infer a name from an email. */
export function socialMetadataPatch(user: AppleAuthUser): Record<string, unknown> | null {
  if (!user) return null
  const meta = user.user_metadata ?? {}
  const patch: Record<string, unknown> = { ...appleMetadataPatch(user) }
  const identities = (user.identities ?? []).filter(identity => identity.provider === "google" || identity.provider === "apple")
  if (!metadataFullName(meta, user.email) && !patch.full_name) {
    for (const identity of identities) {
      const person = applePersonName(identity.identity_data, user.email)
      if (person) { patch.full_name = person.full; break }
    }
  }
  if (!meta.avatar_path && !httpsPhoto(meta.avatar_url)) {
    const photo = httpsPhoto(meta.picture) || identities.map(identity => httpsPhoto(identity.identity_data?.avatar_url) || httpsPhoto(identity.identity_data?.picture)).find(Boolean)
    if (photo) patch.avatar_url = photo
  }
  if (!accountBirthDate(meta.date_of_birth)) {
    // Standard sign-in normally omits DOB. Accept only a complete calendar date if actually supplied.
    const dob = accountBirthDate(meta.birthdate) || identities.map(identity => accountBirthDate(identity.identity_data?.birthdate) || accountBirthDate(identity.identity_data?.date_of_birth)).find(Boolean)
    if (dob) patch.date_of_birth = dob
  }
  // The authenticated user's email remains authoritative, including Apple's private-relay address.
  return Object.keys(patch).length ? patch : null
}
