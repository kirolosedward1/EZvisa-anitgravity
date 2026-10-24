import Image from "next/image"
import { format, parseISO } from "date-fns"
import { CalendarClock, CalendarDays, UserRound } from "lucide-react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { NextStepCard } from "@/components/dashboard/next-step-card"
import { ProgressTracker } from "@/components/dashboard/progress-tracker"
import { StatusPills } from "@/components/dashboard/status-pills"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { formatArabicDate } from "@/lib/dates"
import { destinations } from "@/lib/destinations"
import { referenceOf } from "@/lib/shared/wizard-contract"
import { customerText } from "@/lib/translations/customer"
import type { Stage } from "@/lib/application-status"
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
  if (!end) return <bdi dir="ltr">{formatArabicDate(start)}</bdi>
  return (
    <>
      <bdi dir="ltr">{formatArabicDate(start)}</bdi>
      {" – "}
      <bdi dir="ltr">{formatArabicDate(end)}</bdi>
    </>
  )
}

/** The case at a glance: destination photo with flag, name and reference, then progress and the next step. */
export function ApplicationOverview({ app, stage, arabic }: { app: VisaApplication; stage: Stage; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const countryEn = app.destination_country || "Schengen"
  const country = arabic ? SCHENGEN_META[countryEn]?.ar || (countryEn === "Schengen" ? "شنغن" : countryEn) : countryEn
  const photo = destinations.find((d) => d.name === countryEn)?.image
  const reference = app.id ? referenceOf(app.id) : ""

  return (
    <DashboardCard aria-label={customerText(locale, "overview.caseAria", { country })} className="overflow-hidden">
      <div className="photo-card relative h-36 bg-foreground sm:h-44">
        {photo ? <Image src={photo} alt="" fill priority sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F]/85 via-[#0A0F1F]/35 to-[#0A0F1F]/5" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 sm:p-6">
          <CountryFlag iso={SCHENGEN_META[countryEn]?.iso} title={country} className="size-9 shadow-md ring-2 ring-primary-foreground/80" />
          <div className="flex min-w-0 flex-col gap-0.5 text-primary-foreground">
            <h2 className="panel-title panel-title-lg text-primary-foreground">{country}</h2>
            <p className="text-sm text-primary-foreground/80">
              {customerText(locale, "overview.schengen")}
              {reference ? <> · <span className="ltr-isolate tabular-nums">{reference}</span></> : null}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-6">
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

        {app.appointment_at ? (
          <div className="flex items-start gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-foreground">
                {arabic ? (
                  <>
                    {customerText("ar", "overview.appointment")}{" "}
                    <bdi dir="ltr">{formatArabicDate(app.appointment_at, true)}</bdi>
                  </>
                ) : (
                  `Appointment ${format(new Date(app.appointment_at), "EEE, MMM d yyyy 'at' h:mm a")}`
                )}
              </span>
              <span className="text-muted-foreground">
                {[app.appointment_centre, app.appointment_address].filter(Boolean).join(", ")}
                {app.appointment_reference ? ` · ${customerText(locale, "overview.ref")} ${app.appointment_reference}` : ""}
              </span>
            </div>
          </div>
        ) : null}

        {stage !== "rejected" && stage !== "cancelled" && <ProgressTracker stage={stage} arabic={arabic} />}

        <NextStepCard app={app} stage={stage} />
      </div>
    </DashboardCard>
  )
}
