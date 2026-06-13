import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { HowItWorksContent } from "@/components/how-it-works-content"
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react"
import { WhatYouGetSection } from "@/components/what-you-get-section" // Import WhatYouGetSection
import { InnerHero } from "@/components/inner-hero"

export const metadata: Metadata = {
  title: "How It Works - 4-Step Schengen Visa Application Process | EZvisa",
  description:
    "Learn how to apply for your Schengen visa with EZvisa. Simple 4-step process: Fill form, Upload documents, Review & payment, Get visa-ready file. 24-48 hour turnaround time.",
  keywords: [
    "visa application process",
    "how to apply visa",
    "Schengen visa steps",
    "visa application guide",
    "Europe visa process",
  ],
  alternates: {
    canonical: "https://ezvisa.net/how-it-works",
  },
  openGraph: {
    title: "How It Works - 4-Step Visa Application Process",
    description: "Simple 4-step process to get your Schengen visa approved. 24-48 hour turnaround.",
    url: "https://ezvisa.net/how-it-works",
    type: "website",
  },
}

export default function HowItWorksPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-gray-50">
        <InnerHero
          badge="Process"
          title={
            <>
              How It <span className="text-primary bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary/80">Works</span>
            </>
          }
          description="Get your European visa prepared in 4 simple steps. Fast, easy, and hassle-free."
          gradientType="sunset"
        />

        <HowItWorksContent />

        {/* What Happens Next */}
        <section className="relative py-24 md:py-32 bg-secondary/5 border-t border-border/80 overflow-hidden">
          {/* France Background Overlay with smooth blend */}
          <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none">
            <img 
              src="/images/eiffel-tower-view.jpg" 
              alt="Eiffel Tower" 
              className="w-full h-full object-cover object-center" 
            />
          </div>
          {/* Subtle vignette layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
          
          <div className="container mx-auto px-6 max-w-6xl relative z-10">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Post-submission
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
                What happens after submission?
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center mb-6">
                    <Mail className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-3">Instant Confirmation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Receive immediate email confirmation with your application reference number and payment receipt.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center mb-6">
                    <RefreshCw className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-3">Real-time Tracking</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Monitor your application progress 24/7 with live status updates through your dashboard.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-card border border-border/80 rounded-2xl p-8 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center mb-6">
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
