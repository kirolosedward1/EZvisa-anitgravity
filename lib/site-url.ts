/**
 * The official public URL of the site. Every absolute link we send out (emails, payment
 * return URLs, auth redirects, share links) must use this, never localhost or *.vercel.app.
 *
 * NEXT_PUBLIC_SITE_URL (or the older NEXT_PUBLIC_APP_URL) may override it, but in production
 * a localhost override is ignored so a stray dev value can never leak into customer emails.
 */
const OFFICIAL_SITE_URL = "https://www.ezvisa.net"

function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "")
  if (!raw) return OFFICIAL_SITE_URL
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(raw)
  if (isLocal && process.env.NODE_ENV === "production") return OFFICIAL_SITE_URL
  return raw
}

export const SITE_URL = resolveSiteUrl()

/** Absolute URL on the official site, e.g. siteUrl("/dashboard"). */
export function siteUrl(path = "/"): string {
  return SITE_URL + (path.startsWith("/") ? path : `/${path}`)
}
