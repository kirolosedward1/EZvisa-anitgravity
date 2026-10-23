import Link from "next/link"
import { CheckCircle2, Clock, Download, FileSearch, LifeBuoy, Printer, Upload, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PayNowButton } from "@/components/dashboard/pay-now-button"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { detailsMissing, getDocumentProgress, isPaid, type Stage } from "@/lib/application-status"
import { PREPARATION_TIME } from "@/lib/copy"
import { getCaseTrackingWhatsAppUrl, getDocumentHelpWhatsAppUrl } from "@/lib/whatsapp"
import type { VisaApplication } from "@/lib/types/visa-application"

const DOSSIER_CONTENTS = [
  "Step-by-step submission order",
  "Cover letter tailored to the consulate",
  "Day-by-day travel itinerary",
  "Appointment-day guide",
]

export function NextStepCard({ app, stage }: { app: VisaApplication; stage: Stage }) {
  const token = app.tracking_token ?? ""
  const { missing } = getDocumentProgress(app)

  const content = (() => {
    switch (stage) {
      case "payment":
        return {
          icon: Wallet,
          title: "Complete your payment to get started",
          body: `Your application is saved. Once payment is confirmed, our visa specialists start preparing your file. ${PREPARATION_TIME}`,
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
          icon: Upload,
          title: `Upload ${missing.length} remaining document${missing.length === 1 ? "" : "s"}`,
          body: `We still need your ${missing.map((doc) => doc.label.toLowerCase()).join(", ")}. Upload them here or send them to us on WhatsApp.`,
          actions: (
            <>
              <Button asChild className="rounded-full px-5">
                <Link href={`/track/${token}/upload?type=${missing[0]?.uploadType ?? ""}`}>
                  <Upload />
                  Upload documents
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-5">
                <a href={getDocumentHelpWhatsAppUrl(token)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4" />
                  Send on WhatsApp
                </a>
              </Button>
            </>
          ),
        }
      case "review":
        return {
          icon: FileSearch,
          title: "Our experts are reviewing your file",
          body: "We have everything we need. A specialist is checking your documents against the consulate's requirements. We'll email you if anything is missing.",
          actions: null,
        }
      case "preparation":
        return {
          icon: Clock,
          title: "We're preparing your visa file",
          body: PREPARATION_TIME,
          actions: null,
        }
      case "ready":
        return {
          icon: CheckCircle2,
          title: "Your visa file is ready",
          body: "Everything you need for your appointment is ready to review, print and take with you.",
          extra: (
            <ul className="grid gap-2 sm:grid-cols-2">
              {DOSSIER_CONTENTS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          ),
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
          icon: LifeBuoy,
          title: "Cancelled",
          body: "This application is cancelled. There is nothing to pay.",
          actions: null,
        }
      case "rejected":
        return {
          icon: LifeBuoy,
          title: "Let's talk about your application",
          body: "This application needs attention from our team. Message us and a specialist will walk you through your options.",
          actions: (
            <Button asChild className="rounded-full px-5">
              <a href={getCaseTrackingWhatsAppUrl(token, app.destination_country)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4" />
                Talk to a specialist
              </a>
            </Button>
          ),
        }
    }
  })()

  if (stage !== "cancelled" && isPaid(app) && detailsMissing(app) && app.id) {
    content.icon = FileSearch
    content.title = "Continue your application"
    content.body = "Payment is confirmed. Add your trip details, passport and employment, then upload your documents."
    content.actions = (
      <Button asChild className="rounded-full px-5">
        <Link href={`/continue/${app.id}`}>Continue application</Link>
      </Button>
    )
  }

  const Icon = content.icon

  return (
    <div id={stage === "payment" ? "pay" : undefined} className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Next step</p>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{content.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{content.body}</p>
        </div>
      </div>
      {"extra" in content && content.extra && <div className="sm:pl-14">{content.extra}</div>}
      {content.actions && <div className="flex flex-wrap items-start gap-3 sm:pl-14">{content.actions}</div>}
    </div>
  )
}
