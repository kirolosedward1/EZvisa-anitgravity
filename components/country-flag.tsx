import type { SVGProps } from "react"
import * as Flags from "country-flag-icons/react/3x2"

type FlagComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element

const FLAG_COMPONENTS = Flags as unknown as Record<string, FlagComponent | undefined>

/** SVG flag from country-flag-icons. 20×15, 2px radius, 1px #E3E7EF border. */
export function CountryFlag({ iso, title }: { iso?: string | null; title?: string }) {
  const code = iso?.trim().toUpperCase() ?? ""
  const Flag = code ? FLAG_COMPONENTS[code] : undefined
  if (!Flag) {
    return (
      <span
        aria-hidden
        className="inline-block h-[15px] w-5 shrink-0 rounded-[2px] border border-[#E3E7EF] bg-[#F7F8FA]"
      />
    )
  }
  return (
    <Flag
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className="h-[15px] w-5 shrink-0 rounded-[2px] border border-[#E3E7EF] object-cover"
    />
  )
}
