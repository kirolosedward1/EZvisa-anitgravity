"use client"

import { useState } from "react"
import { ArrowRight, ExternalLink } from "lucide-react"
import { SCHENGEN_FUNDS_RULES, calculateRequiredFunds, EUR_TO_AED, CHF_TO_AED } from "@/lib/bank-requirements"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { countryNameAr } from "@/lib/countries"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"

const NOTES: Record<string, [string, string]> = {
  france: ["Uses €65 per adult per day with hotel reservations, or €120 without them. A validated host certificate has a different reference amount; this calculator does not cover that case.", "يستخدم 65 يورو للبالغ يوميًا مع حجز فندقي أو 120 يورو بدونه. لشهادة الاستضافة المعتمدة مبلغ مختلف لا تغطيه هذه الحاسبة."],
  spain: ["Uses the 2026 reference of €122.10 per day, with a minimum of €1,098.90 per person.", "يستخدم مرجع 2026: 122.10 يورو يوميًا، بحد أدنى 1,098.90 يورو للفرد."],
  italy: ["Uses Italy’s duration bands and the single-person or group rate. The total includes the fixed amount where applicable.", "يستخدم شرائح المدة الإيطالية ومعدل الفرد أو المجموعة، ويشمل المبلغ الثابت عند انطباقه."],
  germany: ["€45 per day is a reference for certain circumstances, not a mandatory universal minimum. Authorities assess your trip and personal situation.", "45 يورو يوميًا مبلغ مرجعي لبعض الحالات وليس حدًا إلزاميًا عامًا. تقيّم السلطات رحلتك وظروفك الشخصية."],
  switzerland: ["Uses CHF100 per adult per day. Students with valid proof may qualify for a different amount; this calculator uses the standard adult rate.", "يستخدم 100 فرنك للبالغ يوميًا. قد ينطبق مبلغ مختلف على الطلاب مع إثبات صالح؛ تستخدم الحاسبة المعدل المعتاد للبالغين."],
  netherlands: ["Uses the €55 per person per day reference. Sponsorship and your personal circumstances can affect the evidence required.", "يستخدم المرجع البالغ 55 يورو للفرد يوميًا. قد يؤثر التكفل وظروفك الشخصية في الأدلة المطلوبة."],
  greece: ["Uses €50 per adult per day and a €300 minimum for short stays. Reduced amounts for minors are not calculated here.", "يستخدم 50 يورو للبالغ يوميًا بحد أدنى 300 يورو للإقامات القصيرة. لا تشمل الحاسبة التخفيضات الخاصة بالقاصرين."],
  austria: ["Austria assesses funds case by case and does not set a fixed daily reference amount. Check the current checklist for evidence covering your stay and return journey.", "تقيّم النمسا الأموال حسب كل حالة ولا تحدد مبلغًا مرجعيًا يوميًا ثابتًا. راجع القائمة الحالية لإثبات تغطية الإقامة ورحلة العودة."],
}

