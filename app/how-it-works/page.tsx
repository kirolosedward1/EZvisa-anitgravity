import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { HowItWorksContent } from "@/components/how-it-works-content"
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react"
import { WhatYouGetSection } from "@/components/what-you-get-section" // Import WhatYouGetSection
import { InnerHero } from "@/components/inner-hero"
import { LangText } from "@/components/lang-text"
import { PhotoHeroOverlay } from "@/components/photo-hero-overlay"

export const metadata: Metadata = {
  title: "How It Works - 4-Step Schengen Visa Application Process",
  description:
    "Learn how EZvisa prepares your Schengen visa file. Simple 4-step process. We prepare your application in 1–2 days. The embassy's decision takes longer.",
  keywords: [
    "visa application process",
    "how to apply visa",
    "Schengen visa steps",
    "visa application guide",
    "Europe visa process",
  ],
  alternates: {
    canonical: "https://www.ezvisa.net/how-it-works",
  },
  openGraph: {
    title: "How It Works - 4-Step Visa Application Process",
    description: "We prepare your application in 1–2 days. The embassy's decision takes longer.",
    url: "https://www.ezvisa.net/how-it-works",
    type: "website",
  },
}

export default function HowItWorksPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-[#F7F8FA]">
        <InnerHero
          badge={<LangText en="Process" ar="الخطوات" />}
          title={
            <LangText
              en={<>How It <span className="text-[#0436DC]">Works</span></>}
              ar={<>كيف <span className="text-[#0436DC]">تعمل</span></>}
            />
          }
          description="Get your European visa prepared in 4 simple steps. Fast, easy, and hassle-free."
          gradientType="sunset"
        />

        <HowItWorksContent />

        {/* What Happens Next */}
        <section className="photo-hero relative py-24 md:py-32 border-t border-border/80 overflow-hidden">
          {/* Background Image with Frosted Overlay */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <img 
              src="/images/eiffel-tower-view.jpg" 
              alt="Eiffel Tower Background" 
              className="w-full h-full object-cover object-center" 
            />
            {/* White overlay to ensure text readability */}
            <PhotoHeroOverlay />
          </div>
          
          <div className="container mx-auto px-6 max-w-6xl relative z-10">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
              <div className="type-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-[#E3E7EF] bg-[#F7F8FA] px-3 py-1.5 text-[#0436DC]">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Post-submission
              </div>
              <h2 className="hero-copy text-balance text-white">
                What happens<br/>after submission?
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary/5 text-primary border border-primary/10 flex items-center justify-center mb-6">
                    <Mail className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-3">Instant Confirmation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Receive immediate email confirmation with your application reference number and payment receipt.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary/5 text-primary border border-primary/10 flex items-center justify-center mb-6">
                    <RefreshCw className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-3">Real-time Tracking</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Monitor your application progress 24/7 with live status updates through your dashboard.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-card border border-border/80 rounded-3xl p-8 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="w-12 h-12 rounded-full bg-primary/5 text-primary border border-primary/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-3">Ready to Travel</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get instant notification when your complete visa package is approved and ready.
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
