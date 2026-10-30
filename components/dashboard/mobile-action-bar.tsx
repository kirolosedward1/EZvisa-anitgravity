import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { LocaleLink } from "@/components/locale-link"
import { customerProgress, detailsMissing, isPaid, type Stage } from "@/lib/application-status"
import { customerDocuments } from "@/lib/dashboard-state"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"
import type { DocumentReviews } from "@/lib/document-reviews"
import type { VisaApplication } from "@/lib/types/visa-application"

type Action = { href: string; label: CustomerKey; external?: boolean }

/** The case card's primary action, as a link (the same order of choices as NextStepCard). */
function primaryAction(app: VisaApplication, stage: Stage, reviews?: DocumentReviews): Action | null {
  const token = app.tracking_token ?? ""
  const { missing } = customerDocuments(app, reviews)
  if (stage === "payment") return { href: "#pay", label: "status.payNow", external: true }
  if ((stage === "documents" || stage === "review") && missing.length && token) return { href: `/track/${token}/upload?type=${missing[0].document_type}`, label: "status.upload" }
  if ((stage === "review" || stage === "preparation") && isPaid(app) && detailsMissing(app) && app.id) return { href: `/continue/${app.id}`, label: "dash.finishDetails" }
  if (stage === "ready") {
    const progress = customerProgress(app)
    if (progress.key === "appointment" && app.id) return progress.finished ? null : { href: `/appointment/${app.id}`, label: "dash.apptAdd" }
    if (token) return { href: `/api/download-document?token=${token}`, label: "dash.downloadPdf", external: true }
  }
  return null
}

/**
 * Below 1024px: a bar fixed to the bottom of the screen with the case's primary action and WhatsApp, so the next
 * step stays in reach while scrolling. globals.css reserves room for it under the footer and hides the Crisp bubble
 * (WhatsApp is in the bar); data-wizard-bar makes the cookie banner sit above it, as with the wizard's bar.
 */
export function MobileActionBar({ app, stage, reviews, arabic }: { app: VisaApplication; stage: Stage; reviews?: DocumentReviews; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey) => customerText(locale, key)
  const action = primaryAction(app, stage, reviews)
  const whatsapp = getCaseTrackingWhatsAppUrl(app.id || app.tracking_token || "", app.destination_country, arabic)
  const primary = "inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-[#062db1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

  return (
    <div role="region" aria-label={t("bar.label")} data-wizard-bar className="ez-mobile-bar fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-[#dee5f0] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
      {action ? (
        action.external ? (
          <a href={action.href} className={primary}>{t(action.label)}</a>
        ) : (
          <LocaleLink href={action.href} className={primary}>{t(action.label)}</LocaleLink>
        )
      ) : null}
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("bar.chat")}
        className={
          action
            ? "inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#1A7F37] text-white transition-colors hover:bg-[#166C2F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A7F37]"
            : "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1A7F37] text-[15px] font-medium text-white transition-colors hover:bg-[#166C2F]"
        }
      >
        <WhatsAppIcon className="size-5" />
        {action ? null : t("support.chat")}
      </a>
    </div>
  )
}
