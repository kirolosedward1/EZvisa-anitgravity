// Apple only sends the person's name the first time they authorize, and they may hide the mailbox behind
// Hide My Email (…@privaterelay.appleid.com). Nothing here invents a name from that relay address.

export const APPLE_RELAY_HOST = "privaterelay.appleid.com"

/** Visible button copy. The Arabic line is Apple's own ar_SA "Sign in with Apple" string. */
export const APPLE_SIGN_IN_LABEL = {
  en: "Sign in with Apple",
  ar: "تسجيل الدخول باستخدام Apple",
} as const

export type AppleIdentity = { provider?: string; identity_data?: Record<string, unknown> | null }

export type AppleAuthUser = {
  email?: string | null
  app_metadata?: { provider?: string; providers?: string[] } | null
  identities?: AppleIdentity[] | null
  user_metadata?: Record<string, unknown> | null
} | null | undefined

export type ApplePersonName = { full: string; first: string; last: string }

export function isAppleRelayEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf("@")
  return at > 0 && trimmed.slice(at + 1) === APPLE_RELAY_HOST
}

export function isAppleAccount(user: AppleAuthUser): boolean {
  if (!user) return false
  if (user.app_metadata?.provider === "apple") return true
  if (user.app_metadata?.providers?.includes("apple")) return true
  return (user.identities ?? []).some((identity) => identity.provider === "apple")
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function pairFrom(value: unknown): { first: string; last: string } | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const first = clean(record.firstName) || clean(record.givenName) || clean(record.first_name) || clean(record.given_name)
  const last = clean(record.lastName) || clean(record.familyName) || clean(record.last_name) || clean(record.family_name)
  if (!first && !last) return null
  return { first, last }
}

function relayLocal(email: string | null | undefined): string {
  if (!email || !isAppleRelayEmail(email)) return ""
  const trimmed = email.trim()
  return trimmed.slice(0, trimmed.lastIndexOf("@"))
}

/** A person's name. Empty when missing, an email address, or only the hidden-relay mailbox id. */
function usableName(value: string, email?: string | null): string {
  if (!value || value.includes("@")) return ""
  const local = relayLocal(email)
  if (local && value.toLowerCase() === local.toLowerCase()) return ""
  return value
}

function splitFull(full: string): { first: string; last: string } {
  const parts = full.split(" ").filter(Boolean)
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") }
}

/**
 * Name Apple (or Supabase, after the first authorization) actually gave us.
 * Later sign-ins omit it; a relay address is not a substitute.
 */
export function applePersonName(
  meta: Record<string, unknown> | null | undefined,
  email?: string | null,
  identities?: AppleIdentity[] | null,
): ApplePersonName | null {
  const sources: Record<string, unknown>[] = []
  if (meta) sources.push(meta)
  for (const identity of identities ?? []) {
    if (identity.provider === "apple" && identity.identity_data) sources.push(identity.identity_data)
  }
  for (const source of sources) {
    const nested = pairFrom(source.name) || pairFrom(source.full_name)
    const first = nested?.first || clean(source.first_name) || clean(source.given_name)
    const last = nested?.last || clean(source.last_name) || clean(source.family_name)
    const explicit = usableName(clean(source.full_name) || (typeof source.name === "string" ? clean(source.name) : ""), email)
    const combined = usableName([first, last].filter(Boolean).join(" "), email)
    const full = explicit || combined
    if (!full) continue
    const split = splitFull(full)
    return { full, first: first || split.first, last: last || split.last }
  }
  return null
}

/** String name for UI. "" when there is nothing safe to show. */
export function metadataFullName(meta: Record<string, unknown> | null | undefined, email?: string | null): string {
  return applePersonName(meta, email)?.full ?? ""
}

/**
 * Metadata to merge after an Apple sign-in. Null when nothing should be written.
 * Never replaces a name the account already has, and never writes the relay mailbox into the name.
 */
export function appleMetadataPatch(user: AppleAuthUser): Record<string, unknown> | null {
  if (!user || !isAppleAccount(user)) return null
  const meta = user.user_metadata ?? {}
  const email = user.email || clean(meta.email) || null
  const person = applePersonName(meta, email, user.identities)
  const patch: Record<string, unknown> = {}
  if (person && !usableName(clean(meta.full_name), email)) {
    patch.full_name = person.full
    patch.name = person.full
    if (person.first) patch.first_name = person.first
    if (person.last) patch.last_name = person.last
  }
  const relay = isAppleRelayEmail(email)
  if (relay && meta.apple_private_email !== true) patch.apple_private_email = true
  if (!relay && meta.apple_private_email === true) patch.apple_private_email = false
  return Object.keys(patch).length ? patch : null
}
