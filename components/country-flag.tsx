import Image from "next/image"
import type { SVGProps } from "react"
import * as SquareFlags from "country-flag-icons/react/1x1"
import { cn } from "@/lib/utils"
import { flagSrc } from "@/lib/flags"
import { CITIZENSHIP_OPTIONS } from "@/lib/nationalities"
import { SCHENGEN_META } from "@/lib/countries"

type FlagComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element
const SQUARE = SquareFlags as unknown as Record<string, FlagComponent | undefined>

/** ISO alpha-2 → English country name, for the round flag artwork in public/flags (named by country slug). */
const ISO_NAME: Record<string, string> = {
  ...Object.fromEntries(CITIZENSHIP_OPTIONS.map((c) => [c.iso, c.name])),
  ...Object.fromEntries(Object.entries(SCHENGEN_META).map(([name, m]) => [m.iso, name])),
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  BH: "Bahrain",
  KW: "Kuwait",
  OM: "Oman",
  QA: "Qatar",
  RU: "Russia",
  EU: "European Union",
}

/**
 * Round country flag used across the whole website (selectors, menus, cards, dashboard).
 * Pass an ISO alpha-2 code (`iso`) or a country name (`country`). Renders the round artwork from public/flags; a
 * country without artwork gets the same flag cropped to a circle, and an unknown country a neutral circle.
 * Default size is 20px; pass a size class (e.g. "size-6", "size-10") through `className` to change it.
 */
export function CountryFlag({ iso, country, title, className }: { iso?: string | null; country?: string | null; title?: string; className?: string }) {
  const code = iso?.trim().toUpperCase() ?? ""
  const name = country?.trim() || ISO_NAME[code] || ""
  const src = flagSrc(name)
  const label = title || name || undefined
  const frame = cn("relative inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border/60", className)

  if (src) {
    return (
      <span className={frame} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <Image src={src} alt="" fill sizes="48px" className="object-cover" />
      </span>
    )
  }
  const Square = code ? SQUARE[code] : undefined
  return (
    <span className={frame} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {Square ? <Square aria-hidden className="size-full" /> : null}
    </span>
  )
}
