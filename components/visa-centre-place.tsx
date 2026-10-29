import { centrePlace, localizedCentreAddress } from "@/lib/visa-centres"
import { cn } from "@/lib/utils"

/**
 * Provider name, then the street address. Provider names stay in Latin script.
 * This box never renders a map, directions, or coordinate link.
 */
export function VisaCentrePlace({
  centre,
  address,
  locale = "en",
  className,
}: {
  centre?: string | null
  address?: string | null
  locale?: "en" | "ar"
  className?: string
}) {
  const place = centrePlace(centre, address)
  if (!place) return null
  const line = localizedCentreAddress(place.address, locale)

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="font-semibold text-foreground">
        <bdi dir="ltr">{place.provider}</bdi>
      </p>
      {line ? <p className="text-sm leading-relaxed text-muted-foreground">{line}</p> : null}
    </div>
  )
}
