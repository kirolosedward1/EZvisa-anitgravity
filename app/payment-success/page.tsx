"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Mail, FileText, Clock, Headphones } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { useEffect, useState, Suspense } from "react"

function PaymentSuccessContent() {
  const [emailSent, setEmailSent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sendSuccessEmail = async () => {
      const pendingApplicationData = sessionStorage.getItem("pendingApplication")
      
      if (pendingApplicationData) {
        try {
          const applicationData = JSON.parse(pendingApplicationData)
          const { getPaymentSuccessEmail } = await import("@/lib/email-templates")
          
          const emailData = {
            firstName: applicationData.firstName,
            lastName: applicationData.lastName,
            email: applicationData.email,
            phone: applicationData.phone || "",
            nationality: applicationData.nationality,
            destination: applicationData.destination,
            travelStartDate: applicationData.travelStartDate,
            travelEndDate: applicationData.travelEndDate,
            hasDocuments: !!(applicationData.passportCopy || applicationData.residencyCopy || applicationData.photo),
          }

          const successEmail = getPaymentSuccessEmail(
            emailData,
            applicationData.paymentAmount,
            applicationData.currencySymbol
          )

          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: applicationData.email,
              subject: successEmail.subject,
              html: successEmail.html,
              type: "payment_success",
            }),
          })

          if (response.ok) {
            setEmailSent(true)
            sessionStorage.removeItem("pendingApplication")
            // Clean up wizard form data from localStorage
            localStorage.removeItem("visa-wizard-form")
          }
        } catch (error) {
          console.error("Error sending payment success email:", error)
        }
      }
      
      setIsLoading(false)
    }

    sendSuccessEmail()
  }, [])

  const steps = [
    { icon: Mail, text: "Confirmation email sent to your inbox" },
    { icon: Clock, text: "Application reviewed within 24 hours" },
    { icon: FileText, text: "Documents prepared and sent to you" },
    { icon: Headphones, text: "24/7 support until visa approval" },
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
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Payment Successful
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Your visa application has been received and is now being processed by our team.
          </p>

          {/* Email Confirmation */}
          {emailSent && (
            <div className="inline-flex items-center gap-2 text-emerald-600 mb-10">
              <Mail className="w-5 h-5" />
              <span className="text-sm font-medium">Confirmation email sent</span>
            </div>
          )}

          {/* What Happens Next */}
          <div className="mb-12">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              What happens next
            </h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button asChild size="lg" className="px-8">
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
