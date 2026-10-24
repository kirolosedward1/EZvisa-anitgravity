import type { ReactNode } from "react"

const RANGE = /(\d[\d,]*\s*[–\-]\s*\d[\d,]*)/
const IS_RANGE = /^\d[\d,]*\s*[–\-]\s*\d[\d,]*$/

/** Keep each Western digit–digit range left to right inside Arabic text. */
export function DigitRanges({ text }: { text: string }): ReactNode {
  const parts = text.split(RANGE)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    IS_RANGE.test(part) ? (
      <bdi key={index} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    ),
  )
}
