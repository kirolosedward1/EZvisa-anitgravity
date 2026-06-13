import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { DestinationsCatalog } from "@/components/destinations-catalog"
import { ScrollToTop } from "@/components/scroll-to-top"

export const metadata: Metadata = {
  title: "Schengen Visa Destinations & Document Checklists | EZvisa",
  description:
    "Explore Schengen countries supported by EZvisa UAE. View detailed document lists for France, Germany, Italy, Spain, Switzerland, and 24 other nations. Pre-fill your visa wizard and start your application today.",
  keywords: [
    "Schengen countries list UAE",
    "Schengen visa destinations Dubai",
    "apply Schengen visa France UAE",
    "Schengen tourist visa Germany Dubai",
    "required visa documents Schengen",
    "Schengen visa requirements UAE citizens",
    "Schengen visa UAE residents",
  ],
  alternates: {
    canonical: "https://www.ezvisa.net/destinations",
  },
  openGraph: {
    title: "Schengen Visa Destinations & Document Checklists | EZvisa",
    description: "Explore 29 Schengen zone destinations and get specific visa check sheets. From 249 AED.",
    url: "https://www.ezvisa.net/destinations",
    type: "website",
  },
}

export default function DestinationsPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <InnerHero
          badge="Destinations"
          title={
            <>
              Explore Schengen <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-primary/80">Destinations</span>
            </>
          }
          description="Find tailored visa checklists, processing times, and prices for all 29 Schengen member states. We make visa applications simple."
          gradientType="default"
          randomizeBackground={true}
        />

        {/* Dynamic Destinations Grid and Filtering Catalog */}
        <DestinationsCatalog />
      </div>
      <Footer />
    </>
  )
}
