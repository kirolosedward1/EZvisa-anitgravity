import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ChevronRight, ExternalLink, Printer, Receipt, Upload } from "lucide-react"
import { DashboardCard, DashboardCardHeader } from "@/components/dashboard/dashboard-card"
import { CopyButton } from "@/components/dashboard/copy-button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getReference, isPaid, type Stage } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

function formatDate(value?: string, pattern = "MMM d, yyyy") {
  return value ? format(parseISO(value), pattern) : null
}

export function CaseSummary({
  app,
  stage,
  showTrackingLink = true,
}: {
  app: VisaApplication
  stage: Stage
  showTrackingLink?: boolean
}) {
  const token = app.tracking_token ?? ""
  const reference = getReference(token)
  const paid = isPaid(app)

  const links = [
    showTrackingLink && { href: `/track/${token}`, label: "Shareable tracking page", icon: ExternalLink },
    paid && stage !== "ready" && { href: `/track/${token}/upload`, label: "Upload documents", icon: Upload },
    stage === "ready" && { href: `/track/${token}/dossier`, label: "Print visa file (A4)", icon: Printer },
  ].filter(Boolean) as { href: string; label: string; icon: typeof ExternalLink }[]

  return (
    <DashboardCard aria-label="Case summary">
      <DashboardCardHeader title="Case summary" icon={Receipt} />
      <dl className="flex flex-col gap-3 px-6 py-5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="flex items-center gap-1 font-mono font-semibold text-foreground">
            {reference}
            {reference && <CopyButton value={reference} label="Copy reference" />}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Payment</dt>
          <dd>
            <StatusBadge tone={paid ? "success" : "warning"}>{paid ? "Paid" : "Pending"}</StatusBadge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium text-foreground">{app.payment_amount || 249} AED</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Created</dt>
          <dd className="font-medium text-foreground">{formatDate(app.created_at) ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Last update</dt>
          <dd className="font-medium text-foreground">
            {formatDate(app.updated_at || app.created_at, "MMM d, h:mm a") ?? "—"}
          </dd>
        </div>
      </dl>

      {links.length > 0 && (
        <ul className="flex flex-col border-t border-border/60 p-2">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
