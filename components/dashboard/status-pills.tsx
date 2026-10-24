import { LocaleLink } from "@/components/locale-link"
import { ArrowRight } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getStatusDisplay, narrowNextLabel, nextTaskHref, type ApplicationLike } from "@/lib/application-status"
import { statusText } from "@/lib/translations/customer"

/** Paid pill plus the orange next-step pill. At 360px and below the next step reads "Action required". */
export function StatusPills({ app, arabic }: { app: ApplicationLike; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const { pill, next } = getStatusDisplay(app)

  return (
    <div className="flex flex-wrap items-center gap-2 self-start">
      <StatusBadge tone={pill.tone}>{statusText(locale, pill.label)}</StatusBadge>
      {next && (
        <LocaleLink
          href={nextTaskHref(app, next)}
          className="inline-flex items-center gap-1 rounded-full bg-[#FFF4EC] px-2.5 py-0.5 text-xs font-medium text-[#B83200]"
        >
          <span className="max-[360px]:hidden">{statusText(locale, next.label)}</span>
          <span className="hidden max-[360px]:inline-flex items-center gap-1">
            {statusText(locale, narrowNextLabel())}
            <ArrowRight className="size-3 rtl:rotate-180" aria-hidden="true" />
          </span>
        </LocaleLink>
      )}
    </div>
  )
}
