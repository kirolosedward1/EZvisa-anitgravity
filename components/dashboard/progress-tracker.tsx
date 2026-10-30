import { format, parseISO } from "date-fns"
import { Check } from "lucide-react"
import { ArabicDate } from "@/components/arabic-date"
import { APPLICATION_STEPS, type ApplicationLike, type CustomerProgress, type StepKey } from "@/lib/application-status"
import { formatAedLabel } from "@/lib/currency"
import { customerDocuments } from "@/lib/dashboard-state"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import type { InsurancePreference } from "@/lib/insurance"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { DocumentReviews } from "@/lib/document-reviews"
import { ProgressCollapsible } from "@/components/dashboard/progress-collapsible"

type TrackerKey = StepKey | "insurance"

const STEP_COPY: Record<TrackerKey, { label: CustomerKey; hint: CustomerKey; short: CustomerKey }> = {
  insurance: { label: "step.insurance", hint: "step.insuranceHint", short: "prog.shortInsurance" },
  payment: { label: "step.payment", hint: "step.paymentHint", short: "prog.shortPayment" },
  documents: { label: "step.documents", hint: "step.documentsHint", short: "prog.shortDocuments" },
  review: { label: "step.review", hint: "step.reviewHint", short: "prog.shortReview" },
  preparation: { label: "step.preparation", hint: "step.preparationHint", short: "prog.shortPreparation" },
  ready: { label: "step.ready", hint: "step.readyHint", short: "prog.shortReady" },
  appointment: { label: "step.appointment", hint: "step.appointmentHint", short: "prog.shortAppointment" },
}

const TRACKER_STEPS: { key: TrackerKey }[] = [...APPLICATION_STEPS.slice(0, 4), { key: "insurance" }, ...APPLICATION_STEPS.slice(4)]

type StepState = "done" | "current" | "todo"

function trackerSteps(showInsurance: boolean): { key: TrackerKey }[] {
  return showInsurance ? TRACKER_STEPS : APPLICATION_STEPS
}

/** "Step 2 of 7" for the card heading; a finished case counts as the last step. */
export function progressPosition(progress: CustomerProgress, showInsurance: boolean) {
  const steps = trackerSteps(showInsurance)
  const index = steps.findIndex((step) => step.key === progress.key)
  return { n: Math.max(index, 0) + 1, total: steps.length }
}

/** The line under each step: a date or count where the case has one, else the step's plain description. */
function stepDetail(key: TrackerKey, state: StepState, arabic: boolean, app?: ApplicationLike, insurance?: InsurancePreference, reviews?: DocumentReviews): ReactNode {
  const locale = arabic ? "ar" : "en"
  const t = (k: CustomerKey, values?: Record<string, string | number>) => customerText(locale, k, values)
  const yourTurn = (text: string) => `${text} · ${t("prog.yourTurn")}`
  if (key === "insurance") return t(insurance === "quote" ? "step.insuranceQuote" : insurance === "own" ? "step.insuranceOwn" : "step.insuranceHint")
  if (!app) return t(STEP_COPY[key].hint)
  const docs = customerDocuments(app, reviews)
  switch (key) {
    case "payment": {
      const amount = formatAedLabel(app.payment_amount || PRICE_AED, locale)
      if (state === "current") return yourTurn(amount)
      if (state === "done" && app.paid_at) {
        return <>{amount} · {arabic ? <ArabicDate value={app.paid_at} /> : format(parseISO(app.paid_at), "d MMM")}</>
      }
      return amount
    }
    case "documents":
      if (state === "current") return yourTurn(t("prog.docsUploaded", { n: docs.received, total: docs.total }))
      if (state === "done") return t("prog.docsDone", { n: docs.total })
      return t("prog.docsToUpload", { n: docs.total })
    case "review":
      return state === "done" ? t("prog.done") : t("step.reviewHint")
    case "preparation":
      return state === "done" ? t("prog.done") : t("prog.prepTodo")
    case "ready":
      if (state === "current") return yourTurn(t("prog.readyNow"))
      return state === "done" ? t("prog.done") : t("prog.readyTodo")
    case "appointment":
      if (state === "current") return yourTurn(t("prog.apptNow"))
      return state === "done" ? t("prog.done") : t("step.appointmentHint")
  }
}

function stepStates(progress: CustomerProgress, showInsurance: boolean, insurance?: InsurancePreference) {
  const steps = trackerSteps(showInsurance)
  const currentIndex = steps.findIndex((step) => step.key === progress.key)
  return steps.map((step, index) => {
    const isCurrent = index === currentIndex && !progress.finished
    const isDone = step.key === "insurance" ? !!insurance : index < currentIndex || (progress.finished && index === currentIndex)
    return { key: step.key, index, state: (isCurrent ? "current" : isDone ? "done" : "todo") as StepState, lineDone: index < currentIndex || progress.finished }
  })
}

