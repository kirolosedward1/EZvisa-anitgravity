// Where /auth/confirm sends someone after a one-time email link.
// Relative `next` values stay on this site. The only absolute destination allowed is the EZvisa app callback
// (ezvisa://auth/callback), so a magic link the app requested can be handed back to the app. Everything else
// (//evil.com, https://evil.com, /\evil.com, encoded copies of those) falls back to the post-login page.

export const CONFIRM_NEXT_FALLBACK = "/dashboard"
export const APP_AUTH_CALLBACK = "ezvisa://auth/callback"

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
  // ASCII path and query only: blocks schemes, backslashes, unicode slashes, and encoded leftovers.
  if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/?]*$/.test(decoded)) return null
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

/** Safe `next` for /auth/confirm: a relative path, the app callback, or `fallback`. */
export function safeConfirmNext(raw: string | null | undefined, fallback = CONFIRM_NEXT_FALLBACK): string {
  return appAuthCallback(raw) ?? relativeConfirmNext(raw) ?? fallback
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
  const relative = relativeConfirmNext(rawNext)
  const arabic = requestArabic || (!!relative && isArabicPath(relative))
  if (type === "recovery") return withLocale("/reset-password", arabic)
  return withLocale(relative ?? CONFIRM_NEXT_FALLBACK, arabic)
}

/** Sign-in page for a link that expired or was already used. Keeps /ar when the link's next path is Arabic. */
export function confirmLoginPath(rawNext: string | null | undefined, requestArabic = false): string {
  const relative = relativeConfirmNext(rawNext)
  const arabic = requestArabic || (!!relative && isArabicPath(relative))
  return withLocale("/login", arabic)
}
