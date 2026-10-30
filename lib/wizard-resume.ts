import type { WizardStep } from "./wizard-steps"

export type ResumeDraft = { destination: string; step: WizardStep }

/** Only expose a destination and step in the reminder, never the traveller's personal details. */
export function parseResumeDraft(raw: string | null, savedStep: string | null): ResumeDraft | null {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== "object" || Array.isArray(data)) return null
    const fields = data as Record<string, unknown>
    const value = (key: string) => typeof fields[key] === "string" ? fields[key].trim() : ""
    // A remembered nationality alone is prefilled, not evidence the visitor started a form.
    if (!["destination", "firstName", "lastName", "email", "phone", "cityOfResidence"].some(key => value(key))) return null
    const step = savedStep === "destination" || savedStep === "personal" || savedStep === "payment"
      ? savedStep
      : value("destination") && value("nationality") ? "personal" : "destination"
    return { destination: value("destination"), step }
  } catch { return null }
}

export function showResumeOnPath(pathname: string): boolean {
  const path = pathname.replace(/^\/ar(?=\/|$)/, "") || "/"
  if (path === "/" || path.startsWith("/payment-")) return false
  return !["apply", "continue", "dashboard", "account", "track", "receipt", "trip", "appointment", "login", "signup", "forgot-password", "reset-password", "admin", "staff", "api"].some(route => path === `/${route}` || path.startsWith(`/${route}/`))
}
