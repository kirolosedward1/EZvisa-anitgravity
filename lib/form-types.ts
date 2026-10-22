// Shared form data types for the visa application wizard.
// The answers themselves are defined once, for the website and the app, in lib/shared/wizard-contract.ts.
import type { WizardAnswers, Errors } from "@/lib/shared/wizard-contract"

export type FormData = WizardAnswers
export type { CountryVisit, WizardStep, Errors } from "@/lib/shared/wizard-contract"

// Helper type for partial form updates
export type FormDataUpdate = Partial<FormData>

// Field value type for validation
export type FieldValue = FormData[keyof FormData]

/** Error text for a field, or "" when the field is valid. */
export const fieldError = (errors: Errors, field: keyof FormData) => errors[field] ?? ""
