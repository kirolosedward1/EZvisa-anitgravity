import { LocaleLink } from "@/components/locale-link"
import { Check, Upload } from "lucide-react"
import { DashboardCard, DashboardCardHeader } from "@/components/dashboard/dashboard-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { getDocumentProgress, getStage, isPaid, REQUIRED_DOCUMENTS } from "@/lib/application-status"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { DOC_FLAG, REQUIREMENTS, parseNotes, requiredFlags } from "@/lib/shared/wizard-contract"
import { DocumentUploadPanel } from "@/components/dashboard/document-upload-panel"
import type { VisaApplication } from "@/lib/types/visa-application"

const DOC_LABEL: Record<(typeof REQUIRED_DOCUMENTS)[number]["key"], { title: CustomerKey; hint: CustomerKey }> = {
  has_passport: { title: "docs.passport", hint: "docs.passportHint" },
  has_photos: { title: "docs.photo", hint: "docs.photoHint" },
  has_bank_statements: { title: "docs.bank", hint: "docs.bankHint" },
  has_employment_proof: { title: "docs.job", hint: "docs.jobHint" },
}

export function DocumentChecklist({ app, arabic }: { app: VisaApplication; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const token = app.tracking_token ?? ""
  // While documents are still being collected, each row uploads directly (same rows as the upload desk and the app).
  const stage = getStage(app)
  if (token && isPaid(app) && (stage === "documents" || stage === "review")) {
    const notes = parseNotes(app.additional_notes)
    const needed = requiredFlags(notes.wizard?.employmentStatus ?? notes.employmentStatus)
    const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && needed.includes(DOC_FLAG[r.document_type]))
    const status = Object.fromEntries(needed.map((flag) => [flag, !!app[flag]]))
    return <DocumentUploadPanel token={token} rows={rows} status={status} />
  }
  const { received, total } = getDocumentProgress(app)
  const percent = Math.round((received / total) * 100)

  return (
    <DashboardCard aria-label={customerText(locale, "docs.title")}>
      <DashboardCardHeader
        title={customerText(locale, "docs.title")}
        description={customerText(locale, "docs.count", { n: received, total })}
        action={
          received < total ? (
            <LocaleLink
              href={`/track/${token}/upload`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Upload className="size-4" aria-hidden="true" />
              {customerText(locale, "docs.upload")}
            </LocaleLink>
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
          aria-label={customerText(locale, "docs.progress")}
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
                  <p className="text-sm font-medium text-foreground">{customerText(locale, DOC_LABEL[doc.key].title)}</p>
                  <p className="truncate text-xs text-muted-foreground">{customerText(locale, DOC_LABEL[doc.key].hint)}</p>
                </div>
              </div>
              {isReceived ? (
                <StatusBadge tone="success">{customerText(locale, "docs.received")}</StatusBadge>
              ) : (
                <LocaleLink
                  href={`/track/${token}/upload?type=${doc.uploadType}`}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${customerText(locale, "docs.upload")} ${customerText(locale, DOC_LABEL[doc.key].title)}`}
                >
                  <StatusBadge tone="warning" className="transition-colors hover:bg-warning/20">
                    {customerText(locale, "docs.upload")}
                  </StatusBadge>
                </LocaleLink>
              )}
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}
