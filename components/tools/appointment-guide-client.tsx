"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Clock, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Fingerprint,
  CalendarDays,
  ShieldAlert
} from "lucide-react"
import { DigitRanges } from "@/components/digit-ranges"
import { VisaCentrePlace } from "@/components/visa-centre-place"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { countryNameAr } from "@/lib/countries"

interface CenterInfo {
  provider: "VFS Global" | "TLScontact" | "BLS International"
  countries: string[]
  dubaiAddress: string
  abuDhabiAddress: string
  bookingUrl: string
  timingTips: string
  vipAvailable: boolean
}

const APPOINTMENT_CENTERS: Record<string, CenterInfo> = {
  vfs: {
    provider: "VFS Global",
    countries: [
      "Germany", "Italy", "Switzerland", "Austria", "Netherlands", 
      "Greece", "Portugal", "Sweden", "Norway", "Denmark", "Czech Republic", 
      "Poland", "Hungary", "Croatia", "Finland", "Belgium", "Lithuania"
    ],
    dubaiAddress: "Level 2 & 3, WAFI Mall, Umm Hurair 2, Dubai",
    abuDhabiAddress: "Level B2, The Mall, World Trade Center, Abu Dhabi",
    bookingUrl: "https://visa.vfsglobal.com/are/en/",
    timingTips: "New appointment slots typically drop mid-week in the mornings (9:00 AM - 11:30 AM). Peak season runs May through August.",
    vipAvailable: true
  },
  tls: {
    provider: "TLScontact",
    countries: ["France"],
    dubaiAddress: "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai",
    abuDhabiAddress: "Level 25, Shining Towers, Mubarak Bin Mohammed St, Abu Dhabi",
    bookingUrl: "https://visas-fr.tlscontact.com/visa/ae/",
    timingTips: "TLScontact releases French visa appointments in monthly cohorts. Slots fill rapidly within 10-15 minutes of release.",
    vipAvailable: true
  },
  bls: {
    provider: "BLS International",
    countries: ["Spain"],
    dubaiAddress: "Al Barsha 1, Business Point Building, Dubai",
    abuDhabiAddress: "Office 1002, Al Muhairi Center, Al Khalidiya, Abu Dhabi",
    bookingUrl: "https://uae.blsspainvisa.com/",
    timingTips: "Spain slots open in staggered windows. Ensure passport details on the BLS account match your travel document perfectly.",
    vipAvailable: true
  }
}

const AR_CENTER: Record<string, { dubai: string; abuDhabi: string; timing: string }> = {
  vfs: {
    dubai: "الطابقان 2 و3، وافي مول، أم هرير 2، دبي",
    abuDhabi: "الطابق B2، المول، مركز التجارة العالمي، أبوظبي",
    timing: "تُفتح المواعيد عادة في منتصف الأسبوع صباحًا، بين 9:00 و11:30. موسم الذروة من مايو إلى أغسطس.",
  },
  tls: {
    dubai: "مبنى المنارة، الطابق 2، شارع الشيخ زايد، دبي",
    abuDhabi: "الطابق 25، أبراج شاينينغ، شارع مبارك بن محمد، أبوظبي",
    timing: "تُصدر TLScontact مواعيد تأشيرة فرنسا على دفعات شهرية. تمتلئ المواعيد خلال 10–15 دقيقة من فتحها.",
  },
  bls: {
    dubai: "البرشاء 1، مبنى بزنس بوينت، دبي",
    abuDhabi: "مكتب 1002، مركز المهيري، الخالدية، أبوظبي",
    timing: "تُفتح مواعيد إسبانيا على فترات متفرقة. يجب أن تطابق بيانات الجواز في حساب BLS وثيقة السفر.",
  },
}

