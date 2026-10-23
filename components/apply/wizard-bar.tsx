"use client"

import { ChevronLeft, Loader2 } from "lucide-react"
import { LangText } from "@/components/lang-text"

type WizardBarProps = {
  onBack?: () => void
  showBack?: boolean
  continueLabel: string
  continueLabelAr: string
  loading?: boolean
  loadingLabel?: string
  loadingLabelAr?: string
  continueType?: "submit" | "button"
  onContinue?: () => void
  disabled?: boolean
}

/** Sticky wizard/checkout bar. Back is an icon; Continue uses the remaining width. */
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
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[#E3E7EF] bg-[#FFFFFF] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#E3E7EF] bg-[#FFFFFF] text-[#0A0F1F] disabled:opacity-50"
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
        className="flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#0436DC] px-3 text-center text-[15px] font-semibold leading-tight text-white disabled:opacity-50"
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
  )
}
