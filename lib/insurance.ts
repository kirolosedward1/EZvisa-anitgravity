/** Optional website insurance preference. It never changes the visa service fee or confirms cover. */
export type InsurancePreference = "quote" | "own"

export function insurancePreference(value: unknown): InsurancePreference | undefined {
  return value === "quote" || value === "own" ? value : undefined
}

export function applicationInsurance(notes: string | null | undefined): InsurancePreference | undefined {
  if (!notes) return undefined
  try {
    const value = JSON.parse(notes)
    return insurancePreference(value?.insurancePreference)
  } catch {
    return undefined
  }
}
