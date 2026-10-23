import { destinations } from "@/lib/destinations"
import { SCHENGEN_META } from "@/lib/countries"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"
import { PreparationLine } from "@/components/ready-line"
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
  FileText,
  UserCheck,
  TicketCheck,
  Tag,
} from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
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
  const nameAr = SCHENGEN_META[name]?.ar || name
  const place = { name }
  const placeAr = { name: nameAr }
  const partnerCenter =
    slug === "greece" || slug === "france" || slug === "italy" || slug === "germany" || slug === "spain" || slug === "switzerland" || slug === "netherlands" || slug === "austria"

  const fastFacts = [
    { icon: Clock, label: "dest.factPrepLabel", value: "dest.factPrepValue", description: "dest.factPrepBody" },
    { icon: Calendar, label: "dest.factStayLabel", value: "dest.factStayValue", description: "dest.factStayBody" },
    { icon: MapPin, label: "dest.factWhereLabel", value: partnerCenter ? "dest.factWhereVfs" : "dest.factWhereCenter", description: "dest.factWhereBody" },
    { icon: Coins, label: "dest.factFeeLabel", value: "dest.factFeeValue", description: "dest.factFeeBody" },
    { icon: Tag, label: "dest.factPriceLabel", value: "dest.factPriceValue", description: "dest.factPriceBody" },
    { icon: ShieldCheck, label: "dest.factRefundLabel", value: "dest.factRefundValue", description: "dest.factRefundBody" },
  ] as const

  const howItWorksSteps = [
    { step: "01", icon: FileText, title: "dest.step1Title", description: "dest.step1Body" },
    { step: "02", icon: TicketCheck, title: "dest.step2Title", description: "dest.step2Body" },
    { step: "03", icon: UserCheck, title: "dest.step3Title", description: "dest.step3Body" },
    { step: "04", icon: ShieldCheck, title: "dest.step4Title", description: "dest.step4Body" },
  ] as const

  const comparisons = [
    { metric: "dest.row1Label", diy: "dest.row1Diy", ez: "dest.row1Ez" },
    { metric: "dest.row2Label", diy: "dest.row2Diy", ez: "dest.row2Ez" },
    { metric: "dest.row3Label", diy: "dest.row3Diy", ez: "dest.row3Ez" },
    { metric: "dest.row4Label", diy: "dest.row4Diy", ez: "dest.row4Ez" },
    { metric: "dest.row5Label", diy: "dest.row5Diy", ez: "dest.row5Ez" },
    { metric: "dest.row6Label", diy: "dest.row6Diy", ez: "dest.row6Ez" },
  ] as const

  const faqs = [
    ["dest.faq1q", "dest.faq1a"],
    ["dest.faq2q", "dest.faq2a"],
    ["dest.faq3q", "dest.faq3a"],
    ["dest.faq4q", "dest.faq4a"],
    ["dest.faq5q", "dest.faq5a"],
  ] as const

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      
      {/* 1. Hero Block */}
      <InnerHero
        badge={<LangText en="Apply from Dubai & Abu Dhabi" ar="قدّم من دبي وأبوظبي" />}
        title={
          <LangText
            en={<>Get your <span className="text-[#0436DC]">{destination.name}</span> Schengen Visa approved, easily.</>}
            ar={<>احصل على تأشيرة شنغن إلى <span className="text-[#0436DC]">{SCHENGEN_META[destination.name]?.ar || destination.name}</span> بسهولة.</>}
          />
        }
        description={<Msg id="dest.heroBody" values={place} valuesAr={placeAr} />}
        backgroundImage={destination.image}
      >
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
            <LocaleLink
              href={`/apply?to=${encodeURIComponent(destination.name)}`}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white text-base font-semibold rounded-2xl hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Msg id="dest.startWizard" />
              <ArrowRight className="h-5 w-5" />
            </LocaleLink>
            <LocaleLink
              href={destination.documentPath}
              className="w-full sm:w-auto px-8 py-4 bg-white text-[#0A0F1F] border border-[#E3E7EF] text-base font-semibold rounded-2xl shadow-[0_8px_24px_rgba(10,15,31,0.08)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Msg id="dest.checkDocs" />
            </LocaleLink>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white/90">
            <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
            <span><Msg id="dest.processed" /></span>
          </div>
        </div>
      </InnerHero>

      {/* 2. Fast Facts Grid Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              <Msg id="dest.infoBadge" />
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4">
              <Msg id="dest.factsTitle" values={place} valuesAr={placeAr} />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              <Msg id="dest.factsBody" />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fastFacts.map((fact, idx) => (
              <div 
                key={idx}
                className="border border-border bg-card rounded-2xl p-4 hover:shadow-md transition-shadow flex gap-3.5 items-start"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <fact.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold text-[#5B6475] uppercase tracking-wider">
                    <Msg id={fact.label} />
                  </h3>
                  <div className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
                    <Msg id={fact.value} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    <Msg id={fact.description} />
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
            sizes="240px"
            className="object-contain"
          />
        </div>
        <div className="absolute -top-8 right-[4%] w-[280px] h-[190px] pointer-events-none hidden md:block select-none rotate-[12deg] opacity-[0.18] dark:opacity-[0.12] dark:brightness-0 dark:invert">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            sizes="280px"
            className="object-contain"
          />
        </div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              <Msg id="dest.processBadge" />
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4">
              <Msg id="dest.processTitle" values={place} valuesAr={placeAr} />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              <Msg id="dest.processBody" />
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
                <div className="text-[10px] font-semibold text-primary tracking-widest uppercase mb-1">
                  <Msg id="dest.stepLabel" values={{ n: step.step }} />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  <Msg id={step.title} values={place} valuesAr={placeAr} />
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                  <Msg id={step.description} values={place} valuesAr={placeAr} />
                </p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-14">
            <LocaleLink 
              href={`/apply?to=${encodeURIComponent(destination.name)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-primary/95 transition-all text-xs"
            >
              <Msg id="dest.startNow" values={place} valuesAr={placeAr} />
              <ArrowRight className="w-4 h-4" />
            </LocaleLink>
          </div>
        </div>
      </section>

      {/* 4. DIY vs. EZvisa Custom Comparison Table */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              <Msg id="dest.compareBadge" />
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4 flex items-center justify-center gap-2 flex-wrap">
              <span><Msg id="dest.compareDiy" /></span>
              <span className="relative inline-block w-36 h-11 align-middle">
                <Image
                  src="/images/logo-main.png"
                  alt="EZvisa"
                  fill
                  className="object-contain"
                />
              </span>
              <span><Msg id="dest.compareApp" /></span>
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              <Msg id="dest.compareBody" />
            </p>
          </div>

          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <div className="border border-border rounded-3xl overflow-hidden shadow-xs bg-card min-w-[600px] md:min-w-full">
              {/* Table Header */}
              <div className="grid grid-cols-3 bg-muted/40 border-b border-border py-4 px-6 font-semibold text-xs uppercase tracking-wider text-muted-foreground items-center">
              <div><Msg id="dest.colFeature" /></div>
              <div><Msg id="dest.colDiy" /></div>
              <div className="flex items-center gap-1 text-primary font-semibold">
                <span><Msg id="dest.colThe" /></span>
                <span className="relative inline-block w-20 h-6 align-middle">
                  <Image
                    src="/images/logo-main.png"
                    alt="EZvisa"
                    fill
                    className="object-contain"
                  />
                </span>
                <span><Msg id="dest.colWay" /></span>
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border/60">
              {comparisons.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 py-4.5 px-6 items-center text-xs sm:text-sm">
                  <div className="font-semibold text-foreground"><Msg id={item.metric} /></div>
                  <div className="text-muted-foreground flex items-center gap-2 pr-4">
                    <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span><Msg id={item.diy} /></span>
                  </div>
                  <div className="text-foreground font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span><Msg id={item.ez} /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* 5. Custom FAQ Accordion Section */}
      <section className="py-24 bg-muted/10 border-t border-border/30">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              <Msg id="dest.faqBadge" />
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-4">
              <Msg id="dest.faqTitle" />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              <Msg id="dest.faqBody" values={place} valuesAr={placeAr} />
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map(([question, answer], idx) => (
              <AccordionItem 
                key={question} 
                value={`faq-${idx}`} 
                className="border border-border bg-card rounded-2xl px-6 py-1 shadow-xs transition-shadow hover:shadow-sm"
              >
                <AccordionTrigger className="text-sm sm:text-base font-semibold text-foreground hover:no-underline py-4">
                  <Msg id={question} values={place} valuesAr={placeAr} />
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                  <Msg id={answer} values={place} valuesAr={placeAr} />
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/5 rounded-full pointer-events-none" />
        
        <div className="relative container mx-auto px-6 max-w-4xl z-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <Msg id="dest.ctaTitle" values={place} valuesAr={placeAr} />
          </h2>
          <p className="mt-4 text-blue-100/90 text-sm sm:text-base max-w-xl mx-auto">
            <PreparationLine /> <Msg id="dest.ctaSecure" />
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <LocaleLink
              href={`/apply?to=${encodeURIComponent(destination.name)}`}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-primary text-sm font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Msg id="dest.startWizard" />
              <ArrowRight className="h-4.5 w-4.5" />
            </LocaleLink>
            <LocaleLink
              href={destination.documentPath}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary-foreground/10 text-white border border-white/20 text-sm font-semibold rounded-xl hover:bg-primary-foreground/15 transition-all flex items-center justify-center"
            >
              <Msg id="dest.ctaDocs" />
            </LocaleLink>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
