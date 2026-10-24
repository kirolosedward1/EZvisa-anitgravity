// What /login shows for ?error= from /auth/confirm and /auth/callback, and for mistakes on the form.
// The query value is an AuthIssue key. Anything else, including raw Supabase text, becomes the generic message.
import { AUTH_MESSAGE, classifyAuthError, isAuthIssue, type AuthIssue } from "./errors.ts"
import { translations, type Language } from "../translations/index.ts"

export type LoginInfoCode = "email-confirmed" | "confirmation-resent"
export type LoginFieldCode = "password-required"
export type LoginErrorCode = AuthIssue | LoginFieldCode

export type LoginNotice =
  | { tone: "error"; code: AuthIssue }
  | { tone: "info"; code: "email-confirmed" }

/**
 * Notice for a login URL. Never returns the raw query string.
 * `errorCode` is Supabase's `error_code` when the page receives it (often with `error=access_denied`).
 */
export function noticeFromQuery(
  error: string | null | undefined,
  type: string | null | undefined,
  errorCode?: string | null,
): LoginNotice | null {
  if (type === "signup" && error === "other-device") return { tone: "info", code: "email-confirmed" }
  // Stale email links arrive as ?error=otp_expired, or as error=access_denied&error_code=otp_expired.
  if (error === "otp_expired" || errorCode === "otp_expired") return { tone: "error", code: "link-expired" }
  if (!error) return null
  if (isAuthIssue(error)) return { tone: "error", code: error }
  return { tone: "error", code: "unknown" }
}

/** A message handed up from a button, reduced to a code. Unrecognised text is the generic error. */
export function issueFromClientMessage(message: string): AuthIssue {
  if (isAuthIssue(message)) return message
  const known = (Object.keys(AUTH_MESSAGE) as AuthIssue[]).find((key) => AUTH_MESSAGE[key] === message)
  if (known) return known
  // Google (and the other providers) report a switched-off option by code, not by an English sentence.
  if (classifyAuthError({ code: message, error_code: message }) === "disabled") return "disabled"
  return classifyAuthError({ message })
}

export function loginErrorText(locale: Language, code: LoginErrorCode): string {
  if (code === "password-required") return translations[locale].auth.passwordRequired
  return translations[locale].auth.errors[code]
}

export function loginInfoText(locale: Language, code: LoginInfoCode): string {
  if (code === "email-confirmed") return translations[locale].auth.emailConfirmed
  return translations[locale].auth.confirmationResent
}
