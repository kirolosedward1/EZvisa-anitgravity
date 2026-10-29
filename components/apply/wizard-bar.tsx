"use client"

import type { ReactNode } from "react"
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react"
import { LangText } from "@/components/lang-text"
import { Button } from "@/components/ui/button"

type WizardBarProps = {
  onBack?: () => void
  showBack?: boolean
  continueLabel: ReactNode
  continueLabelAr: ReactNode
  loading?: boolean
  loadingLabel?: string
  loadingLabelAr?: string
  continueType?: "submit" | "button"
  onContinue?: () => void
  disabled?: boolean
  /** Later screen keeps Back and uses its own actions. */
  showContinue?: boolean
  /** Trailing arrow disc, the same one as other primary actions. */
  arrow?: boolean
}

/** Wizard footer. Back is an icon. Continue fills the rest of the form width. */
export function WizardBar({
  onBack,
  showBack = true,
  continueLabel,
  continueLabelAr,
  loading = false,
  loadingLabel = "Please wait",
  loadingLabelAr = "لحظات",
  continueType = "submit",
  onContinue,
  disabled = false,
  showContinue = true,
  arrow = true,
}: WizardBarProps) {
  return (
    <div data-wizard-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E3E7EF] bg-[#FFFFFF]">
      <div className="mx-auto flex w-full max-w-6xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-[560px] items-center gap-3">
          {showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="grid size-12 shrink-0 place-items-center rounded-full border border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F] disabled:opacity-50"
            >
              <ChevronLeft className="size-5" aria-hidden />
              <span className="sr-only">
                <LangText en="Back" ar="رجوع" />
              </span>
            </button>
          ) : null}
          {showContinue ? <Button
            type={continueType}
            onClick={onContinue}
            disabled={disabled || loading}
            className="min-w-0 flex-1 overflow-hidden px-6 text-center leading-tight"
          >
            {loading ? (
              <span className="inline-flex max-w-full items-center justify-center gap-2">
                <Loader2 className="size-4 shrink-0 animate-spin" />
                <span className="truncate">
                  <LangText en={loadingLabel} ar={loadingLabelAr} />
                </span>
              </span>
            ) : (
              <span className="max-w-full text-balance">
                <LangText en={continueLabel} ar={continueLabelAr} />
              </span>
            )}
            {!loading && arrow ? <ArrowRight /> : null}
          </Button> : null}
        </div>
      </div>
    </div>
  )
}
