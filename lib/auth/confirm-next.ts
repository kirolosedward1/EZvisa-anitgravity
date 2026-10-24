// Where /auth/confirm sends someone after a one-time email link.
// Relative `next` values stay on this site. An absolute https URL is accepted only when its origin is exactly
// https://www.ezvisa.net or https://ezvisa.net; only the path, query, and hash are kept, and they go through the
// same relative-path check. The app callback (ezvisa://auth/callback) is the other absolute value allowed.
// Everything else (//evil.com, other hosts, userinfo, other ports, lookalikes, encoded copies) falls back.

export const CONFIRM_NEXT_FALLBACK = "/dashboard"
/** `/dashboard` exists, so the Arabic account page is this path (the /ar rewrite of the same page). */
export const ARABIC_ACCOUNT_LANDING = "/ar/dashboard"
export const APP_AUTH_CALLBACK = "ezvisa://auth/callback"

const SITE_ORIGINS = new Set(["https://www.ezvisa.net", "https://ezvisa.net"])

/** Types Supabase accepts on verifyOtp for email links. The 8-digit code uses the same types with `token`, not here. */
export const EMAIL_OTP_TYPES = ["magiclink", "signup", "invite", "recovery", "email_change", "email"] as const
export type ConfirmOtpType = (typeof EMAIL_OTP_TYPES)[number]

const APP_TYPE = new Set<string>(EMAIL_OTP_TYPES)

export function isEmailOtpType(value: string): value is ConfirmOtpType {
  return (EMAIL_OTP_TYPES as readonly string[]).includes(value)
}

export function isArabicPath(path: string): boolean {
  return path === "/ar" || path.startsWith("/ar/")
}

/** Decode percent-encoding a few times. Malformed or still-encoded input is rejected. */
function fullyDecode(input: string): string | null {
  let current = input
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9a-fA-F]{2}/.test(current)) return current
    try {
      const next = decodeURIComponent(current)
      if (next === current) return current
      current = next
    } catch {
      return null
    }
  }
  return /%[0-9a-fA-F]{2}/.test(current) ? null : current
}

function usable(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2048 || raw !== raw.trim()) return null
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null
  return fullyDecode(raw)
}

/**
 * The app callback, canonicalised, or null. Optional `type` is kept only when it is one of EMAIL_OTP_TYPES.
 * Userinfo, other hosts, extra path, fragments, and extra query keys are rejected.
 */
export function appAuthCallback(raw: string | null | undefined): string | null {
  const decoded = usable(raw)
  if (!decoded || !/^ezvisa:\/\//i.test(decoded)) return null
  if (/[\s\\@]/.test(decoded)) return null
  let url: URL
  try {
    url = new URL(decoded)
  } catch {
    return null
  }
  if (url.protocol !== "ezvisa:") return null
  if (url.hostname.toLowerCase() !== "auth") return null
  if (url.pathname !== "/callback") return null
  if (url.username || url.password || url.hash || url.port) return null
  const params = [...url.searchParams.entries()]
  if (params.length > 1) return null
  if (params.length === 0) return APP_AUTH_CALLBACK
  const [key, value] = params[0]
  if (key !== "type" || !APP_TYPE.has(value)) return null
  return `${APP_AUTH_CALLBACK}?type=${value}`
}

/** A same-origin relative path, or null. Does not apply the dashboard fallback. */
export function relativeConfirmNext(raw: string | null | undefined): string | null {
  const decoded = usable(raw)
  if (!decoded || decoded.startsWith("//") || !decoded.startsWith("/")) return null
  // ASCII path, query, and hash only: blocks schemes, backslashes, unicode slashes, and encoded leftovers.
  if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/?#]*$/.test(decoded)) return null
  if (decoded.includes("//") || decoded.includes("\\") || decoded.includes(":")) return null
  try {
    const resolved = new URL(decoded, "https://www.ezvisa.net")
    if (resolved.origin !== "https://www.ezvisa.net") return null
    if (resolved.username || resolved.password) return null
    if (!resolved.pathname.startsWith("/") || resolved.pathname.startsWith("//")) return null
  } catch {
    return null
  }
  return decoded
}

/**
 * Absolute site URL → pathname + search + hash, or null. Origin must be exactly one of SITE_ORIGINS.
 * Userinfo, a non-default port, and any other host (including www.ezvisa.net.evil.com) are rejected.
 */
export function pathFromSiteUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2048 || raw !== raw.trim()) return null
  if (/[\u0000-\u001f\u007f\s\\]/.test(raw)) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  if (url.username || url.password || url.port) return null
  if (url.hostname !== "www.ezvisa.net" && url.hostname !== "ezvisa.net") return null
  if (!SITE_ORIGINS.has(url.origin)) return null
  return relativeConfirmNext(`${url.pathname}${url.search}${url.hash}`)
}

