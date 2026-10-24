import type { Metadata } from "next"
import { Minus } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { CompanyLegalNotice } from "@/components/legal/company-details"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { ContactSection } from "@/components/contact-section"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export const metadata: Metadata = {
  title: "About EZvisa | Schengen Visa Specialists for UAE Residents",
  description:
    "EZvisa prepares Schengen visa applications for people living in the UAE: the application form, cover letter, itinerary and reservations, checked by a visa specialist.",
  keywords: ["about EZvisa", "Schengen visa specialists UAE", "visa application service Dubai"],
  alternates: {
    canonical: "https://www.ezvisa.net/about",
  },
  openGraph: {
    title: "About EZvisa",
    description: "Schengen visa applications prepared by specialists for UAE residents.",
    url: "https://www.ezvisa.net/about",
    type: "website",
  },
}

const FACTS = [
  { value: `${PRICE_AED} AED`, label: "One fee per application" },
  { value: "29", label: "Schengen countries" },
  { value: "1–2 days", label: "To prepare your file" },
  { value: "5", label: "Documents we prepare" },
]

const WE_DONT = [
  "We're not an embassy or a visa centre, and we don't work for one. The decision on your visa is always the embassy's.",
  "We don't promise approval. Nobody honestly can, and anyone who does is selling you something else.",
  "We don't book or attend your visa centre appointment. You book the slot; we make sure the file you bring is right.",
  "We don't sell plane tickets. Your flight and hotel reservations are for the visa, so you don't pay for a trip before you have one.",
]

export default function AboutPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge="About EZvisa"
          title="We prepare Schengen visa files for people who live in the UAE."
          description="A visa application is judged on paper. We make sure yours is complete, and that every page tells the same story about your trip."
        />

        {/* What we do */}
        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <h2 className="text-balance text-foreground">What we do</h2>
            <div className="flex flex-col gap-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                You tell us about your trip and upload your documents. A visa specialist reads them, fills in your Schengen
                application form, writes a cover letter for your trip, plans a day-by-day itinerary, and arranges flight and
                hotel reservations that match it.
              </p>
              <p>
                Before anything comes back to you, we check that the whole file agrees with itself: the dates, the cities, your
                job and your bank statements. A consulate officer reads all of it together, and gaps between documents are
                what raise questions.
              </p>
              <p>
                Most of our customers are expats from India, Egypt, Jordan, Pakistan and other countries whose passports need a
                Schengen visa, travelling on a UAE residence visa. The rules for you are the same at every embassy, and we work
                with them every day.
              </p>
            </div>
          </div>
        </section>

        {/* Facts */}
        <section className="border-y border-border/70 bg-secondary/40">
          <dl className="container mx-auto grid max-w-6xl grid-cols-2 gap-x-8 px-4 sm:px-6 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-1 py-8">
                <dt className="order-2 text-sm text-muted-foreground">{fact.label}</dt>
                <dd className="order-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* What we don't do */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">What we don&apos;t do</h2>
              <p className="text-base leading-relaxed text-muted-foreground">So you know exactly what you&apos;re paying for.</p>
            </div>
            <ul className="flex flex-col">
              {WE_DONT.map((line) => (
                <li key={line} className="flex items-start gap-4 border-t border-border/70 py-5 text-base leading-relaxed text-foreground first:border-0 first:pt-0">
                  <Minus className="mt-1.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ContactSection />
      </div>
      <CompanyLegalNotice />
      <Footer />
    </>
  )
}
