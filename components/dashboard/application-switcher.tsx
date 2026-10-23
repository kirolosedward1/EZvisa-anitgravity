import Link from "next/link"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { getStatusLabel } from "@/lib/application-status"
import { cn } from "@/lib/utils"
import type { VisaApplication } from "@/lib/types/visa-application"

export function ApplicationSwitcher({
  apps,
  activeId,
  hrefFor,
}: {
  apps: VisaApplication[]
  activeId?: string
  hrefFor: (app: VisaApplication) => string
}) {
  if (apps.length < 2) return null

  return (
    <nav aria-label="Your applications" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {apps.map((app) => {
          const isActive = app.id === activeId
          const status = getStatusLabel(app)
          return (
            <li key={app.id}>
              <Link
                href={hrefFor(app)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-left text-foreground transition-colors",
                  isActive ? "border-primary/40 shadow-xs ring-2 ring-primary/15" : "border-border/70 hover:bg-secondary",
                )}
              >
                <CountryFlag iso={SCHENGEN_META[app.destination_country]?.iso} title={app.destination_country} />
                <span className="flex flex-col">
                  <span className="whitespace-nowrap text-sm font-semibold">{app.destination_country}</span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-xs",
                      "text-muted-foreground",
                    )}
                  >
                    {app.full_name} · {status.label}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
