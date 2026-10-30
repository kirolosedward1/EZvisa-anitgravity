import { LocaleLink } from "@/components/locale-link"
import { Check, ChevronRight, FileText } from "lucide-react"
import { DashPill } from "@/components/dashboard/dash-pill"
import { DocumentUploadPanel } from "@/components/dashboard/document-upload-panel"
import { getStage, isPaid, type Stage } from "@/lib/application-status"
import { formatAedLabel } from "@/lib/currency"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { DOC_FLAG, PRICE_AED } from "@/lib/shared/wizard-contract"
import { DOC_TITLE_KEY, customerDocuments } from "@/lib/dashboard-state"
import type { VisaApplication } from "@/lib/types/visa-application"
import type { DocumentReviews } from "@/lib/document-reviews"

const PREPARED: CustomerKey[] = ["dash.prepCover", "dash.prepFlight", "dash.prepHotel", "dash.prepItinerary"]
const PREPARED_FILE: CustomerKey[] = ["dash.prepCover", "dash.prepForm", "dash.prepFlight", "dash.prepHotel", "dash.prepDayPlan"]
/** "We prepare for you": what EZvisa adds, shown under the customer's own documents. */
function WePrepare({ arabic }: { arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  return (
    <div className="flex flex-col gap-2.5 rounded-b-xl border-t border-[#eef1f6] bg-[#fafbfe] px-5 pb-[18px] pt-4">
      <p className="text-[13px] font-medium text-foreground">{customerText(locale, "dash.wePrepare")}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PREPARED.map((key) => (
          <li key={key} className="flex items-center gap-[7px] text-[13px] text-muted-foreground">
            <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.4} aria-hidden="true" />
            {customerText(locale, key)}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Before payment: what the fee covers, what is paid separately, and the documents to start gathering. */
function BeforePayment({ app, arabic }: { app: VisaApplication; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const amount = formatAedLabel(app.payment_amount || PRICE_AED, locale)
  const covers: [CustomerKey, CustomerKey | null][] = [
    ["dash.coverCheck", "dash.coverCheckBody"],
    ["dash.coverLetter", "dash.coverLetterBody"],
    ["dash.coverBookings", "dash.coverBookingsBody"],
    ["dash.coverItinerary", "dash.coverItineraryBody"],
    ["dash.coverSupport", null],
  ]
  const separate: [CustomerKey, CustomerKey][] = [
    ["dash.embassyFee", "dash.atCentre"],
    ["dash.centreFee", "dash.atCentre"],
    ["dash.insuranceFee", "dash.quotedLater"],
  ]
  const { rows } = customerDocuments(app)
  return (
    <>
      <section aria-label={t("dash.coversTitle", { amount })} className="ez-dash-card grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="ez-dash-section text-foreground">{t("dash.coversTitle", { amount })}</h2>
            <p className="text-[13px] text-muted-foreground">{t("dash.coversBody")}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {covers.map(([title, body]) => (
              <li key={title} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <Check className="mt-1 size-3.5 shrink-0 text-primary" strokeWidth={2.4} aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground">{t(title)}</span>
                  {body ? <span className="text-muted-foreground"> · {t(body)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 rounded-[10px] bg-secondary p-4">
          <p className="text-[13px] font-medium text-foreground">{t("dash.separately")}</p>
          <dl className="flex flex-col gap-1.5 text-[13px]">
            {separate.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(label)}</dt>
                <dd className="whitespace-nowrap text-end text-foreground">{t(value)}</dd>
              </div>
            ))}
          </dl>
          <LocaleLink href="/pricing" className="mt-1 text-[13px] font-medium text-primary hover:underline">{t("dash.pricing")}</LocaleLink>
        </div>
      </section>
      <section aria-label={t("dash.afterTitle", { n: rows.length })} className="ez-dash-card flex flex-wrap items-center gap-4 px-5 py-[18px]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-muted-foreground">
          <FileText className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">{t("dash.afterTitle", { n: rows.length })}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{t("dash.afterBody")}</p>
        </div>
        <LocaleLink href="/documents" className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          {t("dash.fullList")}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </LocaleLink>
      </section>
    </>
  )
}

/** After the documents are in: the customer's received rows, and (once ready) the prepared documents as tiles. */
function YourFile({ app, stage, arabic }: { app: VisaApplication; stage: Stage; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const token = app.tracking_token ?? ""
  const { rows, status } = customerDocuments(app)
  const ready = stage === "ready"
  return (
    <section aria-label={t("dash.yourFile")} className="ez-dash-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-5">
        <div className="flex flex-col gap-1">
          <h2 className="ez-dash-section text-foreground">{t("dash.yourFile")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("dash.yourFileBody", { n: rows.length })}</p>
        </div>
        <DashPill tone={ready ? "success" : "info"}>{t(ready ? "dash.complete" : "dash.inProgress")}</DashPill>
      </div>
      {ready && token ? (
        <ul className="grid grid-cols-2 gap-2.5 px-5 pb-5 sm:grid-cols-5">
          {PREPARED_FILE.map((key) => (
            <li key={key}>
              <LocaleLink href={`/track/${token}/dossier`} className="flex h-full flex-col gap-2 rounded-[10px] border border-border bg-background p-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-[#f7f9fd]">
                <span className="flex h-16 flex-col gap-1.5 rounded-md bg-secondary p-2.5" aria-hidden="true">
                  <span className="h-1 w-3/4 rounded bg-[#d3dceb]" />
                  <span className="h-1 w-full rounded bg-[#d3dceb]" />
                  <span className="h-1 w-5/6 rounded bg-[#d3dceb]" />
                  <span className="h-1 w-2/3 rounded bg-[#d3dceb]" />
                </span>
                {t(key)}
              </LocaleLink>
            </li>
          ))}
        </ul>
      ) : null}
      <ul>
        {rows.map((row) => {
          const received = status[DOC_FLAG[row.document_type]]
          const title = arabic && DOC_TITLE_KEY[row.document_type] ? t(DOC_TITLE_KEY[row.document_type]) : row.title
          return (
            <li key={row.id} className="flex items-center gap-3 border-t border-[#eef1f6] px-5 py-3 text-sm">
              <span className={received ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e3f5e8] text-[#1a7f37]" : "size-6 shrink-0 rounded-full border-2 border-dashed border-border"}>
                {received ? <Check className="size-3.5" strokeWidth={2.8} aria-hidden="true" /> : null}
              </span>
              <span className="flex-1 font-medium text-foreground">{title}</span>
              <span className="text-[13px] text-muted-foreground">{t(received ? "dash.received" : "dash.waiting")}</span>
            </li>
          )
        })}
      </ul>
      {!ready ? <WePrepare arabic={arabic} /> : null}
    </section>
  )
}

/** The documents section under the next step, shaped by the stage. */
export function DocumentChecklist({ app, arabic, reviews }: { app: VisaApplication; arabic: boolean; reviews?: DocumentReviews }) {
  const stage = getStage(app)
  const token = app.tracking_token ?? ""
  if (stage === "cancelled") return null
  if (!isPaid(app)) return <BeforePayment app={app} arabic={arabic} />
  if (token && (stage === "documents" || stage === "review")) {
    const { rows, status, uploads } = customerDocuments(app, reviews)
    return <DocumentUploadPanel token={token} rows={rows} status={status} reviews={reviews} uploads={uploads} footer={<WePrepare arabic={arabic} />} />
  }
  return <YourFile app={app} stage={stage} arabic={arabic} />
}
