import type { Metadata } from "next"
import { Mail, Phone, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { ContactForm } from "@/components/contact-form"

export const metadata: Metadata = {
  title: "Contact EZvisa - 24/7 Schengen Visa Support | WhatsApp & Email",
  description:
    "Contact EZvisa support team for Schengen visa questions. Reach us via WhatsApp (+971 54 710 9533), email, or contact form. Fast response, expert guidance available 24/7.",
  keywords: ["contact visa service", "visa support", "visa help", "EZvisa contact", "visa consultation"],
  alternates: {
    canonical: "https://ezvisa.net/contact",
  },
  openGraph: {
    title: "Contact EZvisa - 24/7 Visa Support",
    description: "Get expert help with your Schengen visa application. WhatsApp & email support available 24/7.",
    url: "https://ezvisa.net/contact",
    type: "website",
  },
}

export default function ContactPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background pb-12 relative overflow-hidden">
        
        <InnerHero
          badge="Contact Us"
          title={
            <>
              Get in <span className="text-primary bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary/80">Touch</span>
            </>
          }
          description="Have questions about your visa application? Our team of experts is available 24/7."
          gradientType="default"
        />

        {/* Main Content */}
        <section className="relative container mx-auto px-6 py-12 lg:py-16 max-w-6xl z-10">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start z-10">
            
            {/* Left Column: Info & FAQs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="text-left">
                <h2 className="text-2xl font-bold text-primary mb-3">Support Channels</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium">
                  Choose the most convenient way to reach us. Our team responds instantly to WhatsApp queries.
                </p>
              </div>

              {/* WhatsApp Card */}
              <a
                href="https://wa.me/971547109533"
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-card border border-border/80 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-emerald-500/30 hover:-translate-y-1 rounded-2xl p-6 flex items-start gap-4 transition-all duration-300 w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <svg
                    className="w-6 h-6 text-emerald-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">WhatsApp Support</h3>
                  <span className="text-primary hover:underline font-semibold text-sm">
                    +971 54 710 9533
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-1 font-medium">Average reply time: &lt; 5 minutes</span>
                </div>
              </a>

              {/* Email Card */}
              <a
                href="mailto:info@ezvisa.net"
                className="group block bg-card border border-border/80 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 rounded-2xl p-6 flex items-start gap-4 transition-all duration-300 w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors text-base">Email Us</h3>
                  <span className="text-primary hover:underline font-semibold text-sm">
                    info@ezvisa.net
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-1 font-medium">Average response time: &lt; 2 hours</span>
                </div>
              </a>

              {/* Phone Card */}
              <a
                href="tel:+971547109533"
                className="group block bg-card border border-border/80 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 rounded-2xl p-6 flex items-start gap-4 transition-all duration-300 w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors text-base">Phone Call</h3>
                  <span className="text-primary hover:underline font-semibold text-sm">
                    +971 54 710 9533
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-1 font-medium">Direct line (9 AM - 6 PM)</span>
                </div>
              </a>

              {/* FAQ Quick Link */}
              <div className="bg-card border border-border/80 shadow-sm rounded-2xl p-6 text-left">
                <h3 className="font-bold text-primary mb-2 text-base">Looking for quick answers?</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed font-medium">
                  Check out our FAQ section for instant answers to common visa application questions.
                </p>
                <a href="/#faq">
                  <Button variant="outline" size="sm" className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 hover:text-primary cursor-pointer">
                    View FAQ
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7 bg-card border border-border/80 rounded-3xl p-6 md:p-10 shadow-lg text-left relative overflow-hidden">
              <ContactForm />
            </div>

          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
