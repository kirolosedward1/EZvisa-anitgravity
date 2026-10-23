"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { LangText } from "@/components/lang-text"
import { CountryFlag } from "@/components/country-flag"
import { applicantCount, priceForTravellers } from "@/lib/currency"
import { SCHENGEN_META } from "@/lib/countries"
import { formatShortDate, formatTravelMonth, schengenStayDays } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/form-types"

const STAGES = [
  { id: "trip", en: "01 Trip", ar: "01 الرحلة" },
  { id: "traveller", en: "02 Traveller", ar: "02 المسافر" },
  { id: "review", en: "03 Review & pay", ar: "03 المراجعة والدفع" },
] as const

export type WizardStage = (typeof STAGES)[number]["id"]

/** 1 trip, 2 traveller, 3 spouse (still the traveller stage), 4 review and pay. */
export function stageForStep(step: number): WizardStage {
  if (step <= 1) return "trip"
  if (step >= 4) return "review"
  return "traveller"
}

const VISAS: Record<string, { en: string; ar: string }> = {
  tourism: { en: "Schengen tourist", ar: "سياحة شنغن" },
  business: { en: "Schengen business", ar: "عمل شنغن" },
  family: { en: "Schengen family", ar: "زيارة عائلية" },
  medical: { en: "Schengen medical", ar: "علاج" },
  education: { en: "Schengen study", ar: "دراسة" },
  other: { en: "Schengen visa", ar: "تأشيرة شنغن" },
}

function stayDays(formData: FormData) {
  const stay = schengenStayDays(formData.travelStartDate, formData.travelEndDate)
  return stay > 0 ? stay : 0
}

function SummaryRows({ formData }: { formData: FormData }) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const stay = stayDays(formData)
  const start = formData.travelStartDate
  const end = formData.travelEndDate
  const flexibleMonth = formData.datesFlexible === "yes" ? formatTravelMonth(formData.travelMonth) : ""
  const visa = VISAS[formData.purposeOfTrip] 
  const applicants = applicantCount(formData.spouseAccompanying)
  const price = priceForTravellers(formData.spouseAccompanying)
  const spousePrice = priceForTravellers("yes")

  const rows = [
    {
      label: "Destination",
      labelAr: "الوجهة",
      value: country ? (
        <span className="inline-flex items-center gap-2">
          <CountryFlag iso={meta?.iso} title={country} />
          <LangText en={country} ar={meta?.ar || country} />
        </span>
      ) : null,
    },
    {
      label: "Visa",
      labelAr: "التأشيرة",
      value: visa ? <LangText en={visa.en} ar={visa.ar} /> : null,
    },
    {
      label: "Dates",
      labelAr: "التواريخ",
      value:
        start && end && stay ? (
          <span dir="ltr">
            {formatShortDate(start)} – {formatShortDate(end)}
          </span>
        ) : flexibleMonth ? (
          flexibleMonth
        ) : null,
    },
    {
      label: "Applicants",
      labelAr: "المتقدمون",
      value: String(applicants),
    },
    {
      label: "Processing",
      labelAr: "المعالجة",
      value: <LangText en="1–2 days" ar="١–٢ يوم" />,
    },
  ]

  return (
    <div>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 border-b border-[#E3E7EF] py-3 text-[14px]">
            <dt className="text-[#5B6475]">
              <LangText en={row.label} ar={row.labelAr} />
            </dt>
            <dd className="min-w-0 truncate text-end text-[#0A0F1F]">
              {row.value || <span className="text-[#5B6475]">—</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-center justify-between text-[18px] font-semibold">
        <span>
          <LangText en="Total" ar="المجموع" />
        </span>
        <span dir="ltr">AED {price}</span>
      </div>
      {applicants === 1 ? (
        <p className="mt-3 text-[14px] text-[#3A4150]">
          <span className="rtl:hidden">AED {spousePrice} with a spouse</span>
          <span className="hidden rtl:inline">مع الزوج أو الزوجة AED {spousePrice}</span>
        </p>
      ) : null}
    </div>
  )
}

function summaryLine(formData: FormData) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const stay = stayDays(formData)
  const price = priceForTravellers(formData.spouseAccompanying)
  return { country, countryAr: meta?.ar || country, stay, price }
}

export function WizardShell({
  step,
  motionKey,
  direction,
  formData,
  children,
}: {
  step: number
  motionKey: string
  direction: number
  formData: FormData
  children: React.ReactNode
}) {
  const stage = stageForStep(step)
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [rtl, setRtl] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const line = summaryLine(formData)

  useEffect(() => {
    setReady(true)
    setRtl(document.documentElement.dir === "rtl")
  }, [])

  const offset = (rtl ? -1 : 1) * direction * 12
  const enter = !ready ? false : reduced ? { opacity: 0 } : { opacity: 0, x: offset }

  return (
    <div className="bg-[#FFFFFF] text-[#0A0F1F]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-28 md:pt-32">
        <h1 className="sr-only">
          <LangText en="Visa application" ar="طلب التأشيرة" />
        </h1>
        <div className="lg:hidden">
          <button
            type="button"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-[13px] text-[#3A4150]"
          >
            <span className="min-w-0 truncate">
              <span className="rtl:hidden">
                {[line.country, line.stay ? `${line.stay} days` : ""].filter(Boolean).join(" · ") || "—"}
              </span>
              <span className="hidden rtl:inline">
                {[line.countryAr, line.stay ? `${line.stay} يومًا` : ""].filter(Boolean).join(" · ") || "—"}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#0A0F1F]" dir="ltr">
              AED {line.price}
              <ChevronDown className={cn("size-4 text-[#5B6475]", summaryOpen && "rotate-180")} aria-hidden />
            </span>
          </button>
          {summaryOpen ? <SummaryRows formData={formData} /> : null}
        </div>
        <div className="flex gap-6 overflow-x-auto border-b border-[#E3E7EF]">
          {STAGES.map((item) => {
            const current = item.id === stage
            return (
              <span
                key={item.id}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 pb-2 text-[13px] font-medium",
                  current ? "border-[#0436DC] text-[#0A0F1F]" : "border-transparent text-[#5B6475]",
                )}
              >
                <LangText en={item.en} ar={item.ar} />
              </span>
            )
          })}
        </div>

        <div className="mt-8 flex items-start gap-10">
          <div id="wizard-form" className="min-w-0 w-full max-w-[560px] scroll-mt-28">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={motionKey}
                initial={enter}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: offset * -1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="sticky top-28 hidden w-[340px] shrink-0 border-s border-[#E3E7EF] ps-8 lg:block">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.06em] text-[#5B6475]">
              <LangText en="Your application" ar="طلبك" />
            </p>
            <SummaryRows formData={formData} />
          </aside>
        </div>
      </div>
    </div>
  )
}
