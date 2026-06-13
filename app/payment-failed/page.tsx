"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X, RefreshCw, CreditCard, Wifi, Ban, AlertCircle, Mail, MessageCircle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function PaymentFailedPage() {
  const router = useRouter()
  const [canRetry, setCanRetry] = useState(false)

  useEffect(() => {
    const pendingData = sessionStorage.getItem("pendingApplication")
    setCanRetry(!!pendingData)
  }, [])

  const handleRetry = () => {
    router.push("/apply?step=payment&retry=true")
  }

  const reasons = [
    { icon: CreditCard, text: "Insufficient funds" },
    { icon: Ban, text: "Card declined by bank" },
    { icon: AlertCircle, text: "Payment cancelled" },
    { icon: Wifi, text: "Network connection issue" },
  ]

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container max-w-xl mx-auto text-center">
          {/* Failed Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-12 h-12 text-white stroke-[3]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Payment Failed
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
            Your payment could not be processed. Don't worry, no charges were made.
          </p>

          {/* Possible Reasons */}
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Possible reasons
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {reasons.map((reason, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <reason.icon className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">{reason.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="mb-12">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {canRetry ? "Your application details have been saved." : "You can retry your payment or start a new application."}
              </p>
              <Button 
                onClick={handleRetry}
                size="lg"
                className="gap-2 px-8 w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Payment
              </Button>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Need help?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Email */}
              <a 
                href="mailto:hello@ezvisa.net" 
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                hello@ezvisa.net
              </a>
              
              {/* WhatsApp */}
              <a 
                href="https://wa.me/971547109533?text=Hi%2C%20I%20need%20help%20with%20my%20payment%20that%20failed.%20Can%20you%20assist%20me%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-green-600 hover:underline font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
