import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { DestinationsCatalog } from "@/components/destinations-catalog"
import { ScrollToTop } from "@/components/scroll-to-top"
import { LangText } from "@/components/lang-text"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
  title: "Schengen Visa Destinations & Document Checklists",
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
    },
    {
      title: "وجهات شنغن وقوائم المستندات",
      description: "29 وجهة شنغن للمقيمين في الإمارات، مع قائمة المستندات لكل دولة. الرسم 249 درهم.",
      path: "/ar/destinations",
    },
  )
}

export default function DestinationsPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-secondary/40">
        <InnerHero
          badge={<LangText en="Destinations" ar="الوجهات" />}
          title={
            <LangText
              en="Schengen destinations"
              ar="وجهات شنغن"
            />
          }
          description={
            <LangText
              en="Visa requirements, visa centres and embassy fees for all 29 Schengen countries. Our service fee is 249 AED for any destination."
              ar="متطلبات التأشيرة ومراكز التأشيرات ورسوم السفارة لدول شنغن الـ29. رسوم خدمتنا 249 درهم لأي وجهة."
            />
          }
          randomizeBackground={true}
        />

        {/* Dynamic Destinations Grid and Filtering Catalog */}
        <DestinationsCatalog />
      </div>
      <Footer />
    </>
  )
}
