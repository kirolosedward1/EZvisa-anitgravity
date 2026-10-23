/**
 * Returns `raw` only when it is a same-site path ("/dashboard?x=1"), otherwise `fallback`.
 * Browsers treat a backslash like a slash, so "/\evil.com" means "//evil.com" (another site): reject backslashes,
 * protocol-relative paths, schemes and control characters.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || typeof raw !== "string") return fallback
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback
  if (raw.includes("\\") || raw.includes(":") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback
  return raw
}
