import { destinations } from "@/lib/destinations"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { InnerHero } from "@/components/inner-hero"
import { CountryFacts } from "@/components/documents/country-facts"
import { DocumentSplit } from "@/components/documents/document-split"
import { AfterPaymentTimeline } from "@/components/after-payment-timeline"
import { ContactSection } from "@/components/contact-section"
import { getProviderForDestination } from "@/lib/visa-rules"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

// Generate static parameters for all Schengen destinations
export async function generateStaticParams() {
  return destinations.map((dest) => ({
    slug: dest.slug,
  }))
}

// Generate dynamic metadata for SEO optimization
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const destination = destinations.find((d) => d.slug === slug)
  
  if (!destination) {
    return {
      title: "Visa Destination",
    }
  }

  const title = `Apply for ${destination.name} Schengen Visa from UAE`
  const description = `Get your ${destination.name} visa file prepared from Dubai and Abu Dhabi. We prepare your application in 1–2 days. The embassy's decision takes longer.`

  return {
    title,
    description,
    keywords: [
      `apply ${destination.name} visa UAE`,
      `${destination.name} Schengen visa Dubai`,
      `${destination.name} visa requirements Dubai`,
      `Schengen visa documents ${destination.name}`,
      `VFS ${destination.name} appointment Dubai`,
      `EZvisa ${destination.name}`,
    ],
    alternates: {
      canonical: `https://www.ezvisa.net/destinations/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.ezvisa.net/destinations/${slug}`,
      type: "website",
      images: [
        {
          url: destination.image,
          width: 1200,
          height: 630,
          alt: `${destination.name} Schengen Visa UAE`,
        },
      ],
    },
  }
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const destination = destinations.find((d) => d.slug === slug)

  if (!destination) {
    notFound()
  }

  const name = destination.name
  const centre = getProviderForDestination(slug).replace(/ Center$/, "")
  const applyHref = `/apply?to=${encodeURIComponent(name)}`

  const faqs = [
    {
      question: `Do I need a visa for ${name} if I live in the UAE?`,
      answer: `It depends on your passport, not your residence. Holders of Indian, Pakistani, Egyptian, Jordanian, Filipino and many other passports need a Schengen visa for ${name}, even with a UAE residence visa or Golden Visa. UAE citizens don't need one for stays of up to 90 days.`,
    },
    {
      question: `Where do I apply for a ${name} visa in the UAE?`,
      answer: `${name} visa applications are handled by ${centre}, which has centres in Dubai and Abu Dhabi. You book your appointment on their website. At the appointment, you submit your file, pay the embassy fee and give your fingerprints.`,
    },
    {
      question: `Can I visit other countries on a ${name} visa?`,
      answer: `Yes. A Schengen visa from ${name} lets you travel across all 29 Schengen countries. ${name} has to be your main destination (where you spend the most nights), or your first entry if the nights are split evenly.`,
    },
    {
      question: `When should I apply for my ${name} visa?`,
      answer: "You can apply up to 6 months before you travel and no later than 15 days before. Appointments fill up quickly before the summer and winter holidays, so we recommend starting 6 to 8 weeks before you travel.",
    },
    {
      question: "What does EZvisa cost, and when is it refunded?",
      answer: `${PRICE_AED} AED per application, paid when you start. You get it back if you cancel before we start reviewing your documents, if we can't deliver because of an error on our side, or if you paid twice. A refusal by the ${name} embassy isn't refunded, and embassy and visa centre fees are paid to them, not us.`,
    },
  ]

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={name}
          title={`${name} Schengen visa from the UAE`}
          description={`We prepare your complete ${name} visa application: the application form, cover letter, itinerary, and flight and hotel reservations. Ready in 1–2 days for ${PRICE_AED} AED.`}
          backgroundImage={destination.image}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={applyHref}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply for {name}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              href={destination.documentPath}
              className="inline-flex h-12 items-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              See the documents
            </Link>
          </div>
        </InnerHero>

        <CountryFacts slug={slug} />

        <section className="py-20 md:py-24">
          <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2 className="text-balance text-foreground">Documents for your {name} application</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                You provide your personal documents, and we prepare the rest. We also check that all of them are consistent before
                you submit your application.
              </p>
            </div>
            <DocumentSplit country={name} />
          </div>
        </section>

        <AfterPaymentTimeline />

        <section className="py-20 md:py-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">Frequently asked questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full border-t border-border/70">
              {faqs.map((faq, idx) => (
                <AccordionItem key={faq.question} value={`faq-${idx}`} className="border-b border-border/70">
                  <AccordionTrigger className="py-5 text-start text-base font-medium text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <ContactSection />
      </div>
      <Footer />
    </>
  )
}