/** Relative path, or a site URL reduced to one, then normalised. Null when neither is safe. */
export function webConfirmNext(raw: string | null | undefined): string | null {
  const relative = relativeConfirmNext(raw) ?? pathFromSiteUrl(raw)
  if (!relative) return null
  return normalizeLanding(relative)
}

/** Safe `next` for /auth/confirm: a web path, the app callback, or `fallback`. */
export function safeConfirmNext(raw: string | null | undefined, fallback = CONFIRM_NEXT_FALLBACK): string {
  return appAuthCallback(raw) ?? webConfirmNext(raw) ?? fallback
}

function withLocale(path: string, arabic: boolean): string {
  if (!arabic || path.startsWith("ezvisa:")) return path
  if (path === "/ar" || path.startsWith("/ar/")) return path
  return path === "/" ? "/ar" : `/ar${path}`
}

/** Page or app URL to open after the link is accepted. Recovery on the website goes to the reset-password page. */
export function confirmDestination(type: string, rawNext: string | null | undefined, requestArabic = false): string {
  const app = appAuthCallback(rawNext)
  if (app) return app
  const relative = webConfirmNext(rawNext)
  const arabic = requestArabic || (!!relative && isArabicPath(relative))
  if (type === "recovery") return withLocale("/reset-password", arabic)
  return withLocale(relative ?? CONFIRM_NEXT_FALLBACK, arabic)
}

/** Sign-in page for a link that expired or was already used. Keeps /ar when the link's next path is Arabic. */
export function confirmLoginPath(rawNext: string | null | undefined, requestArabic = false): string {
  const relative = webConfirmNext(rawNext)
  const arabic = requestArabic || (!!relative && isArabicPath(relative))
  return withLocale("/login", arabic)
}

/**
 * Full path a failed verification redirects to, including `error=link-expired`.
 * When the sanitized `next` is under `/ar`, the page is `/ar/login`, not `/login`.
 */
export function confirmFailureTarget(
  rawNext: string | null | undefined,
  type: string,
  requestArabic = false,
): string {
  const path = confirmLoginPath(rawNext, requestArabic)
  const params = new URLSearchParams()
  params.set("error", "link-expired")
  if (isEmailOtpType(type)) params.set("type", type)
  const relative = webConfirmNext(rawNext)
  if (relative && relative !== CONFIRM_NEXT_FALLBACK) params.set("next", relative)
  return `${path}?${params.toString()}`
}

/** Pages a signed-in customer can land on (the /ar prefix is added by the locale rewrite, not a separate route). */
const PAGES = new Set([
  "/",
  "/about",
  "/account",
  "/admin",
  "/app",
  "/app-return",
  "/apply",
  "/apply/thank-you",
  "/contact",
  "/cookie-policy",
  "/dashboard",
  "/dashboard/continue",
  "/dashboard/upload",
  "/destinations",
  "/disclaimer",
  "/documents",
  "/forgot-password",
  "/how-it-works",
  "/login",
  "/news",
  "/payment-failed",
  "/payment-success",
  "/pricing",
  "/privacy-policy",
  "/refund-policy",
  "/reset-password",
  "/signup",
  "/terms-of-service",
  "/tools",
  "/tools/appointment-guide",
  "/tools/bank-balance-calculator",
  "/tools/schengen-calculator",
  "/videos",
])

function isUsablePage(pathname: string): boolean {
  if (PAGES.has(pathname)) return true
  return (
    /^\/continue\/[^/]+$/.test(pathname) ||
    /^\/destinations\/[^/]+$/.test(pathname) ||
    /^\/documents\/[^/]+$/.test(pathname) ||
    /^\/news\/[^/]+$/.test(pathname) ||
    /^\/receipt\/[^/]+$/.test(pathname) ||
    /^\/track\/[^/]+$/.test(pathname) ||
    /^\/track\/[^/]+\/(?:continue|dossier|upload)$/.test(pathname) ||
    /^\/trip\/[^/]+$/.test(pathname)
  )
}

/** Bare /ar (the homepage rewrite) and any /ar path that is not a real page go to the Arabic account page. */
function normalizeLanding(path: string): string {
  let hash = ""
  const hashAt = path.indexOf("#")
  if (hashAt >= 0) {
    hash = path.slice(hashAt)
    path = path.slice(0, hashAt)
  }
  let search = ""
  const queryAt = path.indexOf("?")
  if (queryAt >= 0) {
    search = path.slice(queryAt)
    path = path.slice(0, queryAt)
  }
  if (path.length > 1) path = path.replace(/\/+$/, "")
  if (path === "/ar") return ARABIC_ACCOUNT_LANDING
  if (path.startsWith("/ar/")) {
    const bare = path.slice(3) || "/"
    if (!isUsablePage(bare)) return ARABIC_ACCOUNT_LANDING
  }
  return `${path}${search}${hash}`
}
