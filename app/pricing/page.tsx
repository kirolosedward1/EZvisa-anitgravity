import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Minus } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { ContactSection } from "@/components/contact-section"
import { PRICE_AED, priceAed } from "@/lib/shared/wizard-contract"

export const metadata: Metadata = {
  title: "Pricing: 249 AED per Schengen Visa Application",
  description:
    "EZvisa charges 249 AED per application (498 AED with your spouse) for the application form, cover letter, itinerary, and flight and hotel reservations. Embassy fees and travel insurance are separate.",
  keywords: ["Schengen visa cost UAE", "Schengen visa fee Dubai", "visa application service price", "Europe visa cost UAE"],
  alternates: {
    canonical: "https://www.ezvisa.net/pricing",
  },
  openGraph: {
    title: "EZvisa Pricing: 249 AED per Application",
    description: "One fee for everything we prepare. Embassy fees and travel insurance are paid separately.",
    url: "https://www.ezvisa.net/pricing",
    type: "website",
  },
}

const INCLUDED = [
  "Completed Schengen visa application form",
  "Cover letter for your trip",
  "Day-by-day travel itinerary",
  "Flight reservation (no ticket purchase needed)",
  "Hotel reservations for your full stay",
  "Document check by a visa specialist",
  "Support on WhatsApp and email until your appointment",
]

const SEPARATE = [
  {
    title: "Embassy visa fee",
    body: "€90 for adults and €45 for children aged 6 to 12, paid in dirhams at the visa centre on the day.",
  },
  {
    title: "Visa centre service charge",
    body: "Set by VFS Global, BLS or TLScontact, depending on the country. Also paid at your appointment.",
  },
  {
    title: "Travel insurance",
    body: "Every embassy asks for medical cover of at least €30,000. Add a policy through us as an extra, or bring your own.",
  },
  {
    title: "Translation, attestation and courier",
    body: "Only needed for some documents. We'll let you know if any apply to you.",
  },
]

export default function PricingPage() {
  const withSpouse = priceAed("yes")

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge="Pricing"
          title="Pricing"
          description={`One fixed fee of ${PRICE_AED} AED per application, or ${withSpouse} AED when your spouse travels with you. Embassy fees and travel insurance are paid separately.`}
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* What the fee covers */}
            <div className="flex flex-col gap-8 rounded-3xl border border-border/70 bg-card p-6 sm:p-10">
              <div className="flex flex-col gap-2">
                <h2 className="panel-title text-muted-foreground">EZvisa service fee</h2>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-5xl font-semibold tracking-tight tabular-nums text-foreground">{PRICE_AED} AED</span>
                  <span className="text-sm text-muted-foreground">per application</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {withSpouse} AED for you and your spouse when you travel together.
                </p>
              </div>

              <ul className="flex flex-col gap-3.5 border-t border-border/70 pt-8">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Link
                  href="/apply"
                  className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start your application
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
                </Link>
                <p className="text-sm text-muted-foreground">Your file is ready 1–2 days after you upload your documents.</p>
              </div>
            </div>

            {/* What is paid elsewhere */}
            <div className="flex flex-col gap-6 rounded-3xl bg-secondary/60 p-6 sm:p-10">
              <div className="flex flex-col gap-2">
                <h2 className="panel-title text-foreground">Paid separately</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">These costs are paid to the embassy, the visa centre or the insurer.</p>
              </div>
              <ul className="flex flex-col">
                {SEPARATE.map((item) => (
                  <li key={item.title} className="flex items-start gap-3 border-t border-border/70 py-4 first:border-0 first:pt-0">
                    <Minus className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{item.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Refunds: exactly what the refund policy covers */}
        <section className="border-t border-border/70 py-20 md:py-24">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">Refunds</h2>
              <Link href="/refund-policy" className="text-sm font-medium text-primary hover:underline">
                Read the full refund policy
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h3 className="panel-title text-foreground">Full refund</h3>
                <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    You cancel before we start reviewing your documents.
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    We can&apos;t deliver your file because of an error on our side.
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    You were charged twice for the same application.
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="panel-title text-foreground">No refund</h3>
                <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    The embassy refuses your visa application.
                  </li>
                  <li className="flex items-start gap-3">
                    <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    You change your mind after we&apos;ve reviewed your documents.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <ContactSection />
      </div>
      <Footer />
    </>
  )
}
