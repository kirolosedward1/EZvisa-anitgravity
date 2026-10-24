import { LocaleLink } from "@/components/locale-link"
import { ArrowRight, Download, Printer, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PayNowButton } from "@/components/dashboard/pay-now-button"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { detailsMissing, getDocumentProgress, isPaid, REQUIRED_DOCUMENTS, type Stage } from "@/lib/application-status"
import { requestLocale } from "@/lib/request-locale"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"
import type { VisaApplication } from "@/lib/types/visa-application"

export async function NextStepCard({ app, stage }: { app: VisaApplication; stage: Stage }) {
  const token = app.tracking_token ?? ""
  const { missing } = getDocumentProgress(app)
  const arabic = (await requestLocale()) === "ar"
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const docLabel: Record<(typeof REQUIRED_DOCUMENTS)[number]["key"], CustomerKey> = {
    has_passport: "docs.passport",
    has_photos: "docs.photo",
    has_bank_statements: "docs.bank",
    has_employment_proof: "docs.job",
  }

  const content = (() => {
    switch (stage) {
      case "payment":
        return {
          title: t("next.payTitle"),
          body: t("next.payBody"),
          actions: (
            <PayNowButton
              applicationId={app.id}
              trackingToken={token}
              destination={app.destination_country}
              amount={app.payment_amount ?? 249}
            />
          ),
        }
      case "documents":
        return {
          title: missing.length === 1 ? t("next.uploadTitle", { n: missing.length }) : t("next.uploadTitlePlural", { n: missing.length }),
          body: t("next.uploadBody", {
            docs: missing.map((doc) => (arabic ? t(docLabel[doc.key]) : doc.label.toLowerCase())).join(arabic ? "، " : ", "),
          }),
          actions: (
            <Button asChild className="rounded-full px-5">
              <LocaleLink href={`/track/${token}/upload?type=${missing[0]?.uploadType ?? ""}`}>
                <Upload />
                {t("status.upload")}
              </LocaleLink>
            </Button>
          ),
        }
      case "review":
        return {
          title: t("next.reviewTitle"),
          body: t("next.reviewBody"),
          actions: null,
        }
      case "preparation":
        return {
          title: t("next.prepTitle"),
          body: t("next.prepBody"),
          actions: null,
        }
      case "ready":
        return {
          title: t("next.readyTitle"),
          body: t("next.readyBody"),
          actions: (
            <>
              <Button asChild className="rounded-full px-5">
                <LocaleLink href={`/track/${token}/dossier`}>
                  <Printer />
                  {t("next.viewPrint")}
                </LocaleLink>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-5">
                <a href={`/api/download-document?token=${token}`}>
                  <Download />
                  {t("next.download")}
                </a>
              </Button>
            </>
          ),
        }
      case "cancelled":
        return {
          title: t("next.cancelledTitle"),
          body: t("next.cancelledBody"),
          actions: null,
        }
      case "rejected":
        return {
          title: t("next.rejectedTitle"),
          body: t("next.rejectedBody"),
          actions: (
            <Button asChild className="rounded-full px-5">
              <a href={getCaseTrackingWhatsAppUrl(app.id || token, app.destination_country, arabic)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4" />
                {t("next.talk")}
              </a>
            </Button>
          ),
        }
    }
  })()

  // Trip/passport/employment answers still missing. Not for finished files (ready, refused, cancelled): there is
  // nothing left to fill in, and "continue" would contradict the status.
  const inProgress = stage === "documents" || stage === "review" || stage === "preparation"
  if (inProgress && isPaid(app) && detailsMissing(app) && app.id) {
    content.title = t("next.finishTitle")
    content.body = t("next.finishBody")
    content.actions = (
      <Button asChild className="rounded-full px-5">
        <LocaleLink href={`/continue/${app.id}`}>
          {t("next.continue")}
          <ArrowRight className="rtl:rotate-180" />
        </LocaleLink>
      </Button>
    )
  }

  return (
    <div id={stage === "payment" ? "pay" : undefined} className="flex flex-col gap-4 border-t border-border/70 pt-6">
      <div className="flex max-w-xl flex-col gap-1">
        <h3 className="panel-title panel-title-lg text-foreground">{content.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{content.body}</p>
      </div>
      {content.actions && <div className="flex flex-wrap items-center gap-2">{content.actions}</div>}
    </div>
  )
}
