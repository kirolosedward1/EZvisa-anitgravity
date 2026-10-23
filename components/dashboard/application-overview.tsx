import { format, parseISO } from "date-fns"
import { CalendarDays, UserRound } from "lucide-react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { NextStepCard } from "@/components/dashboard/next-step-card"
import { ProgressTracker } from "@/components/dashboard/progress-tracker"
import { StatusPills } from "@/components/dashboard/status-pills"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import type { Stage } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

function formatTravelDates(app: VisaApplication) {
  const start = app.entry_date || app.travel_start_date
  const end = app.exit_date || app.travel_end_date
  if (!start) return "Flexible dates"
  const startText = format(parseISO(start), "MMM d")
  if (!end) return format(parseISO(start), "MMM d, yyyy")
  return `${startText} – ${format(parseISO(end), "MMM d, yyyy")}`
}

export function ApplicationOverview({ app, stage }: { app: VisaApplication; stage: Stage }) {
  return (
    <DashboardCard aria-label={`${app.destination_country} visa application`} className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <CountryFlag iso={SCHENGEN_META[app.destination_country]?.iso} title={app.destination_country} />
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
              {app.destination_country} Schengen visa
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4" aria-hidden="true" />
                {app.full_name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatTravelDates(app)}
              </span>
            </div>
          </div>
        </div>
        <StatusPills app={app} />
      </div>

      {stage !== "rejected" && stage !== "cancelled" && (
        <div className="border-t border-border/60 pt-6">
          <ProgressTracker stage={stage} />
        </div>
      )}

      <NextStepCard app={app} stage={stage} />
    </DashboardCard>
  )
}
