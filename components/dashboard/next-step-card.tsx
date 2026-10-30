import { Globi, type GlobiPose } from "@/components/globi/globi"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight, Download, Printer, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PayNowButton } from "@/components/dashboard/pay-now-button"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { customerProgress, detailsMissing, isPaid, type Stage } from "@/lib/application-status"
import { DOC_TITLE_KEY, customerDocuments } from "@/lib/dashboard-state"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"
import type { VisaApplication } from "@/lib/types/visa-application"
import type { ReactNode } from "react"
import type { DocumentReviews } from "@/lib/document-reviews"

type NextStep = { title: string; body: string; primary?: ReactNode; secondary?: ReactNode; pose: GlobiPose | null }

/** One case, one next action: a title, one primary button and at most one secondary action. */
export function NextStepCard({ app, stage, arabic, reviews }: { app: VisaApplication; stage: Stage; arabic: boolean; reviews?: DocumentReviews }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const token = app.tracking_token ?? ""
  const { missing, total } = customerDocuments(app, reviews)
  const details = isPaid(app) && detailsMissing(app) && !!app.id
  const finishDetails = (variant: "default" | "outline") => (
    <Button asChild variant={variant}>
      <LocaleLink href={`/continue/${app.id}`}>
        {t("dash.finishDetails")}
        <ArrowRight className="rtl:rotate-180" />
      </LocaleLink>
    </Button>
  )

  const step = ((): NextStep => {
    // A document sent back for a new file brings the case back to the customer even while it sits in review.
    switch (stage === "review" && missing.length > 0 ? "documents" : stage) {
      case "payment":
        return {
          title: t("dash.payTitle"),
          body: t("dash.payBody"),
          primary: <PayNowButton applicationId={app.id} trackingToken={token} destination={app.destination_country} amount={app.payment_amount ?? 249} />,
          pose: "shield",
        }
      case "documents": {
        const docs = missing.map((row) => (arabic && DOC_TITLE_KEY[row.document_type] ? t(DOC_TITLE_KEY[row.document_type]) : row.title.toLocaleLowerCase("en"))).join(arabic ? "، " : ", ")
        return {
          title: missing.length === total ? t("dash.uploadAllTitle", { n: total }) : missing.length === 1 ? t("dash.uploadOneTitle") : t("dash.uploadManyTitle", { n: missing.length }),
          body: t(details ? "dash.uploadBodyDetails" : "dash.uploadBody", { docs }),
          primary: (
            <Button asChild>
              <LocaleLink href={`/track/${token}/upload?type=${missing[0]?.document_type ?? ""}`}>
                <Upload />
                {t("status.upload")}
              </LocaleLink>
            </Button>
          ),
          secondary: details ? finishDetails("outline") : null,
          pose: "documents",
        }
      }
      case "review":
        if (details) return { title: t("dash.finishTitle"), body: t("dash.finishBody"), primary: finishDetails("default"), pose: "notes" }
        return { title: t("dash.reviewTitle"), body: t("dash.reviewBody"), pose: "review" }
      case "preparation":
        if (details) return { title: t("dash.finishTitle"), body: t("dash.finishBody"), primary: finishDetails("default"), pose: "notes" }
        return { title: t("dash.prepTitle"), body: t("dash.prepBody"), pose: "stamp" }
      case "ready": {
        const progress = customerProgress(app)
        if (progress.key === "appointment" && app.id) {
          if (progress.finished) {
            return {
              title: t("dash.setTitle"),
              body: t("dash.setBody"),
              primary: (
                <Button asChild variant="outline">
                  <LocaleLink href={`/appointment/${app.id}`}>{t("dash.viewAppt")}</LocaleLink>
                </Button>
              ),
              pose: "celebrate",
            }
          }
          return {
            title: t("dash.apptTitle"),
            body: t("dash.apptBody"),
            primary: (
              <Button asChild>
                <LocaleLink href={`/appointment/${app.id}`}>
                  {t("dash.apptAdd")}
                  <ArrowRight className="rtl:rotate-180" />
                </LocaleLink>
              </Button>
            ),
            pose: "calendar",
          }
        }
        return {
          title: t("dash.readyTitle"),
          body: t("dash.readyBody"),
          primary: (
            <Button asChild>
              <a href={`/api/download-document?token=${token}`}>
                <Download />
                {t("dash.downloadPdf")}
              </a>
            </Button>
          ),
          secondary: (
            <Button asChild variant="outline">
              <LocaleLink href={`/track/${token}/dossier`}>
                <Printer />
                {t("dash.viewPrint")}
              </LocaleLink>
            </Button>
          ),
          pose: "checklist",
        }
      }
      case "cancelled":
        return { title: t("next.cancelledTitle"), body: t("next.cancelledBody"), pose: null }
      case "rejected":
        return {
          title: t("next.rejectedTitle"),
          body: t("next.rejectedBody"),
          primary: (
            <Button asChild>
              <a href={getCaseTrackingWhatsAppUrl(app.id || token, app.destination_country, arabic)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4" />
                {t("next.talk")}
              </a>
            </Button>
          ),
          pose: null,
        }
    }
  })()

  return (
    <div id={stage === "payment" ? "pay" : undefined} className="ez-dash-next">
      {step.pose && <Globi pose={step.pose} className="ez-dash-next-globi" />}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[.06em] text-primary">{t("dash.nextStep")}</p>
          <h3 className="ez-dash-next-title text-foreground">{step.title}</h3>
          <p className="max-w-[34rem] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
        {(step.primary || step.secondary) && (
          <div className="flex flex-wrap items-start gap-2.5">
            {step.primary}
            {step.secondary}
          </div>
        )}
      </div>
    </div>
  )
}
