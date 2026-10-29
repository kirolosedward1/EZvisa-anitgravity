import { InnerHero } from "@/components/inner-hero"
import { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { BankBalanceCalculatorClient } from "@/components/tools/bank-balance-calculator-client"
import { withArabicMeta } from "@/lib/page-meta"
import { requestLocale } from "@/lib/request-locale"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Schengen Visa Bank Balance Calculator",
      description: "Estimate travel funds for a Schengen trip from the UAE, with indicative AED conversions and country guidance.",
      alternates: {
        canonical: "https://www.ezvisa.net/tools/bank-balance-calculator",
      },
      openGraph: {
        title: "Schengen Visa Bank Balance Calculator | EZvisa",
        description: "Plan your trip budget with reference amounts and indicative AED conversions.",
        url: "https://www.ezvisa.net/tools/bank-balance-calculator",
        type: "website",
      },
    },
    {
      title: "حاسبة الرصيد البنكي لتأشيرة شنغن",
      description: "احسب الحد الأدنى للرصيد الختامي الذي يُظهره كشف حسابك في الإمارات، وفق المعدل اليومي لكل دولة، بالدرهم.",
      path: "/ar/tools/bank-balance-calculator",
    },
  )
}

export default async function BankBalanceCalculatorPage() {
  const arabic = (await requestLocale()) === "ar"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: arabic ? "حاسبة إثبات الملاءة لتأشيرة شنغن" : "Schengen Visa Proof of Funds Calculator",
    url: arabic ? "https://www.ezvisa.net/ar/tools/bank-balance-calculator" : "https://www.ezvisa.net/tools/bank-balance-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    description: arabic
      ? "احسب الحد الأدنى للرصيد البنكي الذي تطلبه السفارات الأوروبية من المقيمين في الإمارات."
      : "Estimate travel funds using destination guidance and planning assumptions.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AED",
    },
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader forceBackground={true} />

      <main className="ez-tool-page flex-1">
        <InnerHero variant="plain" title={arabic ? "قدّر ميزانية رحلتك" : "Estimate your travel funds"} description={arabic ? "قدّر مصاريف رحلتك بالدرهم. الأرقام إرشادية، وأسعار الصرف تقريبية، وتختلف الأدلة المالية المطلوبة حسب حالتك." : "Plan your travel funds in AED. Figures are a guide, exchange rates are indicative, and the financial evidence required depends on your circumstances."} />
        <div className="container max-w-5xl mx-auto px-6"><BankBalanceCalculatorClient /></div>
      </main>

      <Footer />
    </div>
  )
}