export function BankBalanceCalculatorClient() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => arabic ? ar : en
  const [country, setCountry] = useState("france")
  const [days, setDays] = useState(14)
  const [adults, setAdults] = useState(1)
  const [hotel, setHotel] = useState(true)
  const valid = Number.isInteger(days) && days >= 1 && days <= 90 && Number.isInteger(adults) && adults >= 1 && adults <= 20
  const funds = calculateRequiredFunds(country, valid ? days : 1, valid ? adults : 1, hotel)
  const amount = (n: number) => n.toLocaleString(arabic ? "ar-AE" : "en-AE", { maximumFractionDigits: 2 })
  return <div className="ez-funds-tool">
    <div className="ez-funds-layout">
      <div className="ez-funds-inputs"><h2>{t("Your travel plans", "خطط سفرك")}</h2>
        <fieldset><legend>{t("Destination", "الوجهة")}</legend><div className="ez-funds-countries">{Object.entries(SCHENGEN_FUNDS_RULES).map(([key, item]) => <button key={key} type="button" aria-label={arabic ? countryNameAr(item.country) : item.country} aria-pressed={country === key} onClick={() => setCountry(key)}><CountryFlag iso={SCHENGEN_META[item.country]?.iso} title={arabic ? countryNameAr(item.country) : item.country} /><span>{arabic ? countryNameAr(item.country) : item.country}</span></button>)}</div></fieldset>
        <div className="grid grid-cols-2 gap-5"><label htmlFor="funds-days">{t("Trip length (days)", "مدة الرحلة (أيام)")}<input id="funds-days" type="number" min="1" max="90" value={Number.isNaN(days) ? "" : days} onChange={e => setDays(e.target.valueAsNumber)} /></label><label htmlFor="funds-adults">{t("Adults travelling", "عدد البالغين")}<input id="funds-adults" type="number" min="1" max="20" value={Number.isNaN(adults) ? "" : adults} onChange={e => setAdults(e.target.valueAsNumber)} /></label></div>
        {country === "france" && <label className="ez-funds-checkbox"><input type="checkbox" checked={hotel} onChange={e => setHotel(e.target.checked)} />{t("Hotel reservations cover the whole stay", "حجوزات فندقية تغطي الإقامة كاملة")}</label>}
        {!valid && <p role="alert">{t("Enter 1–90 days and 1–20 adults to calculate an estimate.", "أدخل من 1 إلى 90 يومًا ومن 1 إلى 20 بالغًا لحساب التقدير.")}</p>}
        <p className="text-sm text-muted-foreground leading-relaxed">{t("Use this as a planning reference for adult tourists. It is not a guaranteed bank-balance requirement or a visa eligibility check.", "استخدم هذا كمرجع تخطيطي للسياح البالغين. ليس شرط رصيد بنكي مضمونًا أو فحصًا لأهلية التأشيرة.")}</p>
      </div>
      <section className="ez-funds-result" aria-live="polite" aria-atomic="true"><h2>{t("Your estimate", "تقديرك")}</h2>
        {country === "austria" ? <h3>{t("Assessed individually", "تقييم حسب الحالة")}</h3> : valid ? <><p className="ez-funds-total">{amount(funds.totalAed)} <span>{t("AED", "درهم")}</span></p><p>{amount(funds.totalForeign)} {funds.currency}</p></> : <p>{t("Complete the trip details to see your estimate.", "أكمل بيانات الرحلة لعرض التقدير.")}</p>}
        <p className="ez-funds-note">{NOTES[country][arabic ? 1 : 0]}</p>
        {country !== "austria" && valid && <p className="text-sm leading-relaxed">{t(`With an optional 30% budget cushion: ${amount(funds.recommendedBufferAed)} AED. This is a planning example, not an embassy requirement.`, `مع هامش ميزانية اختياري 30%: ${amount(funds.recommendedBufferAed)} درهم. هذا مثال للتخطيط وليس شرطًا للسفارة.`)}</p>}
        <p className="text-xs leading-relaxed">{t(`Fixed illustrative rates: EUR 1 = AED ${EUR_TO_AED}; CHF 1 = AED ${CHF_TO_AED}. Rates are not live. Check current conversion rates before relying on the AED total.`, `أسعار توضيحية ثابتة: اليورو = ${EUR_TO_AED} درهم؛ الفرنك = ${CHF_TO_AED} درهم. الأسعار غير مباشرة. تحقق من السعر الحالي قبل الاعتماد على المجموع بالدرهم.`)}</p>
        <a href="https://home-affairs.ec.europa.eu/document/download/7130e21d-c1c8-41fd-9c83-b6fe312d4f5c_en" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline">{t("Read the official reference amounts", "اقرأ المبالغ المرجعية الرسمية")}<ExternalLink size={14} aria-hidden="true" /></a>
      </section>
    </div>
    <section className="ez-funds-guidance"><h2>{t("What your bank statement needs to show", "ما يجب أن يوضحه كشف حسابك")}</h2><div><p>{t("Follow the destination’s checklist for the statement period, issue date and accepted format. A closing balance alone does not explain your finances: show the source of your funds and provide supporting documents where needed.", "اتبع قائمة الوجهة بشأن فترة الكشف وتاريخ إصداره والصيغة المقبولة. الرصيد الختامي وحده لا يوضح وضعك المالي: بيّن مصدر أموالك وأرفق المستندات الداعمة عند الحاجة.")}</p><p>{t("If you are sponsored or paid in cash, check which evidence is accepted for your situation. There is no single QR-code or stamping rule that applies to every consulate.", "إذا كان شخص آخر يتكفل بك أو كنت تتقاضى راتبك نقدًا، فتحقق من الأدلة المقبولة لحالتك. لا توجد قاعدة واحدة للختم أو رمز التحقق تنطبق على جميع القنصليات.")}</p><LocaleLink href={`/apply?to=${encodeURIComponent(funds.country)}`}>{t("Get help preparing your file", "احصل على مساعدة لتجهيز ملفك")}<ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" /></LocaleLink></div></section>
  </div>
}
