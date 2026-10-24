"use client"

// "Who is travelling?" drop-down: the signed-in customer's saved travellers (lib/travellers.ts) plus "Someone else".
// Shown on the wizard's traveller step and, for the spouse, on the after-payment spouse step. Same words as the app.
import { UserRound } from "lucide-react"
import { LangText } from "@/components/lang-text"
import { CountryFlag } from "@/components/country-flag"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TRAVELLER_NONE } from "@/lib/travellers-client"
import { maskPassport, travellerName, type Traveller } from "@/lib/shared/wizard-contract"
import { cn } from "@/lib/utils"

const RELATION: Record<Traveller["relationship"], { en: string; ar: string }> = {
  self: { en: "You", ar: "أنت" },
  spouse: { en: "Spouse", ar: "الزوج أو الزوجة" },
  other: { en: "Saved", ar: "محفوظ" },
}

function Row({ t }: { t: Traveller }) {
  const passport = maskPassport(t.passportNumber)
  return (
    <span className="flex min-w-0 items-center gap-3">
      <CountryFlag country={t.nationality} title={t.nationality} className="size-6" />
      <span className="flex min-w-0 flex-col items-start">
        <span className="truncate text-[15px] font-medium leading-5 text-[#0A0F1F]">{travellerName(t)}</span>
        <span className="truncate text-[12px] leading-4 text-[#5B6475]" dir="ltr">
          {[t.nationality, passport].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="ms-1 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        <LangText en={RELATION[t.relationship].en} ar={RELATION[t.relationship].ar} />
      </span>
    </span>
  )
}

export function TravellerSelect({
  travellers,
  value,
  onChange,
  label = { en: "Traveller", ar: "المسافر" },
  someoneElse = { en: "Someone else", ar: "شخص آخر" },
  helper,
  id = "traveller",
  className,
}: {
  travellers: Traveller[]
  /** A traveller id, "" (nothing chosen yet) or TRAVELLER_NONE ("Someone else"). */
  value: string
  onChange: (traveller: Traveller | null) => void
  label?: { en: string; ar: string }
  someoneElse?: { en: string; ar: string }
  helper?: { en: string; ar: string }
  id?: string
  className?: string
}) {
  if (!travellers.length) return null
  const selected = travellers.find((t) => t.id === value) ?? null
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-[#0A0F1F]">
        <LangText en={label.en} ar={label.ar} />
      </label>
      <Select value={value || undefined} onValueChange={(v) => onChange(v === TRAVELLER_NONE ? null : travellers.find((t) => t.id === v) ?? null)}>
        <SelectTrigger
          id={id}
          aria-label={label.en}
          className="h-auto min-h-[52px] w-full rounded-[10px] border-[#E3E7EF] bg-[#FFFFFF] px-3 py-2 text-[15px] text-[#0A0F1F] shadow-none focus-visible:border-[#0436DC] focus-visible:ring-[3px] focus-visible:ring-[rgba(4,54,220,0.12)] data-[size=default]:h-auto"
        >
          <SelectValue
            placeholder={
              <span className="flex items-center gap-3 text-[#5B6475]">
                <UserRound className="size-5" aria-hidden />
                <LangText en="Choose a saved traveller" ar="اختر مسافرًا محفوظًا" />
              </span>
            }
          >
            {selected ? (
              <Row t={selected} />
            ) : value === TRAVELLER_NONE ? (
              <span className="flex items-center gap-3">
                <UserRound className="size-5 text-[#5B6475]" aria-hidden />
                <LangText en={someoneElse.en} ar={someoneElse.ar} />
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {travellers.map((t) => (
            <SelectItem key={t.id} value={t.id} className="rounded-lg py-2.5 ps-3 pe-9">
              <Row t={t} />
            </SelectItem>
          ))}
          <SelectItem value={TRAVELLER_NONE} className="rounded-lg py-2.5 ps-3 pe-9">
            <span className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[#5B6475]" aria-hidden>
                <UserRound className="size-3.5" />
              </span>
              <span className="text-[15px] font-medium text-[#0A0F1F]">
                <LangText en={someoneElse.en} ar={someoneElse.ar} />
              </span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      {helper ? (
        <p className="mt-2 text-[12px] leading-4 text-[#5B6475]">
          <LangText en={helper.en} ar={helper.ar} />
        </p>
      ) : null}
    </div>
  )
}
