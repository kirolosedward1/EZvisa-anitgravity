"use client"

// Return page after Ziina. Next step is the same as in the app: continue the application (passport number +
// employment), then upload documents. Reference = EZ- + first 8 hex of the application id.
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Mail, FileText, Clock, Headphones, Upload, Briefcase } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { useEffect, useState, Suspense } from "react"
import { getPaymentConfirmationWhatsAppUrl } from "@/lib/whatsapp"
import { referenceOf } from "@/lib/shared/wizard-contract"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>("")
  const [appId, setAppId] = useState<string>("")
  const [destination, setDestination] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setToken(searchParams.get("token") || sessionStorage.getItem("lastCompletedToken") || "")
    setAppId(searchParams.get("appId") || sessionStorage.getItem("lastCompletedAppId") || "")
    setDestination(searchParams.get("dest") || sessionStorage.getItem("lastCompletedDest") || "")
    sessionStorage.removeItem("pendingApplication")
    localStorage.removeItem("visa-wizard-form")
    setIsLoading(false)
  }, [searchParams])

  const reference = appId || token ? referenceOf(appId || token) : ""
  const continueHref = token ? `/track/${token}/continue` : appId ? `/dashboard/continue?id=${appId}` : "/dashboard"
  const uploadHref = token ? `/track/${token}/upload` : appId ? `/dashboard/upload?id=${appId}` : "/dashboard"
  const caseHref = token ? `/track/${token}` : appId ? `/dashboard?id=${appId}` : "/dashboard"

  const steps = [
    { icon: Mail, text: "Confirmation email sent to your inbox" },
    { icon: Briefcase, text: "You add your passport number and employment details (2 minutes)" },
    { icon: Upload, text: "You upload your passport, photo, bank statement and employment proof" },
    { icon: Clock, text: "A specialist reviews your file within 24 hours" },
    { icon: FileText, text: "Custom cover letter, flight and hotel vouchers prepared" },
    { icon: Headphones, text: "Direct WhatsApp concierge support throughout" },
  ]

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container max-w-xl mx-auto text-center">
          <div className="mb-8">
            {isLoading ? (
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in duration-300">
                <Check className="w-12 h-12 text-primary-foreground stroke-[3]" />
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">Payment Confirmed</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Your Schengen visa application is now with our document preparation desk. Two short steps remain on your side.
          </p>

          {reference && (
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-sm font-semibold">
              <span className="text-muted-foreground font-sans text-xs">Case reference:</span>
              <span>{reference}</span>
            </div>
          )}

          <div className="mb-6 bg-card border-2 border-primary/30 rounded-3xl p-6 md:p-8 text-left shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">1</span>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground">Continue your application</h2>
                <p className="text-xs text-muted-foreground">Passport number and employment details. Takes about two minutes.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl text-sm font-semibold">
                <Link href={continueHref}>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Continue application
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl text-emerald-700 border-emerald-500/40 hover:bg-emerald-500/10 text-sm font-semibold">
                <a href={getPaymentConfirmationWhatsAppUrl(appId || token || "EZVISA", destination)} target="_blank" rel="noopener noreferrer">
                  Prefer WhatsApp? Message us
                </a>
              </Button>
            </div>
          </div>

          <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 md:p-8 text-left">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">2</span>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground">Upload your supporting documents</h2>
                <p className="text-xs text-muted-foreground">Passport bio page, photo, bank statement and employment proof. PDF, JPG or PNG, up to 5MB each.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-xl text-sm font-semibold border-amber-500/40 text-amber-800 dark:text-amber-400 hover:bg-amber-500/10">
              <Link href={uploadHref}>
                <Upload className="w-4 h-4 mr-2" />
                Open the upload desk
              </Link>
            </Button>
          </div>

          <div className="mb-8 bg-card border border-border/80 shadow-sm rounded-3xl p-6 text-left">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Track your case anytime</h3>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                  Follow milestones, upload more files and download your finished dossier here or in the EZvisa app, with the same email.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl text-xs">
                  <Link href={caseHref}>Case details</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 sm:flex-none rounded-xl text-xs">
                  <Link href="/dashboard">Customer dashboard</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-8 bg-card border border-border/80 shadow-sm rounded-3xl p-6 md:p-8 max-w-md mx-auto text-left">
            <h2 className="text-xs font-semibold text-primary uppercase tracking-wider mb-6">What happens next</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground text-sm font-medium">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <Button asChild variant="ghost" size="lg" className="h-12 px-6 rounded-full text-sm font-medium">
            <Link href="/">Return to Home</Link>
          </Button>
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
