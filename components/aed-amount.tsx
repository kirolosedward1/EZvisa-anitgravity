import type { ReactNode } from "react"
import { dirhamNoun } from "@/lib/currency"

/** Western digits, no trailing .00. */
export function amountDigits(amount: number): string {
  if (!Number.isFinite(amount)) return ""
  const rounded = Math.round(amount * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/** «249 درهمًا» with only the digits isolated, the same bdi the wizard uses for amounts. */
export function DirhamAmount({ amount }: { amount: number }): ReactNode {
  return (
    <>
      <bdi dir="ltr">{amountDigits(amount)}</bdi> {dirhamNoun(amount)}
    </>
  )
}

/** «ادفع 249 درهمًا». English stays «Pay 249 AED». */
export function payLabel(amount: number, arabic: boolean): ReactNode {
  const digits = amountDigits(amount)
  if (!arabic) return `Pay ${digits} AED`
  return (
    <>
      ادفع <bdi dir="ltr">{digits}</bdi> {dirhamNoun(amount)}
    </>
  )
}
