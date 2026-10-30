"use client"

import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, ChevronDown } from "lucide-react"
import { GlobiGuide } from "@/components/globi/globi"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"
import { CountryFlag } from "@/components/country-flag"
import { useSiteLocale } from "@/components/locale-provider"
import { applicantCount, formatAedLabel, priceForTravellers } from "@/lib/currency"
import { SCHENGEN_META } from "@/lib/countries"
import { citizenshipName, citizenshipNameAr } from "@/lib/nationalities"
import { message } from "@/messages"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/form-types"

const STAGES = [
  { id: "destination", en: "Destination", ar: "الوجهة" },
  { id: "traveller", en: "Traveller", ar: "المسافر" },
  { id: "review", en: "Review & pay", ar: "المراجعة والدفع" },
] as const

export type WizardStage = (typeof STAGES)[number]["id"]

/** 1 destination, 2 traveller, 4 review and pay; retained IDs preserve old links. */
export function stageForStep(step: number): WizardStage {
  if (step <= 1) return "destination"
  if (step >= 4) return "review"
  return "traveller"
}

function SummaryRows({ formData }: { formData: FormData }) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const nationality = citizenshipName(formData.nationality)
  const nationalityAr = citizenshipNameAr(formData.nationality) || nationality
  const applicants = applicantCount(formData.spouseAccompanying, formData.travelingWith)
  const price = priceForTravellers(formData.spouseAccompanying, formData.travelingWith)
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
          <LangText en={nationality} ar={nationalityAr} />
        </span>
      ) : null,
    },
    {
      label: "Applicants",
      labelAr: "المتقدمون",
      value: String(applicants),
    },
    {
      label: "File preparation",
      labelAr: "تجهيز الملف",
      value: <LangText en="1–2 days" ar={<><bdi dir="ltr">1–2</bdi> يوم</>} />,
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
            <dd className="min-w-0 text-end text-[#0A0F1F]">
              {row.value ||
                (row.label === "Destination" ? (
                  <span className="text-[#5B6475]">
                    <Msg id="summary.yourTrip" />
                  </span>
                ) : null)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] leading-relaxed text-[#5B6475]">
        <LangText en="Preparation starts after we receive your complete details and documents. Trip dates, hotel and itinerary come after payment." ar="يبدأ تجهيز الملف بعد استلام بياناتك ومستنداتك كاملة. تواريخ الرحلة والفندق وخط السير بعد الدفع." />
      </p>
      <div className="mt-5 flex items-center justify-between text-[18px] font-semibold">
        <span>
          <LangText en="Total" ar="المجموع" />
        </span>
        <AedAmount amount={price} />
      </div>
      {applicants === 1 ? (
        <p className="mt-3 text-[14px] text-[#3A4150]">
          <span className="rtl:hidden">
            <AedAmount amount={spousePrice} /> {message("en", "summary.withSpouse")}
          </span>
          <span className="hidden rtl:inline">
            {message("ar", "summary.withSpouse")} <AedAmount amount={spousePrice} />
          </span>
        </p>
      ) : null}
    </div>
  )
}

function AedAmount({ amount }: { amount: number }) {
  const locale = useSiteLocale()
  const label = formatAedLabel(amount, locale)
  // formatAedLabel already isolates the Arabic label (number, then درهم); bdi keeps it apart from the summary text.
  if (locale === "ar") return <bdi dir="ltr">{label}</bdi>
  return <>{label}</>
}

function summaryLine(formData: FormData) {
  const country = formData.destination?.trim() || ""
  const meta = country ? SCHENGEN_META[country] : undefined
  const price = priceForTravellers(formData.spouseAccompanying, formData.travelingWith)
  return { country, countryAr: meta?.ar || country, iso: meta?.iso, price }
}

export function WizardShell({
  step,
  motionKey,
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
  const stageIndex = STAGES.findIndex(item => item.id === stage)
  const reduced = useReducedMotion()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const line = summaryLine(formData)
  const arabic = useSiteLocale() === "ar"
  const applicants = applicantCount(formData.spouseAccompanying, formData.travelingWith)

  return (
    <main className="ez-wizard" id="main-content">
      <h1 className="sr-only"><LangText en="Visa application" ar="طلب التأشيرة" /></h1>
      <div className="ez-wizard-layout">
        <nav className="ez-wizard-progress" aria-label={arabic ? "خطوات طلب التأشيرة" : "Application progress"}>
          <ol>
            {STAGES.map((item, index) => (
              <li key={item.id} aria-current={item.id === stage ? "step" : undefined} data-complete={index < stageIndex || undefined}>
                <span className="ez-wizard-step-number" aria-hidden="true">
                  {index < stageIndex ? <Check size={14} /> : index + 1}
                </span>
                <span><LangText en={item.en} ar={item.ar} /></span>
              </li>
            ))}
          </ol>
        </nav>

        <aside className="ez-wizard-companion" aria-label={arabic ? "دليل طلبك" : "Your application guide"}>
          <div className="ez-wizard-companion-inner">
            <GlobiGuide moment={stage} />
            <div className="ez-wizard-summary">
              <button
                type="button"
                aria-expanded={summaryOpen}
                aria-controls="wizard-application-summary"
                onClick={() => setSummaryOpen(open => !open)}
                className="ez-wizard-summary-toggle"
              >
                <span className="ez-wizard-summary-trip">
                  {line.country ? <CountryFlag iso={line.iso} /> : null}
                  <span>
                    <strong>{line.country ? (arabic ? line.countryAr : line.country) : <Msg id="summary.yourTrip" />}</strong>
                    <span className="ez-wizard-summary-caption"><LangText en="Application summary" ar="ملخص الطلب" /></span>
                  </span>
                </span>
                <span className="ez-wizard-summary-price">
                  <strong><AedAmount amount={line.price} /></strong>
                  <span className="ez-wizard-summary-caption">{applicants} <LangText en={applicants === 1 ? "applicant" : "applicants"} ar={applicants === 1 ? "متقدم" : "متقدمين"} /></span>
                </span>
                <ChevronDown className={cn("ez-wizard-summary-chevron", summaryOpen && "rotate-180")} size={18} aria-hidden="true" />
              </button>
              <div
                id="wizard-application-summary"
                className="ez-wizard-summary-detail"
                hidden={!summaryOpen}
                role="region"
                aria-label={arabic ? "تفاصيل الطلب" : "Application details"}
                tabIndex={summaryOpen ? 0 : -1}
              >
                <SummaryRows formData={formData} />
              </div>
            </div>
          </div>
        </aside>

        <div id="wizard-form" className="ez-wizard-form">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={motionKey}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.16, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
