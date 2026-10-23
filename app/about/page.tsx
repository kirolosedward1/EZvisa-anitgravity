import type { Metadata } from "next"
import { CheckCircle, Users, Globe, Award } from "lucide-react"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"

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
    canonical: "https://www.ezvisa.net/about",
  },
  openGraph: {
    title: "About EZvisa - Expert Schengen Visa Service",
    description: "Your trusted partner for European visa applications with 98% approval rate.",
    url: "https://www.ezvisa.net/about",
    type: "website",
  },
}

export default function AboutPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen relative overflow-hidden">
        {/* Decorative dot matrix background */}
        <div
          className="absolute inset-0 opacity-[0.1] pointer-events-none"
          style={{
            backgroundImage: "none",
            backgroundSize: "32px 32px",
            maskImage: "none",
            WebkitMaskImage: "none",
          }}
        />

        <InnerHero
          badge={<LangText en="About Us" ar="من نحن" />}
          title={
            <LangText
              en={<>Your trusted partner for <span className="text-primary">Schengen visas</span></>}
              ar={<>شريكك الموثوق لـ <span className="text-primary">تأشيرات شنغن</span></>}
            />
          }
          description={<Msg id="about.description" />}
          gradientType="ocean"
        />

        {/* Main Content */}
        <section className="relative container mx-auto px-6 py-12 lg:py-16 max-w-4xl z-10">
          <div className="space-y-12">
            
            {/* Mission */}
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-primary"><Msg id="about.missionTitle" /></h2>
              <p className="text-muted-foreground leading-relaxed">
                <Msg id="about.missionBody" />
              </p>
            </div>

            {/* Why Choose Us */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-primary"><Msg id="about.whyTitle" /></h2>
              <div className="grid md:grid-cols-2 gap-6">
                
                <div className="bg-card/75 border border-border/80 shadow-md hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 rounded-2xl p-6 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2"><Msg id="about.expertTitle" /></h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <Msg id="about.expertBody" />
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
                      <h3 className="font-semibold text-foreground mb-2"><Msg id="about.supportTitle" /></h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <Msg id="about.supportBody" />
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
                      <h3 className="font-semibold text-foreground mb-2"><Msg id="about.countriesTitle" /></h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <Msg id="about.countriesBody" />
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
                      <h3 className="font-semibold text-foreground mb-2"><Msg id="about.pricingTitle" /></h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <Msg id="about.pricingBody" />
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Our Story */}
            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-primary"><Msg id="about.storyTitle" /></h2>
              <p className="text-muted-foreground leading-relaxed">
                <Msg id="about.story1" />
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <Msg id="about.story2" />
              </p>
            </div>

            {/* Stats */}
            <div className="bg-card border border-border/80 shadow-xl rounded-3xl p-8 shadow-primary/[0.02]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-semibold text-primary mb-1">5,000+</div>
                  <div className="text-sm font-semibold text-muted-foreground"><Msg id="about.statVisas" /></div>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-primary mb-1">29</div>
                  <div className="text-sm font-semibold text-muted-foreground"><Msg id="about.statCountries" /></div>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-primary mb-1">98%</div>
                  <div className="text-sm font-semibold text-muted-foreground"><Msg id="about.statRate" /></div>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-primary mb-1">24/7</div>
                  <div className="text-sm font-semibold text-muted-foreground"><Msg id="about.statSupport" /></div>
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
