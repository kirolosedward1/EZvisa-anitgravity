"use client"

import { getProviderForDestination, VISA_RULES } from "@/lib/visa-rules"
import { SCHENGEN_FUNDS_RULES } from "@/lib/bank-requirements"
import { useSiteLocale } from "@/components/locale-provider"

/** Facts strip for one Schengen country: visa centre, embassy fee, timing, and the money to show where we know it. */
export function CountryFacts({ slug }: { slug: string }) {
  const arabic = useSiteLocale() === "ar"
  const funds = SCHENGEN_FUNDS_RULES[slug]
  const fee = `€${VISA_RULES.schengen.standardFee.eur}`
  const facts = arabic
    ? [
        { label: "مركز التأشيرات", value: getProviderForDestination(slug).replace(/ Center$/, ""), note: "دبي وأبوظبي" },
        { label: "رسوم السفارة", value: fee, note: "للبالغين. €45 للأطفال من 6 إلى 12، ومجانًا دون 6" },
        { label: "متى تقدّم", value: "من 6 أشهر إلى 15 يومًا", note: "قبل تاريخ المغادرة" },
        funds
          ? { label: "المبلغ المطلوب إظهاره", value: `€${funds.dailyRateWithHotel} في اليوم`, note: "مع حجوزات فندق، للشخص" }
          : { label: "مدة الإقامة", value: "حتى 90 يومًا", note: "خلال أي 180 يومًا" },
      ]
    : [
        { label: "Visa centre", value: getProviderForDestination(slug).replace(/ Center$/, ""), note: "Dubai and Abu Dhabi" },
        { label: "Embassy fee", value: fee, note: "Adults. €45 for children 6–12, free under 6" },
        { label: "When to apply", value: "6 months to 15 days", note: "Before your departure date" },
        funds
          ? { label: "Money to show", value: `€${funds.dailyRateWithHotel} a day`, note: "With hotel bookings, per person" }
          : { label: "Length of stay", value: "Up to 90 days", note: "In any 180-day period" },
      ]

  return (
    <section className="border-y border-border/70 bg-secondary/40">
      <dl className="container mx-auto grid max-w-6xl grid-cols-2 gap-x-8 px-4 sm:px-6 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1 py-7">
            <dt className="text-sm text-muted-foreground">{fact.label}</dt>
            <dd className="text-lg font-semibold tracking-tight text-foreground">
              {arabic && /[A-Za-z€]/.test(fact.value) ? <bdi dir="ltr">{fact.value}</bdi> : fact.value}
            </dd>
            <dd className="text-xs text-muted-foreground">{fact.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
