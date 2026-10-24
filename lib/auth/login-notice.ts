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

/** Notice for a login URL. Never returns the raw query string. */
export function noticeFromQuery(error: string | null | undefined, type: string | null | undefined): LoginNotice | null {
  if (!error) return null
  if (type === "signup" && error === "other-device") return { tone: "info", code: "email-confirmed" }
  if (isAuthIssue(error)) return { tone: "error", code: error }
  return { tone: "error", code: "unknown" }
}

/** A message handed up from a button, reduced to a code. Unrecognised text is the generic error. */
export function issueFromClientMessage(message: string): AuthIssue {
  if (isAuthIssue(message)) return message
  const known = (Object.keys(AUTH_MESSAGE) as AuthIssue[]).find((key) => AUTH_MESSAGE[key] === message)
  if (known) return known
  if (/isn't set up yet|isn't allowed to receive/i.test(message)) return "disabled"
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
