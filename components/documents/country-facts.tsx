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
  return <section className="border-y border-border bg-secondary/40"><dl className="container mx-auto grid max-w-6xl grid-cols-2 gap-x-8 px-6 lg:grid-cols-4">{facts.map(fact => <div key={fact.label} className="flex flex-col gap-2 py-8"><dt className="flex flex-col items-start gap-3 text-sm text-muted-foreground"><fact.icon className="size-7 shrink-0 text-primary" strokeWidth={1.65} aria-hidden="true" /><span>{fact.label}</span></dt><dd className="text-xl font-medium text-foreground">{fact.value}</dd><dd className="text-sm leading-relaxed text-muted-foreground">{fact.note}</dd></div>)}</dl></section>
}
