import Image from "next/image"
import { format, parseISO } from "date-fns"
import { CalendarDays, UserRound } from "lucide-react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { NextStepCard } from "@/components/dashboard/next-step-card"
import { ProgressTracker } from "@/components/dashboard/progress-tracker"
import { StatusPills } from "@/components/dashboard/status-pills"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { destinations } from "@/lib/destinations"
import { referenceOf } from "@/lib/shared/wizard-contract"
import type { Stage } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

function formatTravelDates(app: VisaApplication) {
  const start = app.entry_date || app.travel_start_date
  const end = app.exit_date || app.travel_end_date
  if (!start) return "Dates after payment"
  const startText = format(parseISO(start), "MMM d")
  if (!end) return format(parseISO(start), "MMM d, yyyy")
  return `${startText} – ${format(parseISO(end), "MMM d, yyyy")}`
}

/** The case at a glance: destination photo with flag, name and reference, then progress and the next step. */
export function ApplicationOverview({ app, stage }: { app: VisaApplication; stage: Stage }) {
  const country = app.destination_country || "Schengen"
  const photo = destinations.find((d) => d.name === country)?.image
  const reference = app.id ? referenceOf(app.id) : ""

  return (
    <DashboardCard aria-label={`${country} visa application`} className="overflow-hidden">
      <div className="photo-card relative h-36 bg-foreground sm:h-44">
        {photo ? <Image src={photo} alt="" fill priority sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F]/85 via-[#0A0F1F]/35 to-[#0A0F1F]/5" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 sm:p-6">
          <CountryFlag iso={SCHENGEN_META[country]?.iso} title={country} className="size-9 shadow-md ring-2 ring-primary-foreground/80" />
          <div className="flex min-w-0 flex-col gap-0.5 text-primary-foreground">
            <h2 className="panel-title panel-title-lg text-primary-foreground">{country}</h2>
            <p className="text-sm text-primary-foreground/80">
              Schengen visa{reference ? <> · <span className="ltr-isolate tabular-nums">{reference}</span></> : null}
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
              {formatTravelDates(app)}
            </span>
          </div>
          <StatusPills app={app} />
        </div>

        {stage !== "rejected" && stage !== "cancelled" && <ProgressTracker stage={stage} />}

        <NextStepCard app={app} stage={stage} />
      </div>
    </DashboardCard>
  )
}
