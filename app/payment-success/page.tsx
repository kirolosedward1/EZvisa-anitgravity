"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Mail, FileText, Clock, Headphones, ArrowRight, Upload } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { useEffect, useState, Suspense } from "react"
import { getPaymentConfirmationWhatsAppUrl } from "@/lib/whatsapp"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>("")
  const [destination, setDestination] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const urlToken = searchParams.get("token") || sessionStorage.getItem("lastCompletedToken") || ""
    const urlAppId = searchParams.get("appId") || sessionStorage.getItem("lastCompletedAppId") || ""
    const urlDest = searchParams.get("dest") || sessionStorage.getItem("lastCompletedDest") || ""
    
    setToken(urlToken || urlAppId)
    setDestination(urlDest)

    const cleanUpStorage = () => {
      sessionStorage.removeItem("pendingApplication")
      localStorage.removeItem("visa-wizard-form")
      setIsLoading(false)
    }

    cleanUpStorage()
  }, [searchParams])

  const steps = [
    { icon: Mail, text: "Confirmation email sent to your inbox" },
    { icon: Clock, text: "Application reviewed within 24 hours by a specialist" },
    { icon: FileText, text: "Custom cover letter, flight, and hotel vouchers prepared" },
    { icon: Headphones, text: "Direct WhatsApp concierge support throughout your journey" },
  ]

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container max-w-xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            {isLoading ? (
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in duration-300">
                <Check className="w-12 h-12 text-white stroke-[3]" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Payment Confirmed
          </h1>
          
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Your Schengen visa application package has been received and is now assigned to our document preparation desk.
          </p>

          {/* Case Reference Badge */}
          {token && (
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-sm font-semibold">
              <span className="text-muted-foreground font-sans text-xs">Tracking Reference:</span>
              <span>#EZ-{token.substring(0, 8).toUpperCase()}</span>
            </div>
          )}

          {/* Action Required: Upload Documents (Step 2 of 2) */}
          <div className="mb-8 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 md:p-8 text-left shadow-md relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                2
              </span>
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground">
                  Step 2: Upload Your Supporting Documents
                </h2>
                <p className="text-xs text-muted-foreground">
                  Provide your passport copy, bank statement, and employment proof to begin file preparation.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Our specialists review your documents within 24 hours to generate your tailored consular cover letter, confirmed flight/hotel vouchers, and complete appointment submission pack.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {token && (
                <Button asChild size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm text-sm font-semibold">
                  <Link href={`/track/${token}/upload`}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents Now
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm font-semibold">
                <a href={getPaymentConfirmationWhatsAppUrl(token || "EZVISA", destination)} target="_blank" rel="noopener noreferrer">
                  Send via WhatsApp Instead
                </a>
              </Button>
            </div>
          </div>

          {/* Customer Dashboard & Case Access */}
          <div className="mb-8 bg-card border border-border/80 shadow-sm rounded-3xl p-6 text-left">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Track Your Case &amp; Download Later</h3>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                  Access your customer portal anytime to track case milestones, upload additional files, and download your finalized dossier.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl text-xs">
                  <Link href={`/track/${token}`}>Case Details</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 sm:flex-none rounded-xl text-xs">
                  <Link href="/dashboard">Customer Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="mb-8 bg-card border border-border/80 shadow-sm rounded-3xl p-6 md:p-8 max-w-md mx-auto text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-6">
              What Happens Next
            </h2>
            <div className="space-y-4 relative z-10">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground text-sm font-medium">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-full text-sm font-medium">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
