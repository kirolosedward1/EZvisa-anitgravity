// Messages for /forgot-password and /signup. Arabic pages never render the raw provider text.
import { classifyAuthError } from "../auth/errors.ts"
import { translations, type Language } from "./index.ts"

/** Localized line for a provider that is switched off or missing from the redirect allow list. */
export function socialSignInError(locale: Language, message: string): string | null {
  const copy = translations[locale].authForm
  if (/apple sign-in isn't set up yet/i.test(message)) return copy.appleUnavailable
  if (/google sign-in isn't set up yet/i.test(message)) return copy.googleUnavailable
  if (/isn't allowed to receive apple/i.test(message)) return copy.appleRedirect
  if (/isn't allowed to receive google/i.test(message)) return copy.googleRedirect
  return null
}

/** English keeps the provider sentence. Arabic uses the mapped line, including for provider setup failures. */
export function authFormErrorText(locale: Language, error: unknown): string {
  if (typeof error === "string") {
    const social = socialSignInError(locale, error)
    if (social) return social
  }
  if (locale === "en") {
    if (typeof error === "string" && error.trim()) return error
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === "string" && message.trim()) return message
    }
  }
  return translations[locale].authForm.errors[classifyAuthError(error)]
}
