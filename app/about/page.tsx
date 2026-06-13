import type { Metadata } from "next"
import { CheckCircle, Users, Globe, Award } from "lucide-react"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"

export const metadata: Metadata = {
  title: "About EZvisa - Expert Schengen Visa Service | 98% Approval Rate",
  description:
    "Learn about EZvisa, your trusted Schengen visa application partner in UAE. AI-powered visa assistance with 98% success rate. Fast, reliable service for 29 European countries since 2020.",
  keywords: [
    "about EZvisa",
    "visa application company",
    "Schengen visa experts",
    "visa service UAE",
    "travel visa company",
  ],
  alternates: {
    canonical: "https://ezvisa.net/about",
  },
  openGraph: {
    title: "About EZvisa - Expert Schengen Visa Service",
    description: "Your trusted partner for European visa applications with 98% approval rate.",
    url: "https://ezvisa.net/about",
    type: "website",
  },
}

export default function AboutPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
        {/* Decorative dot matrix background */}
        <div
          className="absolute inset-0 opacity-[0.1] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 75%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 75%, transparent 100%)",
          }}
        />

        <InnerHero
          badge="About Us"
          title={
            <>
              Your trusted partner for <span className="text-primary bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary/80">Schengen visas</span>
            </>
          }
          description="At EZvisa, we combine technology and expertise to simplify your travel preparation so embassies say yes."
          gradientType="ocean"
        />

        {/* Main Content */}
        <section className="relative container mx-auto px-6 py-12 lg:py-16 max-w-4xl z-10">
          <div className="space-y-12">
            
            {/* Mission */}
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold mb-4 text-primary">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                At EZvisa, we believe that travel should be accessible to everyone. Our mission is to simplify the
                complex visa application process, making it easy, transparent, and stress-free for travelers from the
                UAE and beyond. We combine expert knowledge with modern technology to deliver exceptional visa services.
              </p>
            </div>

            {/* Why Choose Us */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-primary">Why Choose EZvisa?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                
                <div className="bg-card/75 border border-border/80 shadow-md hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">Expert Guidance</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Our team of visa experts has years of experience processing thousands of successful applications
                        across all European countries.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/75 border border-border/80 shadow-md hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">Dedicated Support</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Get personalized assistance throughout your application journey with our responsive support team
                        available via chat, email, and phone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/75 border border-border/80 shadow-md hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">All European Countries</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        We handle visa applications for all 29 Schengen countries plus the UK, covering your entire
                        European travel needs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/75 border border-border/80 shadow-md hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">Transparent Pricing</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        No hidden fees, no surprises. Our flat rate includes document review, application preparation,
                        and expert consultation.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Our Story */}
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-bold mb-4 text-primary">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed">
                Founded by experienced travel professionals who understand the challenges of visa applications, EZvisa
                was created to bridge the gap between travelers and their European dreams. We saw too many people
                struggling with confusing requirements, rejected applications, and endless paperwork.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Today, we're proud to serve thousands of satisfied customers, helping them explore Europe with
                confidence. Our success is measured by the smiles of travelers who've achieved their goals with our
                help.
              </p>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border/80 shadow-xl rounded-3xl p-8 backdrop-blur-sm shadow-primary/[0.02]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">5,000+</div>
                  <div className="text-sm font-semibold text-muted-foreground">Visas Processed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">29</div>
                  <div className="text-sm font-semibold text-muted-foreground">Countries Covered</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">98%</div>
                  <div className="text-sm font-semibold text-muted-foreground">Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                  <div className="text-sm font-semibold text-muted-foreground">Support Available</div>
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
