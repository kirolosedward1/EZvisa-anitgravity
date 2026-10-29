import { Metadata } from "next"
import { LocaleLink } from "@/components/locale-link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { formatAedLabel } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
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
        description: "90/180-day stay planning calculator, embassy bank balance estimator, and UAE appointment booking guide.",
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
        t("Rolling 180-day calculation", "حساب قاعدة 180 يومًا المتحركة"),
        t("Add unlimited past and future trip dates", "أضف تواريخ الرحلات السابقة والقادمة"),
        t("See used days and remaining allowance", "اعرف الأيام المستخدمة والأيام المتبقية"),
      ]
    },
    {
      id: "bank-balance-calculator",
      title: t("Consulate Bank Balance Calculator", "حاسبة الرصيد البنكي للقنصلية"),
      badge: t("Official Solvency Thresholds", "حدود الملاءة المالية"),
      icon: Wallet,
      description: t(
        "Estimate funds for your travel plans. Bank evidence and the consulate’s assessment depend on your circumstances.",
        "قدّر المبلغ المناسب لخطط سفرك. تعتمد المستندات المالية وتقييم القنصلية على ظروفك.",
      ),
      href: "/tools/bank-balance-calculator",
      cta: t("Check Required Funds", "احسب المبلغ المطلوب"),
      color: "",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
      features: [
        t("Indicative EUR / CHF conversions to AED", "تحويل تقريبي من اليورو والفرنك إلى الدرهم"),
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
        "Find the official booking route for your destination and understand what to bring to your appointment.",
        "اعثر على مسار الحجز الرسمي لوجهتك وتعرّف على ما يلزم إحضاره إلى الموعد.",
      ),
      href: "/tools/appointment-guide",
      cta: t("Explore Visa Centers", "استعرض مراكز التأشيرات"),
      color: "",
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
      features: [
        t("Country-to-center jurisdiction mapping", "أي مركز يخدم كل دولة"),
        t("When previous fingerprints may be reused", "متى يمكن إعادة استخدام البصمات السابقة"),
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
    <div className="min-h-svh flex flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader forceBackground={true} />

      <main>
        <InnerHero title={t("A little planning goes a long way.", "القليل من التخطيط يصنع فرقًا.")} description={t("Three free tools for the practical details: your travel days, your budget and your appointment. Start with the one you need.", "ثلاث أدوات مجانية لتفاصيل رحلتك: أيام السفر والميزانية والموعد. ابدأ بما تحتاج إليه.")} />
        <div className="ez-tools-directory">
          {tools.map(tool => { const Icon = tool.icon; return <article key={tool.id}>
            <Icon aria-hidden="true" />
            <div><h2>{tool.title}</h2><p>{tool.description}</p><LocaleLink href={tool.href}>{tool.cta}<ArrowRight size={20} className="rtl:rotate-180" aria-hidden="true" /></LocaleLink></div>
            <div><ul>{tool.features.map(feature => <li key={feature}>{feature}</li>)}</ul></div>
          </article> })}
          <p className="text-sm text-muted-foreground pt-8">{t("These tools help you plan. Always check your visa conditions and the destination’s current official instructions.", "تساعدك هذه الأدوات على التخطيط. راجع دائمًا شروط تأشيرتك والتعليمات الرسمية الحالية لوجهتك.")}</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
