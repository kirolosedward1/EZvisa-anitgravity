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
function plainWebConfirmNext(raw: string | null | undefined): string | null {
  const relative = relativeConfirmNext(raw) ?? pathFromSiteUrl(raw)
  if (!relative) return null
  return normalizeLanding(relative)
}

const WEB_CALLBACK_PATHS = new Set(["/auth/callback", "/api/auth/callback"])
const MAX_CALLBACK_UNWRAP = 5

/**
 * `/auth/callback` and `/api/auth/callback` are not destinations. Email links put them in `next`
 * (sometimes nested). Peel them back to the inner `next` or `redirect`, checked with the same allowlist.
 * `ezvisa://auth/callback` is not handled here.
 */
function unwrapWebCallback(raw: string | null | undefined, depth = 0): { path: string; arabic: boolean } | null {
  if (!raw || depth > MAX_CALLBACK_UNWRAP) return null
  const parts = webCallbackParts(raw)
  if (!parts) return null
  const arabicHere = parts.prefixedAr || parts.params.get("locale") === "ar"
  if (depth === MAX_CALLBACK_UNWRAP) return settledCallback(null, arabicHere)
  const inner = parts.params.get("next") || parts.params.get("redirect")
  if (!inner) return settledCallback(null, arabicHere)
  const nested = unwrapWebCallback(inner, depth + 1)
  if (nested) return { path: nested.path, arabic: arabicHere || nested.arabic }
  const app = appAuthCallback(inner)
  if (app) return { path: app, arabic: arabicHere }
  return settledCallback(plainWebConfirmNext(inner), arabicHere)
}

function settledCallback(path: string | null, arabic: boolean): { path: string; arabic: boolean } {
  if (!path || path.startsWith("ezvisa:")) {
    if (path?.startsWith("ezvisa:")) return { path, arabic }
    return { path: arabic ? ARABIC_ACCOUNT_LANDING : CONFIRM_NEXT_FALLBACK, arabic }
  }
  const localized = withLocale(path, arabic || isArabicPath(path))
  return { path: localized, arabic: localized === "/ar" || localized.startsWith("/ar/") }
}

/** A same-origin `/auth/callback` or `/api/auth/callback`, including an `/ar` prefix. Anything else is null. */
function webCallbackParts(raw: string): { params: URLSearchParams; prefixedAr: boolean } | null {
  const decoded = usable(raw)
  if (!decoded || appAuthCallback(decoded)) return null
  let url: URL
  if (/^https:\/\//i.test(decoded)) {
    try {
      url = new URL(decoded)
    } catch {
      return null
    }
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null
    if (url.hostname !== "www.ezvisa.net" && url.hostname !== "ezvisa.net") return null
    if (!SITE_ORIGINS.has(url.origin)) return null
  } else if (decoded.startsWith("/") && !decoded.startsWith("//")) {
    if (/[\s\\]/.test(decoded) || /[\u0000-\u001f\u007f]/.test(decoded)) return null
    try {
      url = new URL(decoded, "https://www.ezvisa.net")
    } catch {
      return null
    }
    if (url.origin !== "https://www.ezvisa.net" || url.username || url.password) return null
  } else {
    return null
  }
  let pathname = url.pathname
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "")
  const prefixedAr = pathname === "/ar" || pathname.startsWith("/ar/")
  const bare = prefixedAr ? pathname.slice(3) || "/" : pathname
  const normalized = bare.length > 1 ? bare.replace(/\/+$/, "") : bare
  if (!WEB_CALLBACK_PATHS.has(normalized)) return null
  return { params: url.searchParams, prefixedAr }
}

export function webConfirmNext(raw: string | null | undefined): string | null {
  const unwrapped = unwrapWebCallback(raw)
  if (unwrapped) return unwrapped.path
  return plainWebConfirmNext(raw)
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
  if (relative?.startsWith("ezvisa:")) return relative
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
  if (relative && relative !== CONFIRM_NEXT_FALLBACK && !relative.startsWith("ezvisa:")) params.set("next", relative)
  return `${path}?${params.toString()}`
}

