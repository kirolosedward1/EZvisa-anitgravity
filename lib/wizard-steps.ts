export type WizardStep = "trip-details" | "personal" | "spouse" | "payment"

export const STEP_TO_NUMBER: Record<WizardStep, number> = {
  "trip-details": 1,
  personal: 2,
  spouse: 3,
  payment: 4,
}

export const NUMBER_TO_STEP: Record<number, WizardStep> = {
  1: "trip-details",
  2: "personal",
  3: "spouse",
  4: "payment",
}

export function getStepSlug(stepNumber: number): WizardStep {
  return NUMBER_TO_STEP[stepNumber] || "trip-details"
}

export function getStepNumber(slug: string): number {
  const step = slug as WizardStep
  return STEP_TO_NUMBER[step] || 1
}

export function isValidStep(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(STEP_TO_NUMBER, slug)
}
