import { Metadata } from "next"
import { LocaleLink } from "@/components/locale-link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { requestLocale } from "@/lib/request-locale"
import { withArabicMeta } from "@/lib/page-meta"
import {
  Calendar,
  Wallet,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Free Schengen Travel Tools & Calculators",
      description: "Free interactive Schengen visa tools for UAE residents. Calculate the 90/180-day rolling rule, estimate required consular bank balance in AED, and locate VFS/TLS/BLS visa centers in Dubai & Abu Dhabi.",
      alternates: {
        canonical: "https://www.ezvisa.net/tools",
      },
      openGraph: {
        title: "Free Schengen Travel Tools & Calculators | EZvisa UAE",
        description: "Official European Commission 90/180-day stay calculator, embassy bank balance estimator, and UAE appointment booking guide.",
        url: "https://www.ezvisa.net/tools",
        type: "website",
      },
    },
    {
      title: "أدوات وحاسبات مجانية لتأشيرة شنغن",
      description: "أدوات مجانية للمقيمين في الإمارات: حاسبة قاعدة 90/180 يومًا، وتقدير الرصيد البنكي بالدرهم، ودليل مواعيد VFS وTLS وBLS في دبي وأبوظبي.",
      path: "/ar/tools",
    },
  )
}

export default async function ToolsIndexPage() {
  const arabic = (await requestLocale()) === "ar"
  const t = (en: string, ar: string) => (arabic ? ar : en)
  const tools = [
    {
      id: "schengen-calculator",
      title: t("Schengen 90/180-Day Rule Calculator", "حاسبة قاعدة 90/180 يومًا في شنغن"),
      badge: t("European Commission Rule", "قاعدة المفوضية الأوروبية"),
      icon: Calendar,
      description: t(
        "Track previous trips, calculate remaining allowable days, and avoid unintentional overstay penalties across all 29 Schengen states.",
        "تتبّع الرحلات السابقة واحسب الأيام المتبقية ضمن دول شنغن الـ29، حتى لا تتجاوز مدة الإقامة المسموحة.",
      ),
      href: "/tools/schengen-calculator",
      cta: t("Calculate Stay Days", "احسب أيام الإقامة"),
      color: "",
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
      features: [
        t("Official rolling 180-day calculation algorithm", "حساب قاعدة 180 يومًا المتحركة"),
        t("Add unlimited past and future trip dates", "أضف تواريخ الرحلات السابقة والقادمة"),
        t("Direct export into visa application file", "اعرف الأيام المستخدمة والأيام المتبقية"),
      ]
    },
    {
      id: "bank-balance-calculator",
      title: t("Consulate Bank Balance Calculator", "حاسبة الرصيد البنكي للقنصلية"),
      badge: t("Official Solvency Thresholds", "حدود الملاءة المالية"),
      icon: Wallet,
      description: t(
        "Determine the exact closing balance required in your UAE bank statement for Spain, France, Italy, Germany, and Switzerland.",
        "احسب الرصيد الختامي المطلوب في كشف حسابك الإماراتي لإسبانيا وفرنسا وإيطاليا وألمانيا وسويسرا.",
      ),
      href: "/tools/bank-balance-calculator",
      cta: t("Check Required Funds", "احسب المبلغ المطلوب"),
      color: "",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
      features: [
        t("Real-time AED conversions from EUR / CHF", "تحويل من اليورو والفرنك إلى الدرهم"),
        t("Multi-traveler & trip duration multipliers", "حساب لعدة مسافرين ولمدة الرحلة"),
        t("Guidance on salary credits and NOC alignment", "إرشاد عن إيداعات الراتب ومطابقة شهادة عدم الممانعة"),
      ]
    },
    {
      id: "appointment-guide",
      title: t("UAE Schengen Appointment & Biometrics Hub", "دليل مواعيد شنغن والبصمة في الإمارات"),
      badge: t("VFS, TLS & BLS Directory", "دليل VFS وTLS وBLS"),
      icon: MapPin,
      description: t(
        "Navigate visa application centers across Dubai (Wafi Mall, Sheikh Zayed Rd, Al Barsha) and Abu Dhabi with center procedures and biometrics rules.",
        "مراكز تقديم التأشيرة في دبي (وافي مول، شارع الشيخ زايد، البرشاء) وأبوظبي، مع إجراءات المركز وقواعد البصمة.",
      ),
      href: "/tools/appointment-guide",
      cta: t("Explore Visa Centers", "استعرض مراكز التأشيرات"),
      color: "",
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
      features: [
        t("Country-to-center jurisdiction mapping", "أي مركز يخدم كل دولة"),
        t("59-month biometrics (VIS) exemption rules", "قاعدة إعفاء البصمة لـ59 شهرًا"),
        t("Center counter security and document guidelines", "إرشادات الدخول والمستندات في المركز"),
      ]
    }
  ]

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("EZvisa Free Schengen Travel Tools", "أدوات إيزي فيزا المجانية لتأشيرة شنغن"),
    url: arabic ? "https://www.ezvisa.net/ar/tools" : "https://www.ezvisa.net/tools",
    description: t(
      "Free interactive utility tools for Schengen visa applicants in the United Arab Emirates.",
      "أدوات مجانية لمتقدّمي تأشيرة شنغن في الإمارات.",
    ),
    hasPart: tools.map(t => ({
      "@type": "WebApplication",
      name: t.title,
      url: "https://www.ezvisa.net" + t.href,
      description: t.description,
    }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader forceBackground={true} />

      <main className="flex-1 py-14 md:py-20">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
              <span>{t("UAE Traveler Intelligence Suite", "أدوات للمقيمين في الإمارات")}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold text-foreground tracking-tight">
              {t("Free Schengen Visa Tools & Calculators", "أدوات وحاسبات مجانية لتأشيرة شنغن")}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
              {t(
                "Plan your European itinerary with total confidence. Built specifically for UAE residents, Golden Visa holders, and frequent travelers to help you meet consular requirements.",
                "أدوات للمقيمين في الإمارات وحاملي الإقامة الذهبية والمسافرين المتكررين، لحساب أيام الإقامة والرصيد ومركز التقديم.",
              )}
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <div 
                  key={tool.id} 
                  className="bg-card border border-border/80 rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl hover:border-primary/40 transition-all duration-300 relative overflow-hidden group"
                >
                  <div className={"absolute inset-0 bg-[#F7F8FA]" + tool.color + " opacity-70 pointer-events-none group-hover:opacity-100 transition-opacity"} />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-background border border-border/80 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className={"text-[11px] font-semibold px-2.5 py-1 rounded-full border " + tool.badgeColor}>
                        {tool.badge}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {tool.title}
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {tool.description}
                    </p>

                    <div className="space-y-2.5 mb-8 border-t border-border/60 pt-4">
                      {tool.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 pt-2">
                    <Button asChild className="w-full rounded-full shadow-sm text-sm font-semibold">
                      <LocaleLink href={tool.href} className="flex items-center justify-center gap-2">
                        {tool.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </LocaleLink>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Value Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t("Consulate-Ready Document Preparation", "تجهيز ملف التأشيرة")}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
                {t("Done calculating? Let our experts assemble your complete visa file.", "انتهيت من الحساب؟ يجهّز المختصون ملف التأشيرة.")}
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
                {arabic ? (
                  <>نموذج الطلب وحجوزات الطيران والفندق وخطاب التغطية وبرنامج الرحلة. جاهز خلال <bdi dir="ltr">1–2</bdi> يوم. تأمين السفر إضافة اختيارية.</>
                ) : (
                  "From embassy application forms and verifiable flight & hotel reservations to customized cover letters and travel insurance, get your complete Schengen dossier ready in 24–48 hours."
                )}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold">
                  <LocaleLink href="/apply">
                    {t("Start Your Application • From 249 AED", "ابدأ طلبك · 249 درهم")}
                  </LocaleLink>
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-full border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-white font-medium">
                  <LocaleLink href="/how-it-works">
                    {t("How It Works", "كيف تعمل")}
                  </LocaleLink>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
