import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, X, Shield, Sparkles, Rocket } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"

export const metadata: Metadata = {
  title: "Schengen Visa Pricing - 249 AED All-Inclusive | EZvisa",
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

export default function PricingPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background pb-12">
        <InnerHero
          badge="Pricing Plan"
          title={
            <>
              All-Inclusive <span className="text-primary bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary/80">Visa Service</span>
            </>
          }
          description="One-time payment • No hidden fees • Full support"
          gradientType="default"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Most Popular Choice
            </div>
            <div className="flex items-baseline justify-center gap-4 mt-2">
              <span className="text-5xl lg:text-6xl font-black text-foreground">249 AED</span>
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
                <h3 className="text-2xl font-bold">What's Included</h3>
              </div>
              <div className="space-y-5">
                {[
                  "Complete document review and verification",
                  "Personalized visa requirements checklist",
                  "Application form preparation and filling",
                  "Expert consultation and guidance",
                  "Verifiable flight and hotel booking reservations",
                  "Customized consular cover letter",
                  "Day-by-day travel itinerary",
                  "24/7 customer support via WhatsApp and email",
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-green-200 transition-colors">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 text-base leading-relaxed">{item}</span>
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
                <h3 className="text-2xl font-bold">Not Included</h3>
              </div>
              <div className="space-y-5">
                {[
                  "Official embassy visa fee (€90 / ~360 AED paid at appointment)",
                  "Visa center service fee (VFS/TLS logistics charge ~110-150 AED)",
                  "Travel medical insurance policy (optional add-on)",
                  "Document attestation or translation fees",
                  "Optional courier passport delivery service",
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-gray-600 text-base leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>

              {/* Info Card */}
              <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💡</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Transparent Consular Fee Structure</p>
                    <p className="text-gray-700 leading-relaxed text-sm">
                      Our 249 AED fee covers complete document preparation, cover letters, and booking reservations. The official Schengen visa fee (~€90 / 360 AED) and center logistics fee are paid directly to the consular center (VFS/TLS/BLS) during your biometrics appointment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-2xl mx-auto text-center">
            <Link href="/apply" className="block mb-6">
              <Button size="lg" className="w-full text-xl h-16 shadow-xl hover:shadow-2xl transition-all">
                <Rocket className="w-5 h-5 mr-2" />
                Get Started Now
              </Button>
            </Link>
            <p className="text-muted-foreground">
              Join 5,000+ satisfied travelers who prepared their visa files with EZvisa
            </p>
          </div>

          {/* Money Back Guarantee */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 rounded-3xl p-10 lg:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-12 h-12 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl lg:text-3xl font-bold mb-3 text-gray-900">Service Satisfaction Guarantee</h3>
                  <p className="text-base text-gray-700 leading-relaxed">
                    If we cannot process your file due to an error on our part, or if you request a cancellation before document review begins, we provide a full refund in accordance with our terms.{" "}
                    <Link
                      href="/refund-policy"
                      className="text-primary font-semibold hover:underline inline-flex items-center"
                    >
                      Read our refund policy
                    </Link>
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
