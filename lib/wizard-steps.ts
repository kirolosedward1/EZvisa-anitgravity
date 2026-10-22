// Wizard steps asked BEFORE payment, in the order the website and the app share (lib/shared/wizard-contract.ts).
// Employment and the passport number are asked after payment ("Continue application"); "employment" and "documents"
// stay accepted as legacy URL slugs so old links and saved drafts resume at the right place.
import { parseStep, visibleSteps, STEP_TITLES, type WizardStep } from "@/lib/shared/wizard-contract"

export type { WizardStep }
export { STEP_TITLES, visibleSteps }

export const STEP_TO_NUMBER: Record<WizardStep, number> = {
  personal: 1,
  spouse: 2,
  employment: 3, // legacy: asked after payment now, resumes at trip details
  "trip-details": 3,
  payment: 4,
}

export const NUMBER_TO_STEP: Record<number, WizardStep> = {
  1: "personal",
  2: "spouse",
  3: "trip-details",
  4: "payment",
}

export const LAST_STEP = 4

export function getStepSlug(stepNumber: number): WizardStep {
  return NUMBER_TO_STEP[stepNumber] || "personal"
}

/** Step number for a URL slug; legacy slugs ("employment", "documents") map to the step they resume at. */
export function getStepNumber(slug: string): number {
  return STEP_TO_NUMBER[parseStep(slug)] || 1
}

export function isValidStep(slug: string): boolean {
  const validSteps = ["personal", "spouse", "employment", "trip-details", "payment", "documents"]
  return validSteps.includes(slug)
}
