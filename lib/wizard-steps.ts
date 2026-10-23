// Steps asked BEFORE payment, like the EZvisa app: 1 destination (nationality + country), 2 traveller, 4 review and
// pay. Trip details, spouse details, passport and employment are asked after payment on /continue/[id].
// Number 3 (spouse) is kept free so old links and saved progress keep their meaning.
export type WizardStep = "destination" | "personal" | "payment"

export const STEP_TO_NUMBER: Record<WizardStep, number> = {
  destination: 1,
  personal: 2,
  payment: 4,
}

export const NUMBER_TO_STEP: Record<number, WizardStep> = {
  1: "destination",
  2: "personal",
  4: "payment",
}

/** Slugs from earlier versions of the wizard, mapped to the step that now holds their first question. */
const LEGACY_STEPS: Record<string, WizardStep> = {
  "trip-details": "destination",
  spouse: "personal",
}

export function getStepSlug(stepNumber: number): WizardStep {
  return NUMBER_TO_STEP[stepNumber] || "destination"
}

export function getStepNumber(slug: string): number {
  const step = (LEGACY_STEPS[slug] ?? slug) as WizardStep
  return STEP_TO_NUMBER[step] || 1
}

export function isValidStep(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(STEP_TO_NUMBER, slug) || Object.prototype.hasOwnProperty.call(LEGACY_STEPS, slug)
}
