"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  SCHENGEN_FUNDS_RULES, 
  calculateRequiredFunds 
} from "@/lib/bank-requirements"
import { 
  Wallet, 
  ShieldAlert, 
  CheckCircle2, 
  Building, 
  ArrowRight, 
  FileText, 
  HelpCircle,
  Users
} from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { dirhamNoun } from "@/lib/currency"
import { countryNameAr } from "@/lib/countries"

export function BankBalanceCalculatorClient() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => (arabic ? ar : en)
  const digits = (n: number) => (arabic ? n.toLocaleString("en-US") : n.toLocaleString())
  const place = (name: string) => (arabic ? countryNameAr(name) : name)
  const [selectedCountry, setSelectedCountry] = useState("france")
  const [days, setDays] = useState(14)
  const [travelers, setTravelers] = useState(1)
  const [hasHotel, setHasHotel] = useState(true)

  const funds = calculateRequiredFunds(selectedCountry, days, travelers, hasHotel)

  return (
    <div className="space-y-10">
      {/* Top Advisory Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("Official Consular Subsistence Guidelines", "المعدلات اليومية المعتمدة لدى القنصليات")}</h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Schengen consulates in Dubai & Abu Dhabi require verifiable proof of financial stability covering daily living costs.",
                "تطلب قنصليات شنغن في دبي وأبوظبي إثباتًا يمكن التحقق منه يغطي تكاليف المعيشة اليومية.",
              )}
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          {t("UAE Bank Verified", "لحسابات بنوك الإمارات")}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-semibold text-base text-foreground border-b border-border/40 pb-3">
              {t("Trip Financial Parameters", "بيانات الرحلة المالية")}
            </h3>

            {/* Country Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                {t("Select Destination Country", "اختر دولة الوجهة")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(SCHENGEN_FUNDS_RULES).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCountry(key)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      selectedCountry === key
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/20 border-border/60 text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {place(item.country)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider & Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Stay Duration (Days)", "مدة الإقامة (بالأيام)")}
                </label>
                <span className="text-sm font-semibold text-foreground">{arabic ? `${days} يوم` : `${days} Days`}</span>
              </div>
              <input
                type="range"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{t("1 day", "يوم واحد")}</span>
                <span>{t("30 days", "30 يومًا")}</span>
                <span>{t("60 days", "60 يومًا")}</span>
                <span>{t("90 days (Max short-stay)", "90 يومًا (حد الإقامة القصيرة)")}</span>
              </div>
            </div>

            {/* Travelers Count */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                {t("Number of Applicants", "عدد المتقدمين")}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTravelers(num)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      travelers === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/20 border-border/60 text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 inline me-1 opacity-70" />
                    {arabic ? (num === 1 ? "شخص واحد" : `${num} أشخاص`) : `${num} ${num === 1 ? "Person" : "People"}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Accommodation Toggle */}
            <div className="pt-2 border-t border-border/40">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHotel}
                  onChange={(e) => setHasHotel(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                />
                <span className="text-xs text-foreground font-medium">
                  {t(
                    "Confirmed hotel reservations / accommodation will be provided in file (Lowers daily requirement for France & Germany)",
                    "ستُدرج حجوزات فندق مؤكدة في الملف (يخفض المعدل اليومي لفرنسا وألمانيا)",
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Consular Warning Note */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{t("Critical UAE Bank Statement Rule", "قاعدة مهمة لكشف الحساب في الإمارات")}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {arabic ? (
                <>
                  <strong>لا تودع مبلغًا نقديًا كبيرًا دفعة واحدة</strong> قبل تقديم كشف الحساب مباشرة. تراجع القنصليات الكشوف بحثًا عن إيداعات غير معتادة. يُفترض أن يظهر الراتب بإيداعات منتظمة مطابقة لشهادة عدم الممانعة.
                </>
              ) : (
                <>
                  <strong>Never deposit a sudden large cash lump sum</strong> right before submitting your bank statement. Consulates scrutinize bank statements for irregular deposits. The funds should show consistent salary deposits matching your employer&apos;s NOC.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Column: Output Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
            <div className="border-b border-border/40 pb-3 flex justify-between items-center">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                {t("Required Closing Balance", "الرصيد الختامي المطلوب")}
              </h3>
              <span className="text-xs font-semibold text-primary">{arabic ? `قنصلية ${place(funds.country)}` : `${funds.country} Consulate`}</span>
            </div>

            {/* Balance Highlight */}
            <div className="space-y-1 text-center py-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                {t("Minimum Statutory Balance", "الحد الأدنى النظامي")}
              </span>
              <div className="text-4xl font-semibold tracking-tight text-foreground">
                {arabic ? (
                  <bdi dir="ltr">
                    {digits(funds.totalAed)} <span className="text-xl font-semibold text-muted-foreground">{dirhamNoun(funds.totalAed)}</span>
                  </bdi>
                ) : (
                  <>
                    {digits(funds.totalAed)} <span className="text-xl font-semibold text-muted-foreground">AED</span>
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {arabic ? (
                  <bdi dir="ltr">
                    نحو {digits(funds.totalForeign)} {funds.currency} ({funds.dailyRate} {funds.currency}/يوم)
                  </bdi>
                ) : (
                  <>
                    Approx. {digits(funds.totalForeign)} {funds.currency} ({funds.dailyRate} {funds.currency}/day)
                  </>
                )}
              </div>
            </div>

            {/* Recommended Safety Buffer */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{t("Recommended Safety Buffer (+30%)", "هامش إضافي مقترح (+30%)")}</span>
                <span className="font-semibold text-primary">
                  {arabic ? <bdi dir="ltr">{digits(funds.recommendedBufferAed)} {dirhamNoun(funds.recommendedBufferAed)}</bdi> : `${digits(funds.recommendedBufferAed)} AED`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Visa officers favor applicants whose closing balance comfortably exceeds the bare statutory minimum.",
                  "يُستحسن أن يتجاوز الرصيد الختامي الحد الأدنى اليومي.",
                )}
              </p>
            </div>

            {/* Document Requirements Checklist */}
            <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border/40 pt-4">
              <span className="font-semibold uppercase text-[10px] tracking-wider text-foreground block">
                {t("What UAE Consulates Require:", "ما تطلبه القنصليات في الإمارات:")}
              </span>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{t("3 to 6 months original bank statements printed on official bank stationery with stamp.", "كشوف حساب أصلية لـ3 إلى 6 أشهر، مطبوعة على ورق البنك الرسمي وعليها ختم.")}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{t("Consistent monthly salary credits matching the salary stated on your NOC.", "إيداعات راتب شهرية منتظمة مطابقة للراتب المذكور في شهادة عدم الممانعة.")}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{t("Statements issued no more than 7 to 14 days before your appointment date.", "كشوف صادرة قبل موعدك بمدة لا تزيد على 7 إلى 14 يومًا.")}</span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              asChild
              className="w-full h-12 text-base font-semibold text-white shadow-lg shadow-blue-500/20 bg-[#0436DC]"
            >
              <LocaleLink href={`/apply?to=${encodeURIComponent(funds.country)}`} className="flex items-center justify-center gap-2">
                <span>{arabic ? `ابدأ ملف ${place(funds.country)}` : `Start ${funds.country} Application File`}</span>
                <ArrowRight className="w-4 h-4" />
              </LocaleLink>
            </Button>
          </div>

          {/* UAE Bank Info */}
          <div className="bg-muted/10 border border-border/50 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Building className="w-4 h-4 text-primary" />
              <span>{t("Accepted UAE Financial Institutions", "البنوك المقبولة في الإمارات")}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "Consulates accept certified statements from all Central Bank licensed banks in the UAE (Emirates NBD, Abu Dhabi Commercial Bank, First Abu Dhabi Bank, Dubai Islamic Bank, Mashreq, HSBC UAE, etc.). E-statements are accepted only if they contain the bank's digital authentication QR code.",
                "تقبل القنصليات الكشوف المعتمدة من البنوك المرخّصة من مصرف الإمارات المركزي، ومنها بنك الإمارات دبي الوطني وبنك أبوظبي التجاري وبنك أبوظبي الأول وبنك دبي الإسلامي والمشرق وHSBC. تُقبل الكشوف الإلكترونية إذا تضمنت رمز QR للتحقق من البنك.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="border-t border-border/60 pt-10 space-y-6">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          {t("Bank Statement & Financial FAQs", "أسئلة عن كشف الحساب والوضع المالي")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-semibold text-foreground">{t("Can I use my credit card limit instead of bank balance?", "هل يغني حد البطاقة الائتمانية عن الرصيد البنكي؟")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "No. Schengen embassies require liquid checking or savings accounts. Credit card limits may be submitted as supplementary evidence of financial capability, but they never replace the 3-6 months current account statement.",
                "لا. تطلب سفارات شنغن حسابًا جاريًا أو توفيرًا سائلًا. يمكن إرفاق حد البطاقة كدليل إضافي، وهو لا يحل محل كشف الحساب الجاري لـ3 إلى 6 أشهر.",
              )}
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-semibold text-foreground">{t("What if my salary is paid in cash?", "ماذا إذا كان الراتب يُدفع نقدًا؟")}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "If your salary is paid in cash without corresponding monthly bank deposits, approval chances drop significantly. Consulates require an auditable trail connecting your employment contract to regular bank balance accumulation.",
                "إذا كان الراتب نقدًا من دون إيداع شهري مقابل في الحساب، لا يظهر مسار يربط عقد العمل بالرصيد. تطلب القنصليات كشفًا يبيّن تراكم الرصيد بانتظام.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
