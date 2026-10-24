// Messages for /forgot-password and /signup. Arabic pages never render the raw provider text.
import { classifyAuthError } from "../auth/errors.ts"
import { translations, type Language } from "./index.ts"

/** English keeps the provider sentence. Arabic uses the mapped line, including for Google setup failures. */
export function authFormErrorText(locale: Language, error: unknown): string {
  if (locale === "en") {
    if (typeof error === "string" && error.trim()) return error
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === "string" && message.trim()) return message
    }
  }
  const copy = translations[locale].authForm
  if (typeof error === "string") {
    if (/sign-in isn't set up yet/i.test(error)) return copy.googleUnavailable
    if (/isn't allowed to receive/i.test(error)) return copy.googleRedirect
  }
  return copy.errors[classifyAuthError(error)]
}
