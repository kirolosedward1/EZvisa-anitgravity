import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
          className="inline-flex items-center gap-1 rounded-full bg-[#FFF4EC] px-2.5 py-0.5 text-xs font-medium text-[#B83200]"
        >
          <span className="max-[360px]:hidden">{next.label}</span>
          <span className="hidden max-[360px]:inline-flex items-center gap-1">
            {narrowNextLabel()}
            <ArrowRight className="size-3" aria-hidden="true" />
          </span>
        </Link>
      )}
    </div>
  )
}
