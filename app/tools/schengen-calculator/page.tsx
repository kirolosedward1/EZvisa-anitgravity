import { Metadata } from "next"
import { headers } from "next/headers"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Msg } from "@/components/msg"
import { SchengenCalculatorClient } from "@/components/tools/schengen-calculator-client"
import { message, type Locale } from "@/messages"

async function pageLocale(): Promise<Locale> {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  return arabic ? "ar" : "en"
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await pageLocale()
  return {
    title: message(locale, "calc.metaTitle"),
    description: message(locale, "calc.metaDescription"),
    alternates: {
      canonical: "https://www.ezvisa.net/tools/schengen-calculator",
    },
    openGraph: {
      title: message(locale, "calc.ogTitle"),
      description: message(locale, "calc.ogDescription"),
      url: "https://www.ezvisa.net/tools/schengen-calculator",
      type: "website",
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

      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-2 block">
              <Msg id="calc.eyebrow" />
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              <Msg id="calc.title" />
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              <Msg id="calc.intro" />
            </p>
          </div>

          <SchengenCalculatorClient />
        </div>
      </main>

      <Footer />
    </div>
  )
}
