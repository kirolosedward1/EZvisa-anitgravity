import Image from "next/image"
import { format, parseISO } from "date-fns"
import { CalendarDays, UserRound } from "lucide-react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { NextStepCard } from "@/components/dashboard/next-step-card"
import { ProgressTracker } from "@/components/dashboard/progress-tracker"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getFlagSrc, getStatusLabel, type Stage } from "@/lib/application-status"
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
  const status = getStatusLabel(app)

  return (
    <DashboardCard aria-label={`${app.destination_country} visa application`} className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border/60 shadow-sm">
            <Image
              src={getFlagSrc(app.destination_country)}
              alt={`${app.destination_country} flag`}
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
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
        <StatusBadge tone={status.tone} className="self-start">
          {status.label}
        </StatusBadge>
      </div>

      {stage !== "rejected" && (
        <div className="border-t border-border/60 pt-6">
          <ProgressTracker stage={stage} />
        </div>
      )}

      <NextStepCard app={app} stage={stage} />
    </DashboardCard>
  )
}
