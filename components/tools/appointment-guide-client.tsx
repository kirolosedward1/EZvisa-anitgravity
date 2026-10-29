"use client"

import { useState } from "react"
import { ArrowUpRight, Search, Fingerprint, FileCheck, CalendarDays } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"

const ROUTES = [
  { country: "France", ar: "فرنسا", provider: "VFS Global", href: "https://france-visas.gouv.fr/web/france-visas/emirats-arabes-unis" },
  { country: "Germany", ar: "ألمانيا", provider: "VFS Global", href: "https://uae.diplo.de/ae-en/service/05-visaeinreise" },
  { country: "Switzerland", ar: "سويسرا", provider: "VFS Global", href: "https://www.eda.admin.ch/countries/united-arab-emirates/en/home/visa/entry-ch/up-90-days/where-to-apply-schengen.html" },
  { country: "Spain", ar: "إسبانيا", provider: "BLS International", href: "https://uae.blsspainvisa.com/" },
]

export function AppointmentGuideClient() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => arabic ? ar : en
  const [query, setQuery] = useState("")
  const [provider, setProvider] = useState("all")
  const filtered = ROUTES.filter(route => (provider === "all" || route.provider === provider) && (route.country.toLowerCase().includes(query.trim().toLowerCase()) || route.ar.includes(query.trim())))
  const advice = [
    { icon: CalendarDays, title: t("Book through the official route", "احجز عبر المسار الرسمي"), body: t("Start with the destination’s embassy instructions. Check which centre serves your UAE residence, then confirm the address and arrival time on your booking. Appointment availability changes; there is no guaranteed release schedule.", "ابدأ بتعليمات سفارة الوجهة. تحقق من المركز المختص بمحل إقامتك في الإمارات، ثم أكد العنوان ووقت الحضور من حجزك. يتغير توفر المواعيد ولا يوجد جدول مضمون لطرحها.") },
    { icon: Fingerprint, title: t("Check whether new fingerprints are needed", "تحقق من الحاجة إلى بصمات جديدة"), body: t("Fingerprints recorded for a Schengen application within the previous 59 months may be reused. The consulate can still ask for new fingerprints or your attendance. Children under 12 are exempt from fingerprint collection. Follow the instructions for your application.", "قد تُستخدم مجددًا البصمات المسجلة لطلب شنغن خلال الأشهر الـ59 السابقة. ويمكن للقنصلية طلب بصمات جديدة أو حضورك. يُعفى الأطفال دون 12 عامًا من أخذ البصمات. اتبع التعليمات الخاصة بطلبك.") },
    { icon: FileCheck, title: t("Bring the file your checklist asks for", "أحضر الملف المطلوب في قائمتك"), body: t("Check the current document list, payment method and security rules before your visit. Bring originals and copies where requested. Premium lounge or courier services do not change the embassy’s decision or its processing time.", "راجع قائمة المستندات الحالية وطريقة الدفع وقواعد الدخول قبل زيارتك. أحضر الأصول والنسخ عند طلبها. لا تؤثر خدمات الصالة المميزة أو التوصيل في قرار السفارة أو مدة دراسة الطلب.") },
  ]
  return <div className="ez-appointment-guide">
    <div className="ez-catalog-toolbar"><div className="flex flex-wrap gap-2">{["all", "VFS Global", "BLS International"].map(item => <button key={item} type="button" aria-pressed={provider === item} onClick={() => setProvider(item)} className={`rounded-full border px-4 py-3 text-sm ${provider === item ? "bg-primary text-white border-primary" : "border-border"}`}>{item === "all" ? t("All centres", "كل المراكز") : item}</button>)}</div><div className="ez-catalog-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label={t("Search booking routes", "ابحث عن مسار حجز")} placeholder={t("Search country", "ابحث عن دولة")} value={query} onChange={e => setQuery(e.target.value)} /></div></div>
    <div className="ez-booking-routes">{filtered.map(route => <a key={route.country} href={route.href} target="_blank" rel="noopener noreferrer"><CountryFlag iso={SCHENGEN_META[route.country]?.iso} title={arabic ? route.ar : route.country} /><span><strong>{arabic ? route.ar : route.country}</strong><small>{route.provider}</small></span><span className="ez-booking-link">{t("Official instructions", "التعليمات الرسمية")}</span><ArrowUpRight size={20} aria-hidden="true" /></a>)}</div>
    {!filtered.length && <p className="py-8">{t("No matching route in this list. Check the destination’s embassy website for its current booking provider.", "لا يوجد مسار مطابق في هذه القائمة. راجع موقع سفارة الوجهة لمعرفة جهة الحجز الحالية.")}</p>}
    <p className="text-sm text-muted-foreground mt-6">{t("For other destinations, start with the embassy’s UAE website. This is a selected directory, not a live appointment service. EZvisa does not book appointments.", "للوجهات الأخرى، ابدأ بموقع سفارتها في الإمارات. هذا دليل مختار وليس خدمة مواعيد مباشرة. لا تحجز إيزي فيزا المواعيد.")}</p>
    <div className="ez-appointment-advice">{advice.map(item => <section key={item.title}><item.icon size={28} aria-hidden="true" /><h2>{item.title}</h2><p>{item.body}</p></section>)}</div>
  </div>
}
