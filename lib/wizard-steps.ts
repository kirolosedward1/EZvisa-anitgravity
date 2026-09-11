export type WizardStep = "personal" | "spouse" | "employment" | "trip-details" | "payment" | "documents"

export const STEP_TO_NUMBER: Record<WizardStep, number> = {
  personal: 1,
  spouse: 2,
  employment: 3,
  "trip-details": 4,
  payment: 5,
  documents: 5, // Legacy alias mapped to payment
}

export const NUMBER_TO_STEP: Record<number, WizardStep> = {
  1: "personal",
  2: "spouse",
  3: "employment",
  4: "trip-details",
  5: "payment",
}

export function getStepSlug(stepNumber: number): WizardStep {
  return NUMBER_TO_STEP[stepNumber] || "personal"
}

export function getStepNumber(slug: string): number {
  const step = slug as WizardStep
  return STEP_TO_NUMBER[step] || 1
}

export function isValidStep(slug: string): boolean {
  const validSteps: WizardStep[] = ["personal", "spouse", "employment", "trip-details", "payment", "documents"]
  return validSteps.includes(slug as WizardStep)
}
