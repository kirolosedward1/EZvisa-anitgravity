import { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { SchengenCalculatorClient } from "@/components/tools/schengen-calculator-client"

export const metadata: Metadata = {
  title: "Schengen 90/180-Day Calculator | EZvisa UAE",
  description: "Free interactive Schengen 90/180 day rule calculator for UAE residents. Check your remaining allowable days, avoid overstay penalties, and plan your European trip.",
  alternates: {
    canonical: "https://www.ezvisa.net/tools/schengen-calculator",
  },
  openGraph: {
    title: "Schengen 90/180-Day Calculator | EZvisa",
    description: "Calculate your legal Schengen stay within the rolling 180-day window. Compliant with European Commission Border Code rules.",
    url: "https://www.ezvisa.net/tools/schengen-calculator",
    type: "website",
  },
}

export default function SchengenCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Schengen 90/180-Day Rule Calculator",
    url: "https://www.ezvisa.net/tools/schengen-calculator",
    applicationCategory: "TravelApplication",
    operatingSystem: "All",
    description: "Calculate legal short-stay duration in the Schengen area under the official 90/180-day rolling rule.",
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
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Free Traveler Utility
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Schengen 90/180-Day Calculator
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              Verify your European stay compliance. Calculate your remaining allowed days under the European Commission short-stay regulations before scheduling your visa appointment.
            </p>
          </div>

          <SchengenCalculatorClient />
        </div>
      </main>

      <Footer />
    </div>
  )
}
