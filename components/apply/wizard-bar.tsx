"use client"

import type { ReactNode } from "react"
import { ChevronLeft, Loader2 } from "lucide-react"
import { LangText } from "@/components/lang-text"

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
          <button
            type={continueType}
            onClick={onContinue}
            disabled={disabled || loading}
            className="flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[10px] bg-[#0436DC] px-3 text-center text-[15px] font-semibold leading-tight text-white disabled:opacity-50"
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
          </button>
        </div>
      </div>
    </div>
  )
}
