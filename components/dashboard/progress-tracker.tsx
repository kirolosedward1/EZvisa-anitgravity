import { Check } from "lucide-react"
import { APPLICATION_STEPS, getStepIndex, type StepKey } from "@/lib/application-status"
import { cn } from "@/lib/utils"

export function ProgressTracker({ stage }: { stage: StepKey }) {
  const currentIndex = getStepIndex(stage)
  // "Ready" is a finished state, so show it as complete rather than in progress
  const isFinished = stage === "ready"

  return (
    <ol className="flex flex-col gap-4 md:flex-row md:gap-2" aria-label="Application progress">
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
                  "absolute left-4 top-8 -bottom-4 w-px md:bottom-auto md:left-1/2 md:top-4 md:h-px md:w-full",
                  index < currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isDone && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                !isDone && !isCurrent && "border border-border bg-secondary text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className="flex flex-col gap-0.5 pt-1 md:pt-0">
              <span className={cn("text-sm font-medium", isDone || isCurrent ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
                {isDone && <span className="sr-only"> (completed)</span>}
                {isCurrent && <span className="sr-only"> (current step)</span>}
              </span>
              <span className="text-xs text-muted-foreground">{step.description}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
