import Link from "next/link"
import { ArrowRight, Download, Printer, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PayNowButton } from "@/components/dashboard/pay-now-button"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { detailsMissing, getDocumentProgress, isPaid, type Stage } from "@/lib/application-status"
import { PREPARATION_TIME } from "@/lib/copy"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"
import type { VisaApplication } from "@/lib/types/visa-application"

export function NextStepCard({ app, stage }: { app: VisaApplication; stage: Stage }) {
  const token = app.tracking_token ?? ""
  const { missing } = getDocumentProgress(app)

  const content = (() => {
    switch (stage) {
      case "payment":
        return {
          title: "Pay to start your application",
          body: `Your application is saved. ${PREPARATION_TIME}`,
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
          title: `Upload ${missing.length} remaining document${missing.length === 1 ? "" : "s"}`,
          body: `Still needed: ${missing.map((doc) => doc.label.toLowerCase()).join(", ")}. Upload them on the website or in the EZvisa app.`,
          actions: (
            <Button asChild className="rounded-full px-5">
              <Link href={`/track/${token}/upload?type=${missing[0]?.uploadType ?? ""}`}>
                <Upload />
                Upload documents
              </Link>
            </Button>
          ),
        }
      case "review":
        return {
          title: "We're reviewing your documents",
          body: "A specialist is checking them against the consulate's requirements. We'll email you if anything is missing.",
          actions: null,
        }
      case "preparation":
        return {
          title: "We're preparing your visa file",
          body: PREPARATION_TIME,
          actions: null,
        }
      case "ready":
        return {
          title: "Your visa file is ready",
          body: "Print it and take it to your appointment. It includes your cover letter, itinerary and submission order.",
          actions: (
            <>
              <Button asChild className="rounded-full px-5">
                <Link href={`/track/${token}/dossier`}>
                  <Printer />
                  View &amp; print file
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-5">
                <a href={`/api/download-document?token=${token}`}>
                  <Download />
                  Download package
                </a>
              </Button>
            </>
          ),
        }
      case "cancelled":
        return {
          title: "Cancelled",
          body: "This application is cancelled. There is nothing to pay.",
          actions: null,
        }
      case "rejected":
        return {
          title: "Let's talk about your application",
          body: "You're covered by our money-back guarantee. Message us and a specialist will go through your options.",
          actions: (
            <Button asChild className="rounded-full px-5">
              <a href={getCaseTrackingWhatsAppUrl(app.id || token, app.destination_country)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4" />
                Talk to a specialist
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
    content.title = "Finish your application details"
    content.body = "Payment received. Add your trip, passport and employment details, then upload your documents."
    content.actions = (
      <Button asChild className="rounded-full px-5">
        <Link href={`/continue/${app.id}`}>
          Continue application
          <ArrowRight className="rtl:rotate-180" />
        </Link>
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
