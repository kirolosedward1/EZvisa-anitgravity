import { ActivityList, type ActivityLine } from "@/components/dashboard/activity-list"
import { activityFor, type ActivityEntry, type ApplicationEvent } from "@/lib/application-events"
import { DOC_TITLE_KEY } from "@/lib/dashboard-state"
import { formatAedLabel } from "@/lib/currency"
import { REQUIREMENTS } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import type { DocumentReviews } from "@/lib/document-reviews"
import type { VisaApplication } from "@/lib/types/visa-application"

const STATUS_KEY: Record<string, CustomerKey> = {
  reviewing: "act.statusReviewing",
  preparation: "act.statusPreparation",
  ready: "act.statusReady",
  approved: "act.statusReady",
  appointment_booked: "act.statusBooked",
  completed: "act.statusCompleted",
  awaiting_documents: "act.statusDocuments",
}

const dubaiDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(d)

/** "Today, 10:52", "30 Oct, 18:20", or with the year when it is not this year. UAE time, Western digits. */
function whenLabel(iso: string, arabic: boolean, now = new Date()): string {
  const date = new Date(iso)
  const locale = arabic ? "ar-EG-u-nu-latn" : "en-GB"
  const clock = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
  if (dubaiDay(date) === dubaiDay(now)) return customerText(arabic ? "ar" : "en", "act.today", { time: clock })
  const sameYear = dubaiDay(date).slice(0, 4) === dubaiDay(now).slice(0, 4)
  const day = new Intl.DateTimeFormat(locale, { timeZone: "Asia/Dubai", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" as const }) }).format(date)
  return `${day}${arabic ? "،" : ","} ${clock}`
}

/** Sidebar activity card. Server-rendered text; only the "Show all" toggle runs in the browser. */
export function ActivityCard({ app, reviews, events, arabic }: { app: VisaApplication; reviews?: DocumentReviews; events: ApplicationEvent[]; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const entries = activityFor(app, reviews, events)
  if (!entries.length) return null

  const doc = (type: string) => (arabic && DOC_TITLE_KEY[type] ? t(DOC_TITLE_KEY[type]) : REQUIREMENTS.find((r) => r.document_type === type)?.title ?? type)
  const docLower = (type: string) => (arabic ? doc(type) : doc(type).toLocaleLowerCase("en"))
  const title = (e: ActivityEntry): string => {
    switch (e.kind) {
      case "paid":
        return e.amount ? t("act.paid", { amount: formatAedLabel(e.amount, locale) }) : t("act.paidPlain")
      case "payFailed":
        return t("act.payFailed")
      case "uploaded":
        return e.docs!.length === 1 ? t("act.uploaded1", { doc: doc(e.docs![0]) }) : t("act.uploadedN", { n: e.docs!.length })
      case "approved":
        return e.docs!.length === 1
          ? t("act.approved1", { doc: doc(e.docs![0]) })
          : e.docs!.length === 2
            ? t("act.approved2", { a: doc(e.docs![0]), b: docLower(e.docs![1]) })
            : t("act.approvedN", { n: e.docs!.length })
      case "rejected":
        return t("act.rejected", { doc: doc(e.docs![0]) })
      case "status":
        return t(STATUS_KEY[e.status ?? ""] ?? "act.statusOther")
      case "specialist":
        return t("act.specialist", { name: e.name ?? "" })
      case "downloaded":
        return t("act.downloaded")
      case "appointment":
        return e.when ? t("act.appointment", { when: whenLabel(e.when, arabic) }) : t("act.appointmentPlain")
      case "insurance":
        return t(e.preference === "quote" ? "act.insQuote" : "act.insOwn")
    }
  }
  const lines: ActivityLine[] = entries.map((e) => ({
    id: e.id,
    tone: e.tone,
    title: title(e),
    meta: [whenLabel(e.at, arabic), e.kind === "rejected" ? t("act.rejectedHint") : e.kind === "appointment" ? e.centre : ""].filter(Boolean).join(" · "),
  }))

  return (
    <section aria-labelledby="activity-title" className="ez-dash-card flex flex-col px-5 pb-1.5 pt-[18px]">
      <h2 id="activity-title" className="ez-dash-panel mb-3.5 text-foreground">{t("act.title")}</h2>
      <ActivityList lines={lines} />
    </section>
  )
}
