"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, AlertCircle, Lock, ShieldCheck, FileText, ClipboardList } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { getDefaultCurrency, type CurrencyInfo } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/form-types"

interface PaymentStepProps {
  formData: FormData
  onBack: () => void
  isLoading?: boolean
  paymentError?: string | null
}

export function PaymentStep({ formData, onBack, isLoading, paymentError }: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currency, setCurrency] = useState<CurrencyInfo>(getDefaultCurrency())

  const router = useRouter()

  useEffect(() => {
    setCurrency(getDefaultCurrency())

    const handleStorageChange = () => {
      setCurrency(getDefaultCurrency())
    }

    const handleCustomEvent = () => {
      setCurrency(getDefaultCurrency())
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("currency-changed", handleCustomEvent)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("currency-changed", handleCustomEvent)
    }
  }, [])

  const handlePayment = async () => {
    setIsProcessing(true)

    try {
      // Submit application to database
      try {
        const submitResponse = await fetch("/api/submit-application", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        await submitResponse.json()

        // Send emails after successful submission
        try {
          const { getAdminNotificationEmail, getClientConfirmationEmail } = await import("@/lib/email-templates")
          
          const emailData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone || "",
            nationality: formData.nationality,
            destination: formData.destination,
            travelStartDate: formData.travelStartDate,
            travelEndDate: formData.travelEndDate,
            maritalStatus: formData.maritalStatus,
            spouseAccompanying: formData.spouseAccompanying,
            hasDocuments: !!(formData.photo || formData.passportPhoto || formData.passportFront),
          }

          // Send admin notification
          const adminEmail = getAdminNotificationEmail(emailData)
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: "ezvisa.net@gmail.com",
              subject: adminEmail.subject,
              html: adminEmail.html,
              type: "admin_notification",
            }),
          }).catch(() => {})

          // Send client confirmation
          const clientEmail = getClientConfirmationEmail(emailData)
          fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: formData.email,
              subject: clientEmail.subject,
              html: clientEmail.html,
              type: "client_confirmation",
            }),
          }).catch(() => {})
        } catch (emailError) {
          // Email sending is non-blocking
        }
      } catch (submitError) {
        // Database submission error - continue with payment
      }

      // Send lead to HubSpot
      let hubspotContactId: string | null = null
      try {
        const hubspotResponse = await fetch("/api/hubspot/create-lead", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
        
        if (hubspotResponse.ok) {
          const hubspotData = await hubspotResponse.json()
          hubspotContactId = hubspotData.contactId || hubspotData.id
        }
      } catch (hubspotError) {
        // HubSpot error - continue with payment
      }

      // Upload documents to HubSpot if we have a contact ID and files
      const hasUploadedFiles =
        formData.passportPhoto ||
        formData.passportFront ||
        formData.passportBack ||
        formData.bankStatement ||
        formData.nocCertificate ||
        formData.salaryCertificate ||
        formData.photo

      if (hubspotContactId && hasUploadedFiles) {
        try {
          const fileFormData = new window.FormData()
          fileFormData.append("contactId", hubspotContactId)
          fileFormData.append("applicantName", `${formData.firstName} ${formData.lastName}`)
          
          if (formData.passportPhoto) fileFormData.append("passportPhoto", formData.passportPhoto)
          if (formData.passportFront) fileFormData.append("passportFront", formData.passportFront)
          if (formData.passportBack) fileFormData.append("passportBack", formData.passportBack)
          if (formData.bankStatement) fileFormData.append("bankStatement", formData.bankStatement)
          if (formData.nocCertificate) fileFormData.append("nocCertificate", formData.nocCertificate)
          if (formData.salaryCertificate) fileFormData.append("salaryCertificate", formData.salaryCertificate)
          if (formData.photo) fileFormData.append("photo", formData.photo)

          // Non-blocking file upload
          fetch("/api/hubspot/upload-files", {
            method: "POST",
            body: fileFormData,
          }).catch(() => {})
        } catch (uploadError) {
          // Error initiating document upload - continue with payment
        }
      }

      // PAYMENT FLOW
      const paymentAmount = currency.basePrice || 299
      
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: currency.code,
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/payment-failed`,
          test: false,
        }),
      })
      
      const data = await response.json()

      if (data.redirect_url) {
        sessionStorage.setItem("pendingApplication", JSON.stringify({
          ...formData,
          paymentAmount,
          currency: currency.code,
          currencySymbol: currency.symbol,
        }))
        
        window.location.href = data.redirect_url
      }
    } catch (error) {
      console.log("Payment flow error (non-blocking):", error)
    }
  }

  const hasDocuments = !!(
    formData.passportPhoto ||
    formData.passportFront ||
    formData.bankStatement ||
    formData.nocCertificate ||
    formData.photo
  )

  const tripDuration = formData.travelStartDate && formData.travelEndDate
    ? Math.ceil(
        (new Date(formData.travelEndDate).getTime() - new Date(formData.travelStartDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0

  const formatEnumValue = (val: string) => {
    if (!val) return "N/A"
    return val.charAt(0).toUpperCase() + val.slice(1).replace("-", " ")
  }

  return (
    <div className="space-y-6">
      {paymentError && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-foreground mb-1">Payment Failed</h4>
            <p className="text-sm text-muted-foreground">{paymentError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24 lg:pb-0">
        {/* Left Column: Dossier Review & Security info */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h3 className="font-semibold text-lg text-foreground mb-1">Review your Application Details</h3>
            <p className="text-xs text-muted-foreground">Verify your information before completing payment.</p>
          </div>

          {/* Detailed Application Dossier Summary Card */}
          <div className="bg-muted/10 border border-border/60 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border/30 pb-3">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Visa Dossier Summary</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {/* Row 1: Profile */}
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Full Name</span>
                <span className="font-medium text-foreground">{formData.firstName} {formData.lastName}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Contact Information</span>
                <span className="font-medium text-foreground block">{formData.email}</span>
                <span className="text-xs text-muted-foreground block">{formData.phone}</span>
              </div>

              {/* Row 2: Origin & Destination */}
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Nationality</span>
                <span className="font-medium text-foreground">{formData.nationality}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Destination & Residence</span>
                <span className="font-medium text-foreground">{formData.destination} (Applying from {formData.cityOfResidence}, {formData.countryOfResidence})</span>
              </div>

              {/* Row 3: Travel Window */}
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Intended Travel Dates</span>
                <span className="font-medium text-foreground">
                  {formData.travelStartDate} to {formData.travelEndDate} ({tripDuration} days)
                </span>
                <span className="text-xs text-muted-foreground block">Dates Flexible: {formatEnumValue(formData.datesFlexible)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Trip Purpose & Companions</span>
                <span className="font-medium text-foreground block">{formatEnumValue(formData.purposeOfTrip)}</span>
                <span className="text-xs text-muted-foreground block">Traveling: {formatEnumValue(formData.travelingWith)}</span>
              </div>

              {/* Row 4: Employment */}
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Employment Status</span>
                <span className="font-medium text-foreground">{formatEnumValue(formData.employmentStatus)}</span>
                {formData.employmentStatus === "employed" && (
                  <span className="text-xs text-muted-foreground block">
                    {formData.jobTitle} at {formData.companyName}
                  </span>
                )}
                {(formData.employmentStatus === "business" || formData.employmentStatus === "freelancer") && (
                  <span className="text-xs text-muted-foreground block">
                    Owner of {formData.companyName}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Financials & Accommodation</span>
                <span className="font-medium text-foreground block">
                  Funding: {formatEnumValue(formData.fundingSource)}
                </span>
                <span className="text-xs text-muted-foreground block">
                  Balance: {formatEnumValue(formData.balanceRange)} | Stay: {formatEnumValue(formData.hotelCategory)}
                </span>
              </div>

              {/* Row 5: Schengen Visa History */}
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">First Schengen Visa?</span>
                <span className="font-medium text-foreground">{formatEnumValue(formData.isFirstSchengenVisa)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Previous Refusals?</span>
                <span className="font-medium text-foreground">{formatEnumValue(formData.previousRefusals)}</span>
                {formData.previousRefusals === "yes" && (
                  <p className="text-xs text-red-500 italic mt-1 leading-relaxed">
                    Refusal Info: {formData.refusalDetails}
                  </p>
                )}
              </div>

              {/* Row 6: Accompanying Spouse (If applicable) */}
              {formData.maritalStatus === "married" && formData.spouseAccompanying === "yes" && (
                <div className="sm:col-span-2 pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Accompanying Spouse Details</span>
                  <span className="font-medium text-foreground">
                    {formData.spouseFirstName} {formData.spouseLastName} ({formData.spouseOccupation || "No Occupation"})
                  </span>
                </div>
              )}
            </div>
          </div>

          {!hasDocuments && (
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm text-foreground">Upload Documents Later Enabled</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No files uploaded yet. Finish your order now and upload them later via the secure link sent to your email.
                </p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-muted/10 border border-border/30 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Secure Checkout</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Secured with SSL encryption. We accept all major cards, Apple Pay, and Google Pay.
            </p>
            <div className="flex justify-start pt-1">
              <Image
                src="/images/payment-methods.jpg"
                alt="Payment Methods"
                width={240}
                height={48}
                className="object-contain opacity-90 contrast-[1.05] mix-blend-multiply dark:mix-blend-normal"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Receipt card & actions */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-card/45 border border-border/60 rounded-3xl p-6 shadow-md backdrop-blur-xl relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            <h3 className="font-semibold text-base text-foreground mb-5 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Order Summary
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-start py-0.5 border-b border-border/30 pb-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Applicant</span>
                <span className="font-semibold text-foreground text-right">
                  {formData.firstName} {formData.lastName}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5 border-b border-border/30 pb-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Nationality</span>
                <span className="font-semibold text-foreground">{formData.nationality}</span>
              </div>

              <div className="flex justify-between items-center py-0.5 border-b border-border/30 pb-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Destination</span>
                <span className="font-semibold text-foreground">{formData.destination}</span>
              </div>

              <div className="flex justify-between items-center py-0.5 border-b border-border/30 pb-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Documents</span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full border",
                    hasDocuments
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                  )}
                >
                  {hasDocuments ? "Uploaded" : "Upload Later"}
                </span>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Embassy Fees</span>
                  <span className="text-[11px] text-muted-foreground italic">Paid at Appointment</span>
                </div>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-base font-semibold text-foreground">Total Fee</span>
                  <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    {currency.basePrice} {currency.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="fixed lg:static bottom-0 left-0 right-0 p-4 lg:p-0 bg-background/85 backdrop-blur-lg border-t border-t-border/80 lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none z-10 flex lg:flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isProcessing}
              className="flex-1 lg:w-full h-14 rounded-2xl font-semibold text-base border border-border bg-background/40 hover:bg-background/80 text-foreground hover:text-foreground transition-all duration-300 active:scale-98"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 lg:w-full h-14 rounded-2xl font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 active:scale-98 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                "Redirecting to payment..."
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
