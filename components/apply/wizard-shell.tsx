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
  { id: "documents", en: "03 Documents", ar: "03 المستندات" },
  { id: "review", en: "04 Review", ar: "04 المراجعة" },
] as const

export type WizardStage = (typeof STAGES)[number]["id"]

/** Progress labels stay in the approved order. The walk order of the wizard is unchanged. */
export function stageForStep(step: number): WizardStage {
  if (step === 4) return "trip"
  if (step === 5) return "review"
  if (step === 3) return "documents"
  return "traveller"
}

function stayDays(formData: FormData) {
  const stay = schengenStayDays(formData.travelStartDate, formData.travelEndDate)
  return stay > 1 ? stay : 0
}

function SummaryRows({ formData }: { formData: FormData }) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim()
  const stay = stayDays(formData)
  const start = formData.travelStartDate
  const end = formData.travelEndDate
  const flexibleMonth = formData.datesFlexible === "yes" ? formatTravelMonth(formData.travelMonth) : ""
  const applicants = applicantCount(formData.spouseAccompanying)
  const price = priceForTravellers(formData.spouseAccompanying)

  const rows = [
    {
      label: "Country",
      labelAr: "الدولة",
      value: country ? (
        <span className="inline-flex items-center gap-2">
          <CountryFlag iso={meta?.iso} title={country} />
          <LangText en={country} ar={meta?.ar || country} />
        </span>
      ) : null,
    },
    {
      label: "Traveller",
      labelAr: "المسافر",
      value: name || null,
    },
    {
      label: "Dates",
      labelAr: "المواعيد",
      value:
        start && end && stay ? (
          <span dir="ltr">
            {formatShortDate(start)} – {formatShortDate(end)} · {stay}{" "}
            <LangText en="days" ar="يومًا" />
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
      label: "Price",
      labelAr: "السعر",
      value: <span dir="ltr">AED {price}</span>,
    },
  ]

  return (
    <dl className="divide-y divide-[#E3E7EF] border-y border-[#E3E7EF]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-3">
          <dt className="text-[13px] font-medium text-[#5B6475]">
            <LangText en={row.label} ar={row.labelAr} />
          </dt>
          <dd className="min-w-0 truncate text-end text-[15px] font-medium text-[#0A0F1F]">
            {row.value || <span className="font-normal text-[#5B6475]">—</span>}
          </dd>
        </div>
      ))}
    </dl>
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
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-[#E3E7EF]">
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
            <div className="mb-6 border-b border-[#E3E7EF] lg:hidden">
              <button
                type="button"
                aria-expanded={summaryOpen}
                onClick={() => setSummaryOpen((open) => !open)}
                className="flex w-full items-center gap-3 py-3 text-start"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#0A0F1F]">
                  <span className="rtl:hidden">
                    {[line.country, line.stay ? `${line.stay} days` : "", `AED ${line.price}`].filter(Boolean).join(" · ")}
                  </span>
                  <span className="hidden rtl:inline">
                    {[line.countryAr, line.stay ? `${line.stay} يومًا` : "", `AED ${line.price}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-[#5B6475]", summaryOpen && "rotate-180")} aria-hidden />
              </button>
              {summaryOpen ? <SummaryRows formData={formData} /> : null}
            </div>

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

          <aside className="sticky top-28 hidden w-[340px] shrink-0 lg:block">
            <SummaryRows formData={formData} />
          </aside>
        </div>
      </div>
    </div>
  )
}
