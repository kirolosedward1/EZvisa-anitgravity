import { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { BankBalanceCalculatorClient } from "@/components/tools/bank-balance-calculator-client"

export const metadata: Metadata = {
  title: "Schengen Visa Bank Balance Calculator | EZvisa UAE",
  description: "Calculate the exact minimum bank balance required for your Schengen visa application from Dubai & Abu Dhabi. Country-specific consular requirements in AED.",
  alternates: {
    canonical: "https://www.ezvisa.net/tools/bank-balance-calculator",
  },
  openGraph: {
    title: "Schengen Visa Bank Balance Calculator | EZvisa",
    description: "Check official daily subsistence rates and required bank closing balances in AED for Spain, France, Italy, Germany, and Switzerland.",
    url: "https://www.ezvisa.net/tools/bank-balance-calculator",
    type: "website",
  },
}

export default function BankBalanceCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Schengen Visa Proof of Funds Calculator",
    url: "https://www.ezvisa.net/tools/bank-balance-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    description: "Calculate statutory minimum bank balances required by European embassies for UAE residents.",
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
              Financial Readiness Utility
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Schengen Visa Bank Balance Calculator
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              Find out the exact closing balance your UAE bank statement needs to show for your European visa application, tailored to each country&apos;s legal daily subsistence requirements.
            </p>
          </div>

          <BankBalanceCalculatorClient />
        </div>
      </main>

      <Footer />
    </div>
  )
}
