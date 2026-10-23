"use client"

import { useRouter } from "next/navigation"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { WizardBar } from "@/components/apply/wizard-bar"
import { schengenStayDays } from "@/lib/dates"
import { Card, CardContent } from "@/components/ui/card"
import { Check, AlertCircle, Lock, ShieldCheck, FileText, ClipboardList, Loader2 } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { getDefaultCurrency, type CurrencyInfo } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/form-types"
import { DossierReadinessCard } from "@/components/apply/dossier-readiness-card"

interface PaymentStepProps {
  formData: FormData
  onBack: () => void
  isLoading?: boolean
  paymentError?: string | null
}

type SavedCheckout = {
  applicationId: string
  trackingToken?: string
}

const CHECKOUT_STORAGE_KEY = "ez_checkout_application"

function readSavedCheckout(): SavedCheckout | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedCheckout
    if (typeof parsed.applicationId === "string" && parsed.applicationId) return parsed
  } catch {
    return null
  }
  return null
}

function rememberCheckout(saved: SavedCheckout) {
  try {
    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Retry still works for this page view via the in-memory copy.
  }
}

export function PaymentStep({ formData, onBack, isLoading, paymentError }: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currency, setCurrency] = useState<CurrencyInfo>(getDefaultCurrency())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const inFlightRef = useRef<string | null>(null)
  const trackingTokenRef = useRef<string | undefined>(undefined)

  const router = useRouter()

  useEffect(() => {
    const saved = readSavedCheckout()
    if (saved) {
      setApplicationId(saved.applicationId)
      trackingTokenRef.current = saved.trackingToken
    }
  }, [])

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

  // Calculate dynamic price
  const basePrice = currency.basePrice || 299
  const multiplier = formData.spouseAccompanying === "yes" ? 2 : 1
  const paymentAmount = basePrice * multiplier

  const handlePayment = async () => {
    if (inFlightRef.current) return
    const remembered = applicationId ? { applicationId, trackingToken: trackingTokenRef.current } : readSavedCheckout()
    inFlightRef.current = remembered?.applicationId ?? "pending"

    setIsProcessing(true)
    trackEvent("checkout_started", { destination: formData.destination, amount: paymentAmount })
    setSubmitError(null)
    const started = performance.now()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    let redirecting = false

    try {
      let checkoutId = remembered?.applicationId
      let trackingToken = remembered?.trackingToken

      if (!checkoutId) {
        // The application row is created here, once, when the customer first proceeds to payment.
        const submitResponse = await fetch("/api/submit-application", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
          signal: controller.signal,
        })

        const submitData = await submitResponse.json().catch(() => ({}))
        if (!submitResponse.ok) {
          if (submitResponse.status === 409 && submitData?.error === "duplicate_application") {
            throw new Error(
              "An application with these details was just submitted. Please wait a few minutes before starting another one.",
            )
          }
          const serverMessage = typeof submitData?.message === "string" ? submitData.message : ""
          throw new Error(serverMessage || "Failed to save application. Please try again.")
        }

        if (typeof submitData.applicationId !== "string" || !submitData.applicationId) {
          throw new Error("Failed to save application. Please try again.")
        }

        const createdId: string = submitData.applicationId
        checkoutId = createdId
        trackingToken = typeof submitData.trackingToken === "string" ? submitData.trackingToken : undefined
        const saved: SavedCheckout = { applicationId: createdId, trackingToken }
        setApplicationId(createdId)
        trackingTokenRef.current = trackingToken
        rememberCheckout(saved)

        // A reused row (same person, country, and dates within 10 minutes) already has its lead.
        if (submitData.created === true) {
          try {
            await fetch("/api/hubspot/create-lead", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(formData),
            })
          } catch (hubspotError) {
            console.error("HubSpot lead creation failed:", hubspotError)
          }
        }
      }

      if (!checkoutId) throw new Error("Failed to save application. Please try again.")
      inFlightRef.current = checkoutId

      const successUrl = new URL("/payment-success", window.location.origin)
      if (trackingToken) successUrl.searchParams.set("token", trackingToken)
      successUrl.searchParams.set("appId", checkoutId)
      if (formData.destination) successUrl.searchParams.set("dest", formData.destination)

      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: checkoutId,
          amount: paymentAmount,
          currency: currency.code,
          success_url: successUrl.toString(),
          cancel_url: `${window.location.origin}/payment-failed`,
          test: false,
        }),
        signal: controller.signal,
      })

      const data = await response.json().catch(() => ({}))
      console.info("[payment] create-payment", {
        ms: Math.round(performance.now() - started),
        status: response.status,
        error: data.error || null,
        elapsedMs: data.elapsedMs ?? null,
      })

      if (data.redirect_url) {
        sessionStorage.setItem("lastCompletedToken", trackingToken || "")
        sessionStorage.setItem("lastCompletedAppId", checkoutId)
        sessionStorage.setItem("lastCompletedDest", formData.destination || "")
        sessionStorage.setItem("pendingApplication", JSON.stringify({
          ...formData,
          paymentAmount,
          currency: currency.code,
          currencySymbol: currency.symbol,
        }))

        redirecting = true
        window.location.href = data.redirect_url
        return
      }
      throw new Error(data.error || "Failed to generate payment link. Please try again.")
    } catch (error) {
      console.error("Payment flow error:", error)
      const aborted = error instanceof Error && error.name === "AbortError"
      const errorMsg = aborted
        ? "Ziina didn't open within 20 seconds. Check your connection and retry."
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      setSubmitError(errorMsg)
      trackEvent("payment_failed", { destination: formData.destination, error: errorMsg })
      setIsProcessing(false)
    } finally {
      if (!redirecting) inFlightRef.current = null
      window.clearTimeout(timer)
    }
  }

  const hasDocuments = !!(
    formData.passportPhoto ||
    formData.passportFront ||
    formData.bankStatement ||
    formData.nocCertificate ||
    formData.photo
  )

  const tripDuration = schengenStayDays(formData.travelStartDate, formData.travelEndDate)

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-44 lg:pb-0">
        {/* Left Column: Dossier Review & Security info */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h3 className="font-semibold text-lg text-foreground mb-1">Review your Application Details</h3>
            <p className="text-xs text-muted-foreground">Verify your information before completing payment.</p>
          </div>

          <DossierReadinessCard formData={formData} />

          {/* Detailed Application Dossier Summary Card */}
          <div className="bg-muted/10 border border-border/60 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border/30 pb-3">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">Visa Dossier Summary</h4>
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

              {/* Employment is collected after payment, on /continue */}
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Employment</span>
                <span className="font-medium text-foreground">Asked after payment</span>
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

          {/* Post-Payment Document Submission Notice */}
          <div className="border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Post-Payment Document Upload</h4>
                <p className="text-xs text-muted-foreground">Upload your files after checkout in your customer dashboard or via WhatsApp</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              To expedite your checkout today, file uploads are scheduled immediately after payment. You will need clear photos or scans of:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-foreground">
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Passport Copy (Bio page)</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>UAE Residence Visa &amp; Emirates ID</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Recent Passport Photo</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Stamped Bank Statements (3-6 mo)</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50 sm:col-span-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Employment NOC / Salary Certificate / Trade License</span>
              </div>
            </div>
          </div>

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
          <div className="bg-card/45 border border-border/60 rounded-3xl p-6 shadow-md relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full pointer-events-none" />

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
                
                {multiplier > 1 && (
                  <div className="flex justify-between items-center py-1 mt-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                    <span>Including Accompanying Spouse</span>
                    <span>x{multiplier}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-base font-semibold text-foreground">Total Fee</span>
                  <span className="text-3xl font-semibold tracking-tight text-primary">
                    {paymentAmount} {currency.code}
                  </span>
                </div>
              </div>
            </div>
            
            {submitError && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col items-start gap-2">
                  <p>{submitError}</p>
                  <Button type="button" variant="outline" onClick={handlePayment} disabled={isProcessing} className="h-9 rounded-full px-4">
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <WizardBar
            onBack={onBack}
            loading={isProcessing}
            continueType="button"
            onContinue={handlePayment}
            continueLabel="Proceed to Payment"
            continueLabelAr="تابع إلى الدفع"
            loadingLabel="Opening Ziina…"
            loadingLabelAr="جارٍ فتح زينة…"
          />
        </div>
      </div>
    </div>
  )
}
