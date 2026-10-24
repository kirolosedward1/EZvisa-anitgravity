import type { ReactNode } from "react"
import { formatArabicDate } from "@/lib/dates"

/**
 * An Arabic date flows right to left, so the day is the rightmost part:
 * 24 ← أكتوبر ← 2026 when read from the right.
 * Only digit runs (24, 2026, 12:00) are left-to-right isolates.
 */
export function ArabicDateText({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\d[\d:.]*)/)
  return (
    <bdi dir="rtl">
      {parts.map((part, index) =>
        /^\d/.test(part) ? (
          <bdi key={index} dir="ltr">
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </bdi>
  )
}

export function ArabicDate({
  value,
  withTime = false,
  fallback = null,
}: {
  value?: string | Date | null
  withTime?: boolean
  fallback?: ReactNode
}): ReactNode {
  const formatted = formatArabicDate(value, withTime)
  if (!formatted) return fallback
  return <ArabicDateText text={formatted} />
}
