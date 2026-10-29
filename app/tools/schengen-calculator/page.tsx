import { InnerHero } from "@/components/inner-hero"
import { Metadata } from "next"
import { headers } from "next/headers"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Msg } from "@/components/msg"
import { SchengenCalculatorClient } from "@/components/tools/schengen-calculator-client"
import { message, type Locale } from "@/messages"
import { OG_LOCALE, defaultOgImage, localeAlternates } from "@/lib/seo"

async function pageLocale(): Promise<Locale> {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  return arabic ? "ar" : "en"
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await pageLocale()
  return {
    title: message(locale, "calc.metaTitle"),
    description: message(locale, "calc.metaDescription"),
    alternates: localeAlternates("/tools/schengen-calculator", locale === "ar"),
    openGraph: {
      title: message(locale, "calc.ogTitle"),
      description: message(locale, "calc.ogDescription"),
      url: `https://www.ezvisa.net${locale === "ar" ? "/ar" : ""}/tools/schengen-calculator`,
      siteName: "EZvisa",
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: OG_LOCALE[locale === "ar" ? "en" : "ar"],
      images: [defaultOgImage(locale === "ar")],
    },
  }
}

export default async function SchengenCalculatorPage() {
  const locale = await pageLocale()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: message(locale, "calc.jsonName"),
    url: "https://www.ezvisa.net/tools/schengen-calculator",
    applicationCategory: "TravelApplication",
    operatingSystem: "All",
    description: message(locale, "calc.jsonDescription"),
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
        <InnerHero variant="plain" title={<Msg id="calc.title" />} description={<Msg id="calc.intro" />} />
        <div className="container max-w-5xl mx-auto px-6"><SchengenCalculatorClient /></div>
      </main>

      <Footer />
    </div>
  )
}
