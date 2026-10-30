"use client"

// The upload desk layout shared by /dashboard/upload (signed in, application id) and /track/[token]/upload (secret
// link). Each page loads the case and sends files its own way; this renders the checklist, progress, tips and support.
import { ArrowLeft, Check, Loader2, Lock } from "lucide-react"
import { Globi } from "@/components/globi/globi"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { DocumentSegments, UploadChecklist, checklistRows } from "@/components/documents/upload-checklist"
import { SCHENGEN_META } from "@/lib/countries"
import { isRowIn, type DocumentReviews, type UploadRecord } from "@/lib/document-reviews"
import { DOC_FLAG, REQUIREMENTS, referenceOf } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"

export type DeskApp = {
  id?: string
  destination_country?: string
  full_name?: string
  has_passport?: boolean | null
  has_photos?: boolean | null
  has_bank_statements?: boolean | null
  has_employment_proof?: boolean | null
  application_status?: string
  required?: string[]
  uploads?: UploadRecord[]
  reviews?: DocumentReviews
}

const ALL_FLAGS = ["has_passport", "has_photos", "has_bank_statements", "has_employment_proof"]

export function UploadDesk({
  app,
  loading,
  error,
  backHref,
  onUpload,
}: {
  app: DeskApp | null
  loading: boolean
  /** Shown when the case could not be loaded. */
  error?: string | null
  backHref: string
  onUpload: (file: File, documentType: string) => Promise<void>
}) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const required = app?.required ?? ALL_FLAGS
  const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && required.includes(DOC_FLAG[r.document_type]))
  const status = (app ?? {}) as Record<string, unknown>
  const states = checklistRows(rows, status, app?.reviews, app?.uploads)
  const received = states.filter((s) => isRowIn(s.state)).length
  const allIn = !!app && received === rows.length
  const countryEn = app?.destination_country ?? ""
  const country = arabic ? SCHENGEN_META[countryEn]?.ar || countryEn : countryEn
  const reference = app?.id ? referenceOf(app.id) : ""

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
      <LocaleLink href={backHref} className="inline-flex w-max items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {country ? t("desk.backTo", { country }) : t("desk.back")}
      </LocaleLink>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="ez-dash-h1 text-foreground">{t("desk.title")}</h1>
          {app ? (
            <p className="text-sm text-muted-foreground">
              {[app.full_name, country].filter(Boolean).join(" · ")}
              {reference ? <> · <span className="ltr-isolate tabular-nums">{reference}</span></> : null}
            </p>
          ) : null}
        </div>
        {app ? (
          <div className="flex items-center gap-3.5">
            <span className="text-[13px] text-muted-foreground">{t("desk.count", { n: received, total: rows.length })}</span>
            <DocumentSegments received={received} total={rows.length} label={t("docs.progress")} />
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {loading ? (
            <div className="ez-dash-card flex justify-center py-16" role="status">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">{t("desk.loading")}</span>
            </div>
          ) : app ? (
            <UploadChecklist
              variant="desk"
              rows={rows}
              status={status}
              reviews={app.reviews}
              uploads={app.uploads}
              onUpload={onUpload}
              intro={<p className="px-5 pb-3.5 pt-[18px] text-sm leading-relaxed text-foreground">{t("desk.intro")}</p>}
              footer={
                <div className="flex items-center gap-2 border-t border-[#eef1f6] bg-[#fafbfe] px-5 py-3.5 text-xs text-muted-foreground">
                  <Lock className="size-[15px] shrink-0" aria-hidden="true" />
                  {t("desk.private")}
                </div>
              }
            />
          ) : (
            <p className="ez-dash-card p-6 text-sm text-muted-foreground" role="alert">{error}</p>
          )}
          {allIn ? (
            <div className="ez-dash-card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <Check className="size-4 text-[#1a7f37]" strokeWidth={2.6} aria-hidden="true" />
                {t("desk.allIn")}
              </p>
              <LocaleLink href={backHref} className="text-sm font-medium text-primary hover:underline">{t("desk.back")}</LocaleLink>
            </div>
          ) : null}
        </div>

        <aside aria-label={t("desk.tipsTitle")} className="flex min-w-0 flex-col gap-5">
          <section className="ez-dash-card flex flex-col items-center gap-3 p-5 text-center">
            <Globi pose="documents" className="w-[130px]" />
            <h2 className="ez-dash-panel text-foreground">{t("desk.tipsTitle")}</h2>
            <ul className="w-full text-start">
              {(["desk.tip1", "desk.tip2", "desk.tip3"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2.5 border-t border-[#eef1f6] py-2.5 text-[13px] leading-relaxed text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.2} aria-hidden="true" />
                  {t(key)}
                </li>
              ))}
            </ul>
            <LocaleLink href="/documents" className="text-[13px] font-medium text-primary hover:underline">{t("desk.examples")}</LocaleLink>
          </section>

          <section className="flex flex-col gap-3 px-1">
            <div className="flex flex-col gap-1">
              <h2 className="ez-dash-panel text-foreground">{t("desk.stuckTitle")}</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{t("desk.stuckBody")}</p>
            </div>
            <a
              href={getCaseTrackingWhatsAppUrl(app?.id ?? "", app?.destination_country, arabic)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-[#1A7F37] px-[18px] text-sm font-medium text-white transition-colors hover:bg-[#166C2F]"
            >
              <WhatsAppIcon className="size-4" />
              {t("support.chat")}
            </a>
          </section>
        </aside>
      </div>
    </div>
  )
}
