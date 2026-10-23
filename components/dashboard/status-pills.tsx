import Link from "next/link"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getStatusDisplay, narrowNextLabel, nextTaskHref, type ApplicationLike } from "@/lib/application-status"

/** Paid pill plus the orange next-step pill. At 360px and below the next step reads "Action required". */
export function StatusPills({ app }: { app: ApplicationLike }) {
  const { pill, next } = getStatusDisplay(app)

  return (
    <div className="flex flex-wrap items-center gap-2 self-start">
      <StatusBadge tone={pill.tone}>{pill.label}</StatusBadge>
      {next && (
        <Link
          href={nextTaskHref(app, next)}
          className="inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning"
        >
          <span className="max-[360px]:hidden">{next.label}</span>
          <span className="hidden max-[360px]:inline">{narrowNextLabel()}</span>
        </Link>
      )}
    </div>
  )
}
