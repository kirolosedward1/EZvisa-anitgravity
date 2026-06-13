import { destinations } from "@/lib/destinations"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { TestimonialsSection } from "@/components/testimonials-section"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { InnerHero } from "@/components/inner-hero"
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Coins, 
  ShieldCheck, 
  Check, 
  X, 
  ArrowRight, 
  Star, 
  Sparkles, 
  FileText, 
  UserCheck, 
  TicketCheck 
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
      title: "Visa Destination | EZvisa",
    }
  }

  const title = `Apply for ${destination.name} Schengen Visa from UAE | EZvisa`
  const description = `Get your ${destination.name} tourist visa from Dubai & Abu Dhabi easily. Complete visa file preparation including application forms, cover letter, flights, and hotel bookings in 24-48h.`

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

  // Common Schengen statistics / facts tailored for this destination
  const fastFacts = [
    {
      icon: Clock,
      label: "Processing Time",
      value: "10-15 working days",
      description: "Typical embassy turnaround time after biometrics appointment."
    },
    {
      icon: Calendar,
      label: "Stay Duration",
      value: "Up to 90 days",
      description: "Short-stay Schengen visa (Type C) valid in 180-day window."
    },
    {
      icon: MapPin,
      label: "Where to Apply",
      value: slug === "greece" || slug === "france" || slug === "italy" || slug === "germany" || slug === "spain" || slug === "switzerland" || slug === "netherlands" || slug === "austria"
        ? "VFS Global / TLScontact"
        : "VFS Global Center",
      description: "Embassy partner centers in Dubai or Abu Dhabi based on nationality."
    },
    {
      icon: Coins,
      label: "Embassy Visa Fee",
      value: "90 EUR (~360 AED)",
      description: "Standard visa fee paid directly at the application center. Under 6 years free."
    },
    {
      icon: Sparkles,
      label: "EZvisa Price",
      value: destination.price,
      description: "Flat fee for full application form, itineraries, hotel/flight reservations & support."
    },
    {
      icon: ShieldCheck,
      label: "Refund Guarantee",
      value: "100% Money-Back",
      description: "Full refund of service fee in case of visa rejection. Real confidence."
    }
  ]

  const howItWorksSteps = [
    {
      step: "01",
      icon: FileText,
      title: "Check Requirements",
      description: `View the precise checklist of document requirements for the ${destination.name} visa. Pre-fill basic info.`
    },
    {
      step: "02",
      icon: TicketCheck,
      title: "Simplified Application",
      description: "Complete our smart 5-minute online form. No confusing visa jargon or redundant fields."
    },
    {
      step: "03",
      icon: UserCheck,
      title: "Expert File Review",
      description: `Our agents draft your personal cover letter, day-by-day itinerary, flight/hotel bookings, and fully complete the official ${destination.name} form within 24-48 hours.`
    },
    {
      step: "04",
      icon: ShieldCheck,
      title: "Submit & Get Visa",
      description: "Print your completed package, attend the biometrics appointment we help organize, and wait for your visa stamp."
    }
  ]

  const comparisons = [
    { metric: "Form-Filling Complexity", diy: "Confusing PDF forms with 37+ fields", ez: "Simple 5-minute web wizard" },
    { metric: "Travel Itinerary Draft", diy: "Manual planning & layout matching", ez: "Expert-tailored day-by-day schedule" },
    { metric: "Flight & Hotel Reservations", diy: "Expensive refundable bookings required", ez: "Included (verifiable reservations)" },
    { metric: "Personal Cover Letter", diy: "Must write complex letter from scratch", ez: "Professional cover letter drafted for you" },
    { metric: "Dossier Verification", diy: "High risk of rejection due to form errors", ez: "Double-checked by active visa specialists" },
    { metric: "Price transparency", diy: "High agent commission (1,000+ AED)", ez: `Fixed transparent price (${destination.price})` }
  ]

  const faqs = [
    {
      question: `Do UAE residents need a visa to travel to ${destination.name}?`,
      answer: `Yes. Most non-UAE nationals residing in the UAE (e.g., Indian, Pakistani, Egyptian, Filipino citizens) require a Schengen Visa to enter ${destination.name}. UAE passport holders (citizens) are visa-exempt for short stays up to 90 days.`
    },
    {
      question: `Where is the ${destination.name} visa application center in the UAE?`,
      answer: `Depending on the center assigned to ${destination.name}, you will submit your physical documents and biometrics at VFS Global (located in Wafi Mall, Dubai or Shining Tower, Abu Dhabi) or TLScontact (for countries like France and Switzerland in Dubai/Abu Dhabi). Our team provides full instructions on where to go.`
    },
    {
      question: `Can I visit other European countries with a ${destination.name} visa?`,
      answer: `Yes. ${destination.name} is a member of the Schengen Zone. Once you obtain your visa, you can travel freely across all 29 Schengen member states, provided that ${destination.name} remains your main destination (where you spend the most nights) or your first point of entry.`
    },
    {
      question: `How far in advance should I apply for my ${destination.name} visa?`,
      answer: "Embassies allow applications to be submitted up to 6 months before your departure date. We highly recommend starting your application with EZvisa at least 4 to 6 weeks in advance to secure prime biometrics appointment slots and avoid seasonal processing delays."
    },
    {
      question: "What is your 100% money-back guarantee?",
      answer: `If your ${destination.name} visa application is rejected by the embassy, EZvisa will refund 100% of our service fee (${destination.price}). Please note that third-party embassy/VFS fees are non-refundable. We offer this because our expert review process ensures a near-perfect success rate.`
    }
  ]

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      
      {/* 1. Hero Block */}
      <InnerHero
        badge="Apply from Dubai & Abu Dhabi"
        title={
          <>
            Get your <span className="text-blue-300">{destination.name}</span> Schengen Visa approved, easily.
          </>
        }
        description={`Complete visa file preparation for ${destination.name}. We prepare your application forms, travel itinerary, flight reservations, and cover letter for a successful submission.`}
        backgroundImage={destination.image}
      >
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
            <Link
              href={`/apply?to=${encodeURIComponent(destination.name)}`}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white text-base font-bold rounded-2xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Start Application Wizard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href={destination.documentPath}
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/25 text-base font-semibold rounded-2xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Check Required Documents
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white/60">
            <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
            <span>Over 5,000+ Schengen visas processed successfully.</span>
          </div>
        </div>
      </InnerHero>

      {/* 2. Fast Facts Grid Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              Visa Information
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-4">
              {destination.name} Visa Fast Facts
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              Key application stats and requirements you need to know for your Schengen visa journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fastFacts.map((fact, idx) => (
              <div 
                key={idx}
                className="border border-border bg-card rounded-2xl p-6 hover:shadow-md transition-shadow flex gap-4"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <fact.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {fact.label}
                  </h3>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {fact.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {fact.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Timeline / Process Flow Section */}
      <section className="py-24 bg-muted/20 border-y border-border/30 relative overflow-hidden">
        {/* Background Flight Paths */}
        <div className="absolute -bottom-10 left-[2%] w-[240px] h-[160px] pointer-events-none hidden lg:block select-none -rotate-[15deg] opacity-[0.15] dark:opacity-[0.1] dark:brightness-0 dark:invert">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <div className="absolute -top-8 right-[4%] w-[280px] h-[190px] pointer-events-none hidden md:block select-none rotate-[12deg] opacity-[0.18] dark:opacity-[0.12] dark:brightness-0 dark:invert">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            className="object-contain"
            unoptimized
          />
        </div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              The Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-4">
              How to Apply for {destination.name} Visa
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              We make the application process simple, quick, and stress-free. Here is what to expect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Visual connector line for desktop */}
            <div className="hidden lg:block absolute top-[45px] left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-border/50 z-0" />
            
            {howItWorksSteps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary mb-6 shadow-sm hover:scale-105 transition-transform duration-300">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">
                  Step {step.step}
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-14">
            <Link 
              href={`/apply?to=${encodeURIComponent(destination.name)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-primary/95 transition-all text-xs"
            >
              Start {destination.name} Wizard Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. DIY vs. EZvisa Custom Comparison Table */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              Compare Options
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-4 flex items-center justify-center gap-2 flex-wrap">
              <span>DIY vs.</span>
              <span className="relative inline-block w-36 h-11 align-middle">
                <Image
                  src="/images/logo-main.png"
                  alt="EZvisa"
                  fill
                  className="object-contain"
                />
              </span>
              <span>Application</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              Why thousands of travelers use EZvisa instead of dealing with complex paperwork alone.
            </p>
          </div>

          <div className="border border-border rounded-3xl overflow-hidden shadow-xs bg-card">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-muted/40 border-b border-border py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground items-center">
              <div>Feature</div>
              <div>Applying on your own</div>
              <div className="flex items-center gap-1 text-primary font-bold">
                <span>THE</span>
                <span className="relative inline-block w-20 h-6 align-middle">
                  <Image
                    src="/images/logo-main.png"
                    alt="EZvisa"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>WAY</span>
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border/60">
              {comparisons.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 py-4.5 px-6 items-center text-xs sm:text-sm">
                  <div className="font-semibold text-foreground">{item.metric}</div>
                  <div className="text-muted-foreground flex items-center gap-2 pr-4">
                    <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{item.diy}</span>
                  </div>
                  <div className="text-foreground font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{item.ez}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Custom FAQ Accordion Section */}
      <section className="py-24 bg-muted/10 border-t border-border/30">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              Got questions about traveling to {destination.name}? Find answers to common inquiries here.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`} 
                className="border border-border bg-card rounded-2xl px-6 py-1 shadow-xs transition-shadow hover:shadow-sm"
              >
                <AccordionTrigger className="text-sm sm:text-base font-bold text-foreground hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 6. Reviews Section */}
      <TestimonialsSection />

      {/* 7. Bottom Final CTA Banner */}
      <section className="py-20 bg-primary text-primary-foreground text-center relative overflow-hidden">
        {/* Soft Decorative Background Circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative container mx-auto px-6 max-w-4xl z-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to secure your {destination.name} Visa?
          </h2>
          <p className="mt-4 text-blue-100/90 text-sm sm:text-base max-w-xl mx-auto">
            Get your completed form, itinerary, bookings, and cover letter in 24-48 hours. Secure and backed by our money-back guarantee.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/apply?to=${encodeURIComponent(destination.name)}`}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-primary text-sm font-bold rounded-xl hover:bg-blue-50 transition-all shadow-md flex items-center justify-center gap-2"
            >
              Start Application Wizard
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link
              href={destination.documentPath}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary-foreground/10 text-white border border-white/20 text-sm font-semibold rounded-xl hover:bg-primary-foreground/15 transition-all flex items-center justify-center"
            >
              View Document Checklists
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
