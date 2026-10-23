"use client"

import { Check } from "lucide-react"
import { LangText } from "@/components/lang-text"
import { cn } from "@/lib/utils"

export function WizardQuestion({
  title,
  titleAr,
  helper,
  helperAr,
}: {
  title: string
  titleAr: string
  helper: string
  helperAr: string
}) {
  return (
    <div className="mb-6">
      <h2 className="wizard-question text-[#0A0F1F]">
        <LangText en={title} ar={titleAr} />
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[#5B6475]">
        <LangText en={helper} ar={helperAr} />
      </p>
    </div>
  )
}

export function ChoiceRow({
  title,
  titleAr,
  description,
  descriptionAr,
  selected,
  onSelect,
  indicator = "check",
}: {
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  selected: boolean
  onSelect: () => void
  /** Trip keeps a check. Traveller uses a 20px radio. */
  indicator?: "check" | "radio"
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex h-16 w-full items-center gap-3 rounded-xl border px-[18px] text-start",
        selected ? "border-[#0436DC] bg-[#F2F5FF]" : "border-[#E3E7EF] bg-[#FFFFFF]",
      )}
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] leading-5 text-[#0A0F1F]",
            indicator === "radio" ? "font-semibold" : "font-medium",
          )}
        >
          <LangText en={title} ar={titleAr} />
        </span>
        <span className="block truncate text-[13px] leading-4 text-[#5B6475]">
          <LangText en={description} ar={descriptionAr} />
        </span>
      </span>
      {indicator === "radio" ? (
        <span
          className={cn(
            "size-5 shrink-0 rounded-full border-[1.5px]",
            selected ? "border-[#0436DC] bg-[#0436DC]" : "border-[#C9CFDB] bg-transparent",
          )}
          aria-hidden
        />
      ) : (
        <Check className={cn("size-5 shrink-0 text-[#0436DC]", selected ? "opacity-100" : "opacity-0")} aria-hidden />
      )}
    </button>
  )
}

export function ChoiceList({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-3">
      {children}
    </div>
  )
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[12px] leading-4 text-[#B83200]">{children}</p>
}

export const wizardLabelClass = "mb-2 block text-[13px] font-medium text-[#0A0F1F]"

export const wizardFieldClass =
  "w-full rounded-[10px] border border-[#E3E7EF] bg-[#FFFFFF] px-3 text-[15px] text-[#0A0F1F] shadow-none outline-none placeholder:text-[#5B6475] focus:border-[#0436DC] focus:shadow-[0_0_0_3px_rgba(4,54,220,0.12)]"
