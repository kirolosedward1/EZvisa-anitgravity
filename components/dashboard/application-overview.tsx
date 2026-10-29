import { Image } from "@/components/image"
import { format, parseISO } from "date-fns"
import { CalendarDays, UserRound } from "lucide-react"
import { AppointmentCard } from "@/components/dashboard/appointment-card"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { NextStepCard } from "@/components/dashboard/next-step-card"
import { ProgressTracker } from "@/components/dashboard/progress-tracker"
import { StatusPills } from "@/components/dashboard/status-pills"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { ArabicDate } from "@/components/arabic-date"
import { destinations } from "@/lib/destinations"
import { referenceOf } from "@/lib/shared/wizard-contract"
import { customerText } from "@/lib/translations/customer"
import { customerProgress, type Stage } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"
import type { ReactNode } from "react"

function formatTravelDates(app: VisaApplication, arabic: boolean): ReactNode {
  const start = app.entry_date || app.travel_start_date
  const end = app.exit_date || app.travel_end_date
  const locale = arabic ? "ar" : "en"
  if (!start) return customerText(locale, "overview.datesLater")
  if (!arabic) {
    const startText = format(parseISO(start), "MMM d")
    if (!end) return format(parseISO(start), "MMM d, yyyy")
    return `${startText} – ${format(parseISO(end), "MMM d, yyyy")}`
  }
  if (!end) return <ArabicDate value={start} />
  return (
    <>
      <ArabicDate value={start} />
      {" – "}
      <ArabicDate value={end} />
    </>
  )
}

/** The case at a glance: destination photo with flag, name and reference, then progress and the next step. */
export function ApplicationOverview({
  app,
  stage,
  arabic,
  showHelp = false,
}: {
  app: VisaApplication
  stage: Stage
  arabic: boolean
  showHelp?: boolean
}) {
  const locale = arabic ? "ar" : "en"
  const countryEn = app.destination_country || "Schengen"
  const country = arabic ? SCHENGEN_META[countryEn]?.ar || (countryEn === "Schengen" ? "شنغن" : countryEn) : countryEn
  const photo = destinations.find((d) => d.name === countryEn)?.image
  const reference = app.id ? referenceOf(app.id) : ""
  const progress = stage === "rejected" || stage === "cancelled" ? null : customerProgress(app)

  return (
    <DashboardCard aria-label={customerText(locale, "overview.caseAria", { country })} className="ez-case-overview overflow-hidden">
      <div className="ez-case-heading">
        <div>
          <div className="flex items-center gap-3"><CountryFlag iso={SCHENGEN_META[countryEn]?.iso} title={country} className="size-7" /><h2>{country}</h2></div>
          <p>{customerText(locale, "overview.schengen")}{reference ? <> · <span className="ltr-isolate tabular-nums">{reference}</span></> : null}</p>
        </div>
        {photo ? <div className="ez-case-photo"><Image src={photo} alt="" fill sizes="180px" className="object-cover" /></div> : null}
      </div>

      <div className="ez-case-body flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" aria-hidden="true" />
              {app.full_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatTravelDates(app, arabic)}
            </span>
          </div>
          <StatusPills app={app} arabic={arabic} />
        </div>

        <AppointmentCard app={app} arabic={arabic} showHelp={showHelp} />

        <NextStepCard app={app} stage={stage} />

        {progress && <ProgressTracker progress={progress} arabic={arabic} />}
      </div>
    </DashboardCard>
  )
}
