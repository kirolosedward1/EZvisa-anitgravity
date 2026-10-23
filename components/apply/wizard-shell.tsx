"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { LangText } from "@/components/lang-text"
import { CountryFlag } from "@/components/country-flag"
import { applicantCount, priceForTravellers } from "@/lib/currency"
import { SCHENGEN_META } from "@/lib/countries"
import { citizenshipName } from "@/lib/nationalities"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/form-types"

const STAGES = [
  { id: "destination", en: "01 Destination", ar: "01 الوجهة" },
  { id: "traveller", en: "02 Traveller", ar: "02 المسافر" },
  { id: "review", en: "03 Review & pay", ar: "03 المراجعة والدفع" },
] as const

export type WizardStage = (typeof STAGES)[number]["id"]

/** 1 destination, 2 traveller, 4 review and pay. Trip and spouse details are asked after payment. */
export function stageForStep(step: number): WizardStage {
  if (step <= 1) return "destination"
  if (step >= 4) return "review"
  return "traveller"
}

function SummaryRows({ formData }: { formData: FormData }) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const nationality = citizenshipName(formData.nationality)
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
      label: "Nationality",
      labelAr: "الجنسية",
      value: nationality ? (
        <span className="inline-flex items-center gap-2">
          <CountryFlag iso={formData.nationality} title={nationality} />
          {nationality}
        </span>
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
      value: <LangText en="1–2 days" ar="1–2 يوم" />,
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
      <p className="mt-3 text-[13px] leading-relaxed text-[#5B6475]">
        <LangText en="Trip dates, hotel and itinerary come after payment." ar="تواريخ الرحلة والفندق وخط السير بعد الدفع." />
      </p>
      <div className="mt-5 flex items-center justify-between text-[18px] font-semibold">
        <span>
          <LangText en="Total" ar="المجموع" />
        </span>
        <span dir="ltr">{price} AED</span>
      </div>
      {applicants === 1 ? (
        <p className="mt-3 text-[14px] text-[#3A4150]">
          <span className="rtl:hidden">{spousePrice} AED with a spouse</span>
          <span className="hidden rtl:inline">مع الزوج أو الزوجة {spousePrice} AED</span>
        </p>
      ) : null}
    </div>
  )
}

function summaryLine(formData: FormData) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const price = priceForTravellers(formData.spouseAccompanying)
  return { country, countryAr: meta?.ar || country, price }
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
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-24 md:pt-28">
        <h1 className="sr-only">
          <LangText en="Visa application" ar="طلب التأشيرة" />
        </h1>
        <div
          className="sticky z-40 -mx-4 border-b border-[#E3E7EF] bg-[#FFFFFF] px-4 lg:hidden"
          style={{ top: "var(--site-header-height, 80px)" }}
        >
          <button
            type="button"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-[13px] text-[#3A4150]"
          >
            <span className="min-w-0 truncate">
              <span className="rtl:hidden">
                {line.country || "—"}
              </span>
              <span className="hidden rtl:inline">
                {line.countryAr || "—"}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#0A0F1F]" dir="ltr">
              {line.price} AED
              <ChevronDown className={cn("size-4 text-[#5B6475]", summaryOpen && "rotate-180")} aria-hidden />
            </span>
          </button>
          {summaryOpen ? <SummaryRows formData={formData} /> : null}
        </div>
        <div className="flex gap-6 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_#E3E7EF] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STAGES.map((item) => {
            const current = item.id === stage
            return (
              <span
                key={item.id}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "whitespace-nowrap border-b-2 pb-2 text-[13px] font-medium",
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
