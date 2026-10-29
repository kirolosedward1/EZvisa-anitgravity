"use client"

import { Banknote, Baby, CalendarDays, Clock3 } from "lucide-react"
import { VISA_RULES } from "@/lib/visa-rules"
import { useSiteLocale } from "@/components/locale-provider"

/** Shared Schengen facts. Centre locations and financial thresholds vary by application. */
export function CountryFacts({ slug: _slug }: { slug: string }) {
  const arabic = useSiteLocale() === "ar"
  const facts = arabic ? [
    { icon: Banknote, label: "رسوم التأشيرة الأساسية", value: `€${VISA_RULES.schengen.standardFee.eur}`, note: "للبالغين؛ قد تنطبق إعفاءات" },
    { icon: Baby, label: "رسوم الأطفال", value: "€45", note: "من 6 إلى 11 عامًا؛ دون رسوم تأشيرة لمن هم دون 6" },
    { icon: CalendarDays, label: "متى تقدّم", value: "قبل السفر بـ6 أشهر إلى 15 يومًا", note: "اترك وقتًا كافيًا لتوفر المواعيد ودراسة الطلب" },
    { icon: Clock3, label: "الإقامة القصيرة", value: "حتى 90 يومًا من كل 180", note: "مع مراعاة مدة تأشيرتك وصلاحيتها وعدد مرات الدخول" },
  ] : [
    { icon: Banknote, label: "Standard visa fee", value: `€${VISA_RULES.schengen.standardFee.eur}`, note: "Adults; exemptions may apply" },
    { icon: Baby, label: "Children’s visa fee", value: "€45", note: "Ages 6–11; no visa fee under 6" },
    { icon: CalendarDays, label: "Application window", value: "6 months to 15 days", note: "Before travel. Allow time for appointments and a decision." },
    { icon: Clock3, label: "Short stays", value: "Up to 90 in 180 days", note: "Subject to your visa’s duration, validity and entry conditions" },
  ]
  return (
    <section className="ez-country-facts" aria-label={arabic ? "معلومات التأشيرة الأساسية" : "Visa essentials"}>
      <dl className="ez-country-facts-grid">
        {facts.map(fact => (
          <div key={fact.label} className="ez-country-fact">
            <dt className="ez-country-fact-label">
              <fact.icon strokeWidth={1.7} aria-hidden="true" />
              <span>{fact.label}</span>
            </dt>
            <dd className="ez-country-fact-value">{fact.value}</dd>
            <dd className="ez-country-fact-note">{fact.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
