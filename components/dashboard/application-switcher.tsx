import { LocaleLink } from "@/components/locale-link"
import { CountryFlag } from "@/components/country-flag"
import { StatusDot } from "@/components/dashboard/dash-pill"
import { SCHENGEN_META } from "@/lib/countries"
import { getStatusLabel } from "@/lib/application-status"
import { needsAttention } from "@/lib/dashboard-state"
import { customerText, statusText } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * Application switcher: a grid of cards with flag, country and a status dot, marked "Needs you" when the case waits
 * on the customer. Below 1024px it becomes a horizontal row of chips.
 */
export function ApplicationSwitcher({
  apps,
  activeId,
  hrefFor,
  arabic,
}: {
  apps: VisaApplication[]
  activeId?: string
  hrefFor: (app: VisaApplication) => string
  arabic: boolean
}) {
  const locale = arabic ? "ar" : "en"
  if (apps.length < 2) return null

  return (
    <nav aria-label={customerText(locale, "case.apps")} className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
      <ul className="flex w-max gap-2.5 lg:grid lg:w-auto lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        {apps.map((app) => {
          const isActive = app.id === activeId
          const status = getStatusLabel(app)
          const attention = needsAttention(app)
          const country = arabic ? SCHENGEN_META[app.destination_country]?.ar || app.destination_country : app.destination_country
          return (
            <li key={app.id} className="min-w-0">
              <LocaleLink
                href={hrefFor(app)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-[10px] border bg-card px-3.5 py-3 text-start text-foreground transition-colors",
                  isActive ? "border-primary ring-[3px] ring-[#edf4ff]" : "border-border hover:bg-[#f7f9fd]",
                )}
              >
                <CountryFlag iso={SCHENGEN_META[app.destination_country]?.iso} title={country} className="size-7" />
                <span className="flex min-w-0 flex-col gap-[3px]">
                  <span className="truncate whitespace-nowrap text-sm font-semibold">{country}</span>
                  <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-xs", attention ? "font-medium text-[#7a4b00]" : "text-muted-foreground")}>
                    <StatusDot tone={attention ? "warning" : status.tone === "warning" ? "neutral" : status.tone} />
                    {attention ? customerText(locale, "dash.needsYou") : statusText(locale, status.label)}
                  </span>
                </span>
              </LocaleLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