export type CallbackLocale = { locale?: string | null; requestArabic?: boolean }

/** Where /auth/callback should send someone who is already signed in, or who just exchanged a code. */
export function callbackLanding(next: string | null | undefined, type: string, opts: CallbackLocale = {}): string {
  const resolved = webConfirmNext(next)
  if (resolved?.startsWith("ezvisa:")) return resolved
  const arabic = !!opts.requestArabic || opts.locale === "ar" || (!!resolved && isArabicPath(resolved))
  if (type === "recovery") return withLocale("/reset-password", arabic)
  return withLocale(resolved ?? CONFIRM_NEXT_FALLBACK, arabic)
}

/** Login URL for a callback that cannot sign the visitor in. Raw `next` text is never copied through. */
export function callbackFailureTarget(
  issue: string,
  next: string | null | undefined,
  type: string,
  opts: CallbackLocale = {},
): string {
  const landing = callbackLanding(next, "signup", opts)
  const arabic = landing === "/ar" || landing.startsWith("/ar/")
  const path = arabic ? "/ar/login" : "/login"
  const params = new URLSearchParams()
  params.set("error", /^[a-z0-9-]+$/.test(issue) ? issue : "unknown")
  if (isEmailOtpType(type)) params.set("type", type)
  if (landing !== CONFIRM_NEXT_FALLBACK && landing !== path) params.set("next", landing)
  return `${path}?${params.toString()}`
}

/**
 * No `code` and no `token_hash`. A live session continues to the validated page.
 * Otherwise the visitor sees the expired-link message, in /ar when the link was Arabic.
 */
export function callbackTargetWhenNoCredential(
  hasSession: boolean,
  next: string | null | undefined,
  type: string,
  opts: CallbackLocale = {},
): string {
  if (hasSession) return callbackLanding(next, type, opts)
  return callbackFailureTarget("link-expired", next, type, opts)
}

/** Keys this route writes. Any other key, or a repeated key, means an unencoded `next` was split on `&`. */
const CONFIRM_QUERY_KEYS = new Set(["token_hash", "type", "next"])

export type ConfirmQueryNext = {
  /** Null when `next` was absent or discarded because the query string was split. */
  rawNext: string | null
  /** The discarded value still pointed at an /ar path on this site, so the fallback stays Arabic. */
  splitArabic: boolean
}

/**
 * Read `next` from the confirm URL. Go's html/template percent-encodes `{{ .RedirectTo }}` in a query
 * href, so `a=1&b=2` stays inside one parameter. If that value arrives already decoded, the extra `&`
 * pieces become sibling parameters and the first `next` is only a prefix. That prefix is not used.
 */
export function confirmNextFromQuery(searchParams: URLSearchParams): ConfirmQueryNext {
  const nextValues = searchParams.getAll("next")
  const split =
    nextValues.length > 1 ||
    searchParams.getAll("token_hash").length > 1 ||
    searchParams.getAll("type").length > 1 ||
    [...new Set(searchParams.keys())].some((key) => !CONFIRM_QUERY_KEYS.has(key))
  if (!split) return { rawNext: nextValues[0] ?? null, splitArabic: false }
  return { rawNext: null, splitArabic: truncatedNextIsArabic(nextValues[0]) }
}

/** Locale hint only. Never a destination: the value is the part of `next` before the first extra `&`. */
function truncatedNextIsArabic(raw: string | undefined): boolean {
  if (!raw) return false
  const safe = webConfirmNext(raw)
  if (safe) return isArabicPath(safe)
  if (/[\u0000-\u001f\u007f\s\\]/.test(raw)) return false
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false
  if (url.hostname !== "www.ezvisa.net" && url.hostname !== "ezvisa.net") return false
  if (!SITE_ORIGINS.has(url.origin)) return false
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname
  return path === "/ar" || path.startsWith("/ar/")
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
