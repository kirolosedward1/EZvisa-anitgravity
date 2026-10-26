import { Check } from "lucide-react"
import { APPLICATION_STEPS, getStepIndex, type CustomerProgress, type StepKey } from "@/lib/application-status"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"

const STEP_COPY: Record<StepKey, { label: CustomerKey; hint: CustomerKey }> = {
  payment: { label: "step.payment", hint: "step.paymentHint" },
  documents: { label: "step.documents", hint: "step.documentsHint" },
  review: { label: "step.review", hint: "step.reviewHint" },
  preparation: { label: "step.preparation", hint: "step.preparationHint" },
  ready: { label: "step.ready", hint: "step.readyHint" },
  appointment: { label: "step.appointment", hint: "step.appointmentHint" },
}

export function ProgressTracker({ progress, arabic }: { progress: CustomerProgress; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const currentIndex = getStepIndex(progress.key)
  const isFinished = progress.finished

  return (
    <ol className="flex flex-col gap-4 md:flex-row md:gap-2" aria-label={customerText(locale, "step.progress")}>
      {APPLICATION_STEPS.map((step, index) => {
        const isDone = index < currentIndex || (isFinished && index === currentIndex)
        const isCurrent = index === currentIndex && !isFinished
        const isLast = index === APPLICATION_STEPS.length - 1

        return (
          <li
            key={step.key}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex flex-1 items-start gap-3 md:flex-col md:items-center md:text-center"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute start-3.5 top-8 -bottom-4 w-0.5 rounded-full md:bottom-auto md:start-[calc(50%+1.25rem)] md:top-3.5 md:h-0.5 md:w-[calc(100%-2.5rem)]",
                  index < currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                isDone && "bg-primary text-primary-foreground",
                isCurrent && "border-2 border-primary bg-background text-primary ring-4 ring-primary/10",
                !isDone && !isCurrent && "border border-border bg-background text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
            </span>
            <span className="flex flex-col gap-0.5 pt-1 md:pt-0">
              <span className={cn("text-sm font-medium", isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground")}>
                {customerText(locale, STEP_COPY[step.key].label)}
                {isDone && <span className="sr-only"> ({customerText(locale, "step.completed")})</span>}
                {isCurrent && <span className="sr-only"> ({customerText(locale, "step.current")})</span>}
              </span>
              <span className="text-xs text-muted-foreground md:max-w-32">{customerText(locale, STEP_COPY[step.key].hint)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
