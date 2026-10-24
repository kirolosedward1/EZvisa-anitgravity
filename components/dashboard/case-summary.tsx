import { LocaleLink } from "@/components/locale-link"
import { format, parseISO } from "date-fns"
import { ChevronRight, ExternalLink, Printer, Receipt, Upload } from "lucide-react"
import { DashboardCard, DashboardCardHeader } from "@/components/dashboard/dashboard-card"
import { CopyButton } from "@/components/dashboard/copy-button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getReference, isPaid, type Stage } from "@/lib/application-status"
import { PRICE_AED, referenceOf } from "@/lib/shared/wizard-contract"
import { isDiscardable } from "@/lib/active-applications"
import { DiscardButton } from "@/components/dashboard/discard-button"
import type { VisaApplication } from "@/lib/types/visa-application"

function formatDate(value?: string, pattern = "MMM d, yyyy") {
  return value ? format(parseISO(value), pattern) : null
}

export function CaseSummary({
  app,
  stage,
  showTrackingLink = true,
  allowDiscard = false,
}: {
  app: VisaApplication
  stage: Stage
  showTrackingLink?: boolean
  allowDiscard?: boolean
}) {
  const token = app.tracking_token ?? ""
  // The id-based reference, the one the app, emails and WhatsApp use; the token form only for rows without an id.
  const reference = app.id ? referenceOf(app.id) : getReference(token)
  const paid = isPaid(app)

  const links = [
    showTrackingLink && { href: `/track/${token}`, label: "Shareable tracking page", icon: ExternalLink },
    paid && stage !== "ready" && { href: `/track/${token}/upload`, label: "Upload documents", icon: Upload },
    stage === "ready" && { href: `/track/${token}/dossier`, label: "Print visa file (A4)", icon: Printer },
    paid && app.id && typeof app.payment_amount === "number" && { href: `/receipt/${app.id}`, label: "View receipt", icon: Receipt },
    paid && app.id && { href: `/trip/${app.id}`, label: "Trip plan", icon: ExternalLink },
  ].filter(Boolean) as { href: string; label: string; icon: typeof ExternalLink }[]

  return (
    <DashboardCard aria-label="Case details">
      <DashboardCardHeader title="Case details" />
      <dl className="flex flex-col gap-3 px-6 pb-5 pt-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="ltr-isolate flex items-center gap-1 font-semibold tabular-nums text-foreground">
            {reference}
            {reference && <CopyButton value={reference} label="Copy reference" />}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Payment</dt>
          <dd>
            <StatusBadge tone={(app.application_status || "").toLowerCase() === "cancelled" ? "neutral" : paid ? "success" : "warning"}>
              {(app.application_status || "").toLowerCase() === "cancelled" ? "Cancelled" : paid ? "Paid" : "Pending"}
            </StatusBadge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="ltr-isolate font-medium tabular-nums text-foreground">{app.payment_amount || PRICE_AED} AED</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Created</dt>
          <dd className="font-medium text-foreground">{formatDate(app.created_at ?? undefined) ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Last update</dt>
          <dd className="font-medium text-foreground">
            {formatDate(app.updated_at || app.created_at || undefined, "MMM d, h:mm a") ?? "—"}
          </dd>
        </div>
      </dl>

      {allowDiscard && app.id && isDiscardable(app) && <DiscardButton applicationId={app.id} />}

      {links.length > 0 && (
        <ul className="flex flex-col border-t border-border/60 p-2">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <LocaleLink
                href={href}
                className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </LocaleLink>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