export function AppointmentGuideClient() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => (arabic ? ar : en)
  const [selectedProvider, setSelectedProvider] = useState<string>("vfs")
  const [countryFilter, setCountryFilter] = useState<string>("")

  const active = APPOINTMENT_CENTERS[selectedProvider]
  const activeAr = AR_CENTER[selectedProvider]

  return (
    <div className="space-y-10">
      {/* Top Value Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("UAE Appointment Center Map & Rules", "مراكز المواعيد في الإمارات وقواعدها")}</h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Official operating locations, slot release habits, and biometrics rules for Dubai and Abu Dhabi centers.",
                "عناوين العمل، وعادة فتح المواعيد، وقواعد البصمة في مركزي دبي وأبوظبي.",
              )}
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
          {t("Dubai & Abu Dhabi Hubs", "دبي وأبوظبي")}
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(APPOINTMENT_CENTERS).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setSelectedProvider(key)}
            className={`flex-1 min-w-[200px] p-4 rounded-2xl border text-left transition-all ${
              selectedProvider === key
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border/80 text-foreground hover:bg-muted/30"
            }`}
          >
            <div className="font-semibold text-base">{item.provider}</div>
            <div className={`text-xs mt-1 ${selectedProvider === key ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {item.countries
                .slice(0, 3)
                .map((c) => (arabic ? countryNameAr(c) : c))
                .join(arabic ? "، " : ", ")}
              {item.countries.length > 3 && (arabic ? ` و${item.countries.length - 3} أخرى` : ` +${item.countries.length - 3} more`)}
            </div>
          </button>
        ))}
      </div>

      {/* Main Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Center Specifics */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg text-foreground">{arabic ? `${active.provider} في الإمارات` : `${active.provider} UAE Overview`}</h3>
              </div>
              <a
                href={active.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                {t("Official Portal", "الموقع الرسمي")} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Locations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                  {t("Dubai Application Center", "مركز التقديم في دبي")}
                </span>
                <VisaCentrePlace className="mt-2" centre={active.provider} address={active.dubaiAddress} locale={arabic ? "ar" : "en"} />
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                  {t("Abu Dhabi Application Center", "مركز التقديم في أبوظبي")}
                </span>
                <VisaCentrePlace className="mt-2" centre={active.provider} address={active.abuDhabiAddress} locale={arabic ? "ar" : "en"} />
              </div>
            </div>

            {/* Timing & Slot Pattern */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-primary" />
                <span>{t("Slot Pattern & Lead Time", "نمط المواعيد ومدة الحجز")}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {arabic ? <DigitRanges text={activeAr.timing} /> : active.timingTips}
              </p>
            </div>

            {/* Handled Countries */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("Schengen Countries Processed at this Center:", "دول شنغن التي يخدمها هذا المركز:")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {active.countries.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border/50 text-xs font-medium text-foreground"
                  >
                    {arabic ? countryNameAr(c) : c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 59-Month Biometrics Rule Card */}
          <div className="bg-muted/10 border border-border/50 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Fingerprint className="w-5 h-5 text-primary" />
              <span>{t("The 59-Month Biometrics Exemption Rule", "قاعدة إعفاء البصمة لـ59 شهرًا")}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {arabic ? (
                <>
                  إذا قدّمت بصمات وصورة رقمية لتأشيرة شنغن سابقة خلال آخر <strong>59 شهرًا (4 سنوات و11 شهرًا)</strong>، تُحفظ بياناتك في نظام معلومات التأشيرات (VIS). في كثير من الحالات تعيد القنصلية استخدام التسجيل السابق.
                </>
              ) : (
                <>
                  If you have already provided biometric fingerprints and a digital photograph for a previous Schengen visa within the last <strong>59 months (4 years and 11 months)</strong>, your biometric data is legally stored in the central Visa Information System (VIS). In many instances, the consulate can reuse your prior biometric enrollment.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Column: Appointment Day Protocol */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
            <h3 className="font-semibold text-base text-foreground uppercase tracking-wider text-xs border-b border-border/40 pb-3">
              {t("Appointment Day Survival Protocol", "في يوم الموعد")}
            </h3>

            <div className="space-y-3.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-[10px]">
                  1
                </div>
                <div>
                  <strong className="text-foreground block">{t("Arrive 15 Minutes Early", "احضر قبل 15 دقيقة")}</strong>
                  <span>{t("Do not arrive an hour early; centers operate strict security entry windows based on your printed appointment confirmation time.", "لا تحضر قبل الموعد بساعة. الدخول الأمني مرتبط بوقت التأكيد المطبوع.")}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-[10px]">
                  2
                </div>
                <div>
                  <strong className="text-foreground block">{t("Physical Stamped Bank Statements", "كشوف حساب مختومة")}</strong>
                  <span>{t("Ensure your 3-6 month UAE bank statements have original physical teller stamps or a verifiable authentication QR code.", "يجب أن تحمل كشوف 3 إلى 6 أشهر ختم الموظف الأصلي أو رمز QR للتحقق.")}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-[10px]">
                  3
                </div>
                <div>
                  <strong className="text-foreground block">{t("Carry Card for Embassy Fee", "احمل بطاقة لرسوم السفارة")}</strong>
                  <span>
                    {arabic
                      ? <>رسم التأشيرة المعتاد للبالغ 90 يورو، ويُحصَّل في الشباك بالبطاقة أو نقدًا، مع رسم خدمة المركز نحو <bdi dir="ltr">100–140</bdi> درهمًا.</>
                      : "The standard 90 EUR adult visa fee is charged in AED at the counter by card or cash, along with the center's nominal service fee (~100-140 AED)."}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-[10px]">
                  4
                </div>
                <div>
                  <strong className="text-foreground block">{t("Organized File Dossier", "رتّب ملفك")}</strong>
                  <span>{t("Having your completed form, cover letter, itinerary, and hotel vouchers neatly organized avoids counter delays.", "ترتيب النموذج وخطاب التغطية وخط السير وقسائم الفندق يقلل التأخير عند الشباك.")}</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-2 border-t border-border/40 space-y-3">
              <Button
                asChild
                className="w-full h-12 text-base font-semibold text-white shadow-lg shadow-blue-500/20 bg-[#0436DC]"
              >
                <LocaleLink href="/apply" className="flex items-center justify-center gap-2">
                  <span>{t("Prepare My Complete Visa Dossier", "جهّز ملف التأشيرة")}</span>
                  <ArrowRight className="w-4 h-4" />
                </LocaleLink>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                {t("EZvisa organizes your full file ready for submission at VFS, TLS, or BLS.", "جهّز إيزي فيزا الملف للتسليم لدى VFS أو TLS أو BLS.")}
              </p>
            </div>
          </div>

          {/* Premium Lounge Note */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{t("VIP / Premium Lounge Warning", "تنبيه صالة كبار الزوار")}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {arabic ? (
                <>
                  موعد الصالة المميزة لدى VFS أو TLS يوفّر منطقة انتظار خاصة ومشروبات، و<strong>لا يؤثر في قرار السفارة ولا يسرّعه</strong>.
                </>
              ) : (
                <>
                  Opting for a Premium Lounge appointment at VFS or TLS provides a private waiting area and refreshments, but <strong>does not influence or accelerate the embassy&apos;s consular decision</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