/** Compact horizontal rail for the collapsed mobile card: a marker and a short label per step. */
export function ProgressRail({ progress, arabic, insurance, showInsurance = false }: { progress: CustomerProgress; arabic: boolean; insurance?: InsurancePreference; showInsurance?: boolean }) {
  const locale = arabic ? "ar" : "en"
  const steps = stepStates(progress, showInsurance, insurance)
  return (
    <ol className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label={customerText(locale, "step.progress")}>
      {steps.map(({ key, index, state, lineDone }) => (
        <li key={key} aria-current={state === "current" ? "step" : undefined} className="relative flex flex-col items-center gap-1.5 text-center">
          {index < steps.length - 1 ? (
            <span aria-hidden="true" className={cn("absolute start-1/2 top-[11px] h-0.5 w-full", lineDone ? "bg-primary" : "bg-border")} />
          ) : null}
          <span
            className={cn(
              "relative z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
              state === "done" && "bg-primary text-primary-foreground",
              state === "current" && "border-2 border-primary bg-background text-primary ring-[3px] ring-primary/10",
              state === "todo" && "border border-border bg-background text-muted-foreground",
            )}
          >
            {state === "done" ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : index + 1}
          </span>
          <span className={cn("w-full truncate text-[11px] leading-tight", state === "current" ? "font-semibold text-primary" : "text-muted-foreground")}>
            {customerText(locale, STEP_COPY[key].short)}
            {state === "done" && <span className="sr-only"> ({customerText(locale, "step.completed")})</span>}
            {state === "current" && <span className="sr-only"> ({customerText(locale, "step.current")})</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Vertical timeline. Current, done and upcoming steps differ in shape too: ring with number, filled check, outline number. */
export function ProgressTracker({
  progress,
  arabic,
  insurance,
  showInsurance = false,
  app,
  reviews,
}: {
  progress: CustomerProgress
  arabic: boolean
  insurance?: InsurancePreference
  showInsurance?: boolean
  app?: ApplicationLike
  reviews?: DocumentReviews
}) {
  const locale = arabic ? "ar" : "en"
  const steps = trackerSteps(showInsurance)
  const currentIndex = steps.findIndex((step) => step.key === progress.key)

  return (
    <ol className="flex flex-col gap-3.5" aria-label={customerText(locale, "step.progress")}>
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex && !progress.finished
        const isDone = step.key === "insurance" ? !!insurance : index < currentIndex || (progress.finished && index === currentIndex)
        const state: StepState = isCurrent ? "current" : isDone ? "done" : "todo"
        const isLast = index === steps.length - 1

        return (
          <li key={step.key} aria-current={isCurrent ? "step" : undefined} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn("absolute start-[13px] top-7 -bottom-3.5 w-0.5", index < currentIndex || progress.finished ? "bg-primary" : "bg-border")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                state === "done" && "bg-primary text-primary-foreground",
                state === "current" && "border-2 border-primary bg-background text-primary ring-4 ring-primary/10",
                state === "todo" && "border border-border bg-background text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-px pt-1">
              <span className={cn("text-sm", state === "current" ? "font-semibold text-primary" : state === "done" ? "font-medium text-foreground" : "font-medium text-muted-foreground")}>
                {customerText(locale, STEP_COPY[step.key].label)}
                {state === "done" && <span className="sr-only"> ({customerText(locale, "step.completed")})</span>}
                {state === "current" && <span className="sr-only"> ({customerText(locale, "step.current")})</span>}
              </span>
              <span className="text-xs text-muted-foreground">{stepDetail(step.key, state, arabic, app, insurance, reviews)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** The sidebar card: heading with "Step n of N", then the timeline. `collapsible`: the mobile card (rail first). */
export function ProgressCard({ collapsible = false, ...props }: Parameters<typeof ProgressTracker>[0] & { collapsible?: boolean }) {
  const locale = props.arabic ? "ar" : "en"
  const { n, total } = progressPosition(props.progress, props.showInsurance ?? false)
  if (collapsible) {
    return (
      <ProgressCollapsible
        title={customerText(locale, "prog.title")}
        position={customerText(locale, "prog.stepOf", { n, total })}
        rail={<ProgressRail progress={props.progress} arabic={props.arabic} insurance={props.insurance} showInsurance={props.showInsurance} />}
        timeline={<ProgressTracker {...props} />}
      />
    )
  }
  return (
    <section aria-label={customerText(locale, "prog.title")} className="ez-dash-card px-5 pb-5 pt-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ez-dash-panel text-foreground">{customerText(locale, "prog.title")}</h2>
        <span className="text-sm text-muted-foreground">{customerText(locale, "prog.stepOf", { n, total })}</span>
      </div>
      <ProgressTracker {...props} />
    </section>
  )
}
