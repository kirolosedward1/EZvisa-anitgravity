import type { Metadata } from "next"
import { headers } from "next/headers"
import { LocaleLink } from "@/components/locale-link"
import { formatAedLabel, type DisplayLocale } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { Msg } from "@/components/msg"
import type { MessageKey } from "@/messages"
import { Button } from "@/components/ui/button"
import { Check, X, Shield, Rocket, Info } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { LangText } from "@/components/lang-text"

export const metadata: Metadata = {
  title: "Schengen Visa Pricing - 249 AED All-Inclusive",
  description:
    "Simple, transparent Schengen visa application pricing. 249 AED flat rate includes AI-powered document review, itinerary planning, cover letter, hotel booking, and expert assistance. No hidden fees.",
  keywords: [
    "Schengen visa cost",
    "visa application price",
    "visa service fees",
    "Europe visa cost UAE",
    "tourist visa price",
    "visa application charges",
  ],
  alternates: {
    canonical: "https://www.ezvisa.net/pricing",
  },
  openGraph: {
    title: "Schengen Visa Pricing - 249 AED All-Inclusive",
    description: "Transparent pricing for Schengen visa applications. All-inclusive service from 249 AED.",
    url: "https://www.ezvisa.net/pricing",
    type: "website",
  },
}

export default async function PricingPage() {
  const locale: DisplayLocale = (await headers()).get("x-ez-locale") === "ar" ? "ar" : "en"
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background pb-12">
        <InnerHero
          badge={<LangText en="Pricing Plan" ar="الأسعار" />}
          title={
            <LangText
              en={<>All-Inclusive <span className="text-[#0436DC]">Visa Service</span></>}
              ar={<>خدمة <span className="text-[#0436DC]">تأشيرة شاملة</span></>}
            />
          }
          description={<Msg id="pricing.description" />}
          gradientType="default"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-[#0436DC] px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white">
              <Msg id="pricing.popular" />
            </div>
            <div className="flex items-baseline justify-center gap-4 mt-2">
              <span className="text-5xl lg:text-6xl font-semibold text-foreground">{formatAedLabel(PRICE_AED, locale)}</span>
            </div>
          </div>
        </InnerHero>

        {/* Pricing Section */}
        <section className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">

          {/* Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 max-w-5xl mx-auto mb-16">
            {/* What's Included */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Check className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-2xl font-semibold text-[#0A0F1F]"><Msg id="pricing.includedTitle" /></h3>
              </div>
              <div className="space-y-5">
                {([
                  "pricing.included1",
                  "pricing.included2",
                  "pricing.included3",
                  "pricing.included4",
                  "pricing.included5",
                  "pricing.included6",
                  "pricing.included7",
                  "pricing.included8",
                ] as MessageKey[]).map((item, index) => (
                  <div key={index} className="flex items-start gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-green-200 transition-colors">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 text-base leading-relaxed"><Msg id={item} /></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Not Included */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <X className="w-7 h-7 text-gray-600" />
                </div>
                <h3 className="text-2xl font-semibold text-[#0A0F1F]"><Msg id="pricing.excludedTitle" /></h3>
              </div>
              <div className="space-y-5">
                {([
                  "pricing.excluded1",
                  "pricing.excluded2",
                  "pricing.excluded3",
                  "pricing.excluded4",
                ] as MessageKey[]).map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-600 text-base leading-relaxed"><Msg id={item} /></span>
                  </div>
                ))}
              </div>

              {/* Info Card */}
              <div className="mt-10 border border-primary/15 rounded-2xl p-6 bg-secondary">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2"><Msg id="pricing.noteTitle" /></p>
                    <p className="text-gray-700 leading-relaxed">
                      <Msg id="pricing.noteBody" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-2xl mx-auto text-center">
            <LocaleLink href="/apply" className="block mb-6">
              <Button size="lg" className="w-full text-xl h-16 shadow-xl hover:shadow-2xl transition-all">
                <Rocket className="w-5 h-5 mr-2" />
                <Msg id="pricing.start" />
              </Button>
            </LocaleLink>
            <p className="text-muted-foreground">
              <Msg id="pricing.social" />
            </p>
          </div>

          {/* Money Back Guarantee */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="border-2 border-emerald-200 rounded-3xl p-10 lg:p-12 bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-12 h-12 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl lg:text-3xl font-semibold mb-3 text-[#0A0F1F]"><Msg id="pricing.guaranteeTitle" /></h3>
                  <p className="text-base text-gray-700 leading-relaxed">
                    <Msg id="pricing.guaranteeBefore" />{" "}
                    <LocaleLink
                      href="/refund-policy"
                      className="text-primary font-semibold hover:underline inline-flex items-center"
                    >
                      <Msg id="pricing.guaranteeLink" />
                    </LocaleLink>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
