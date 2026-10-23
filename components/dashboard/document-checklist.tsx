import Link from "next/link"
import { Check, Upload } from "lucide-react"
import { DashboardCard, DashboardCardHeader } from "@/components/dashboard/dashboard-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getDocumentProgress, REQUIRED_DOCUMENTS } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

export function DocumentChecklist({ app }: { app: VisaApplication }) {
  const token = app.tracking_token ?? ""
  const { received, total } = getDocumentProgress(app)
  const percent = Math.round((received / total) * 100)

  return (
    <DashboardCard aria-label="Supporting documents">
      <DashboardCardHeader
        title="Supporting documents"
        description={`${received} of ${total} received`}
        action={
          received < total ? (
            <Link
              href={`/track/${token}/upload`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Upload className="size-4" aria-hidden="true" />
              Upload
            </Link>
          ) : null
        }
      />

      <div className="px-6 pt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={received}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Documents received"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border/60 px-2 pb-2 pt-3">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const isReceived = Boolean(app[doc.key])
          return (
            <li key={doc.key} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {isReceived ? (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-border" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{doc.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.hint}</p>
                </div>
              </div>
              {isReceived ? (
                <StatusBadge tone="success">Received</StatusBadge>
              ) : (
                <Link
                  href={`/track/${token}/upload?type=${doc.uploadType}`}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Upload ${doc.label.toLowerCase()}`}
                >
                  <StatusBadge tone="warning" className="transition-colors hover:bg-warning/20">
                    Upload
                  </StatusBadge>
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}
