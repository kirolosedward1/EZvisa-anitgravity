import { LocaleLink } from "@/components/locale-link"
import { CountryFlag } from "@/components/country-flag"
import { ScrollCurrentChip } from "@/components/dashboard/scroll-current-chip"
import { StatusDot } from "@/components/dashboard/dash-pill"
import { SCHENGEN_META } from "@/lib/countries"
import { getStatusLabel } from "@/lib/application-status"
import { needsAttention } from "@/lib/dashboard-state"
import { formatPageDate } from "@/lib/dates"
import { groupTrips } from "@/lib/trips"
import { customerText, statusText } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * Application switcher: a grid of cards with flag, country and a status dot, marked "Needs you" when the case waits
 * on the customer. Applications on the same trip (lib/trips.ts) share one card that opens the traveller who needs
 * attention first. Below 1024px it becomes a horizontal row of chips.
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
  const entries = groupTrips(apps)
  if (entries.length < 2 && entries[0]?.kind === "trip" && entries[0].apps.length === apps.length) {
    // Every application is on one trip: the case page's trip card already lists the travellers.
    return null
  }
  const countryOf = (app: VisaApplication) => (arabic ? SCHENGEN_META[app.destination_country]?.ar || app.destination_country : app.destination_country)

  const card = (key: string, href: string, isActive: boolean, app: VisaApplication, title: string, line: React.ReactNode) => (
    <li key={key} className="min-w-0">
      <LocaleLink
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-[10px] border bg-card px-3.5 py-3 text-start text-foreground transition-colors",
          isActive ? "border-primary ring-[3px] ring-[#edf4ff]" : "border-border hover:bg-[#f7f9fd]",
        )}
      >
        <CountryFlag iso={SCHENGEN_META[app.destination_country]?.iso} title={countryOf(app)} className="size-7" />
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate whitespace-nowrap text-sm font-semibold">{title}</span>
          {line}
        </span>
      </LocaleLink>
    </li>
  )
  const statusLine = (attention: boolean, label: React.ReactNode, tone: Parameters<typeof StatusDot>[0]["tone"]) => (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-xs", attention ? "font-medium text-[#7a4b00]" : "text-muted-foreground")}>
      <StatusDot tone={attention ? "warning" : tone} />
      {label}
    </span>
  )

  return (
    <nav aria-label={customerText(locale, "case.apps")} className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
      <ul className="flex w-max gap-2.5 lg:grid lg:w-auto lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        {entries.map((entry) => {
          if (entry.kind === "single") {
            const app = entry.app
            const status = getStatusLabel(app)
            const attention = needsAttention(app)
            return card(
              app.id ?? app.tracking_token ?? "",
              hrefFor(app),
              app.id === activeId,
              app,
              countryOf(app),
              statusLine(attention, attention ? customerText(locale, "dash.needsYou") : statusText(locale, status.label), status.tone === "warning" ? "neutral" : status.tone),
            )
          }
          const first = entry.apps.find(needsAttention) ?? entry.apps[0]
          const waiting = entry.apps.filter(needsAttention).length
          const start = first.entry_date || first.travel_start_date || ""
          const end = first.exit_date || first.travel_end_date || ""
          const dates = `${formatPageDate(start, arabic)} – ${formatPageDate(end, arabic)}`
          return card(
            entry.key,
            hrefFor(first),
            entry.apps.some((a) => a.id === activeId),
            first,
            customerText(locale, "trip.chip", { country: countryOf(first), n: entry.apps.length }),
            // Dates only (the card is narrow); the amber dot, and "Needs you" for screen readers, mark a trip waiting on the customer.
            statusLine(waiting > 0, <><span>{dates}</span>{waiting > 0 ? <span className="sr-only">{` · ${customerText(locale, "dash.needsYou")}`}</span> : null}</>, "info"),
          )
        })}
      </ul>
      <ScrollCurrentChip />
    </nav>
  )
}
