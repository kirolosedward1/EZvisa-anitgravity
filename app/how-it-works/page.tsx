import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { HowItWorksSimple } from "@/components/how-it-works-simple"
import { AfterPaymentTimeline } from "@/components/after-payment-timeline"
import { ServicesSection } from "@/components/services-section"
import { ContactSection } from "@/components/contact-section"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export const metadata: Metadata = {
  title: "How It Works: From Your First Answer to Your Visa Appointment",
  description:
    "How EZvisa prepares your Schengen visa file: answer a few questions, pay 249 AED, upload your documents, and get your application form, cover letter, itinerary and reservations in 1–2 days.",
  keywords: ["visa application process", "how to apply Schengen visa UAE", "Schengen visa steps", "Schengen visa appointment Dubai"],
  alternates: {
    canonical: "https://www.ezvisa.net/how-it-works",
  },
  openGraph: {
    title: "How EZvisa Works",
    description: "Answer a few questions, pay, upload your documents. Your file is ready in 1–2 days.",
    url: "https://www.ezvisa.net/how-it-works",
    type: "website",
  },
}

export default function HowItWorksPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge="How it works"
          title="You answer the questions. We prepare the file."
          description={`Starting takes about five minutes and ${PRICE_AED} AED. A visa specialist then prepares everything the visa centre asks for, and you take it to your appointment.`}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/apply"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start your application
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              See what it costs
            </Link>
          </div>
        </InnerHero>

        <HowItWorksSimple standalone />
        <AfterPaymentTimeline />
        <ServicesSection />
        <ContactSection />
      </div>
      <Footer />
    </>
  )
}
