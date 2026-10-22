"use client"

// Last step: Review & Payment. The summary, price rule and wording match the app's review step
// (mobile/components/wizard/payment.tsx); the server prices the application (app/api/create-payment).
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Check, AlertCircle, Lock, ShieldCheck, FileText, ClipboardList, Briefcase } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { getDefaultCurrency, getPrice, type CurrencyInfo } from "@/lib/currency"
import type { FormData } from "@/lib/form-types"
import { DossierReadinessCard } from "@/components/apply/dossier-readiness-card"
import { priceAed, pickAnswers, label, EMPLOYMENT, PURPOSES, COMPANIONS, FUNDING, BALANCE, HOTELS, tripDays, showSpouse } from "@/lib/shared/wizard-contract"

interface PaymentStepProps {
  formData: FormData
  onBack: () => void
  isLoading?: boolean
  paymentError?: string | null
  /** Signed in with a saved draft: its id + session token, so the draft row becomes the submitted application. */
  prepareSubmit?: () => Promise<{ draftId: string; draftVersion: string | null; accessToken: string } | null>
  onSubmitted?: () => void
}

const yn = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "N/A")
const lab = (opts: { value: string; label: string }[], v: string) => (v ? label(opts, v) : "N/A")

export function PaymentStep({ formData, onBack, isLoading, paymentError, prepareSubmit, onSubmitted }: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currency, setCurrency] = useState<CurrencyInfo>(getDefaultCurrency())
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  // The price rule is shared with the app (249 AED, x2 when the spouse travels). USD is a display conversion only.
  const spouse = showSpouse(formData)
  const amountAed = priceAed(formData.spouseAccompanying)
  const displayAmount = getPrice(amountAed, currency.code)

  const handlePayment = async () => {
    setIsProcessing(true)
    trackEvent("checkout_started", { destination: formData.destination, amount: amountAed })
    setSubmitError(null)

    try {
      // 1. Submit application to database (BLOCKING). A saved draft (signed in) is submitted in place, not duplicated.
      const draft = prepareSubmit ? await prepareSubmit().catch(() => null) : null
      const submitResponse = await fetch("/api/submit-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(draft && { Authorization: `Bearer ${draft.accessToken}` }),
        },
        body: JSON.stringify({ ...pickAnswers(formData as unknown as Record<string, unknown>), ...(draft && { draftId: draft.draftId, draftVersion: draft.draftVersion }) }),
      })

      if (!submitResponse.ok) {
        const body = await submitResponse.json().catch(() => null)
        throw new Error(body?.message || "Failed to save application. Please try again.")
      }

      const submitData = await submitResponse.json()
      onSubmitted?.()

      // 2. Send lead to HubSpot (NON-BLOCKING)
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

      // 3. PAYMENT FLOW. The server computes the price and forces the return URLs onto the official domain.
      const successUrl = new URL("/payment-success", window.location.origin)
      if (submitData.trackingToken) successUrl.searchParams.set("token", submitData.trackingToken)
      if (submitData.applicationId) successUrl.searchParams.set("appId", submitData.applicationId)
      if (formData.destination) successUrl.searchParams.set("dest", formData.destination)

      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: submitData.applicationId,
          success_url: successUrl.toString(),
          cancel_url: `${window.location.origin}/payment-failed`,
        }),
      })

      const data = await response.json()

      if (data.redirect_url) {
        sessionStorage.setItem("lastCompletedToken", submitData.trackingToken || "")
        sessionStorage.setItem("lastCompletedAppId", submitData.applicationId || "")
        sessionStorage.setItem("lastCompletedDest", formData.destination || "")
        sessionStorage.setItem("pendingApplication", JSON.stringify({
          ...pickAnswers(formData as unknown as Record<string, unknown>),
          paymentAmount: amountAed,
          currency: "AED",
        }))

        window.location.href = data.redirect_url
      } else {
        throw new Error(data.error || "Failed to generate payment link. Please try again.")
      }
    } catch (error) {
      console.error("Payment flow error:", error)
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      setSubmitError(errorMsg)
      trackEvent("payment_failed", { destination: formData.destination, error: errorMsg })
      setIsProcessing(false)
    }
  }

  const tripDuration = tripDays(formData)

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-28 lg:pb-0">
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
              <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Visa Dossier Summary</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Full Name</span>
                <span className="font-medium text-foreground">{formData.firstName} {formData.lastName}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Contact Information</span>
                <span className="font-medium text-foreground block">{formData.email}</span>
                <span className="text-xs text-muted-foreground block">{formData.phone}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Nationality</span>
                <span className="font-medium text-foreground">{formData.nationality}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Destination & Residence</span>
                <span className="font-medium text-foreground">{formData.destination} (Applying from {formData.cityOfResidence}, {formData.countryOfResidence})</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Intended Travel Dates</span>
                <span className="font-medium text-foreground">
                  {formData.travelStartDate} to {formData.travelEndDate} ({tripDuration} days)
                </span>
                <span className="text-xs text-muted-foreground block">Dates Flexible: {yn(formData.datesFlexible)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Trip Purpose & Companions</span>
                <span className="font-medium text-foreground block">{lab(PURPOSES, formData.purposeOfTrip)}</span>
                <span className="text-xs text-muted-foreground block">Traveling: {lab(COMPANIONS, formData.travelingWith)}</span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Employment Status</span>
                {formData.employmentStatus ? (
                  <>
                    <span className="font-medium text-foreground">{lab(EMPLOYMENT, formData.employmentStatus)}</span>
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
                  </>
                ) : (
                  <span className="font-medium text-foreground">Added after payment</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Financials & Accommodation</span>
                <span className="font-medium text-foreground block">
                  Funding: {lab(FUNDING, formData.fundingSource)}
                </span>
                <span className="text-xs text-muted-foreground block">
                  Balance: {lab(BALANCE, formData.balanceRange)} | Stay: {lab(HOTELS, formData.hotelCategory)}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">First Schengen Visa?</span>
                <span className="font-medium text-foreground">{yn(formData.isFirstSchengenVisa)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Previous Refusals?</span>
                <span className="font-medium text-foreground">{yn(formData.previousRefusals)}</span>
                {formData.previousRefusals === "yes" && (
                  <p className="text-xs text-red-500 italic mt-1 leading-relaxed">
                    Refusal Info: {formData.refusalDetails}
                  </p>
                )}
              </div>

              {spouse && (
                <div className="sm:col-span-2 pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Accompanying Spouse Details</span>
                  <span className="font-medium text-foreground">
                    {formData.spouseFirstName} {formData.spouseLastName} ({formData.spouseOccupation || "No Occupation"})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* After payment: passport number + employment, then documents (same order as the app) */}
          <div className="border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">What happens after payment</h4>
                <p className="text-xs text-muted-foreground">First your passport number and employment details, then your documents</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              To keep checkout short, we only ask what is needed to start. Right after payment you add your passport number and employment details in your dashboard (or in the EZvisa app), then upload clear photos or scans of:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-foreground">
              {["Passport Copy (Bio page)", "UAE Residence Visa & Emirates ID", "Recent Passport Photo", "Stamped Bank Statements (3-6 mo)"].map((d) => (
                <div key={d} className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{d}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-border/50 sm:col-span-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Employment NOC / Salary Certificate / Trade License</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              Files can also be sent to our team on WhatsApp.
            </p>
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
          <div className="bg-card/45 border border-border/60 rounded-3xl p-6 shadow-md md:backdrop-blur-xl relative overflow-hidden">
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
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/25">
                  After payment
                </span>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Embassy Fees</span>
                  <span className="text-[11px] text-muted-foreground italic">Paid at Appointment</span>
                </div>

                {spouse && (
                  <div className="flex justify-between items-center py-1 mt-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                    <span>Including Accompanying Spouse</span>
                    <span>x2</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-base font-semibold text-foreground">Total Fee</span>
                  <span className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    {displayAmount} {currency.code}
                  </span>
                </div>
                {currency.code !== "AED" && (
                  <p className="text-right text-[11px] text-muted-foreground">Charged as {amountAed} AED</p>
                )}
              </div>
            </div>

            {submitError && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-start gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{submitError}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="fixed lg:static bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-0 bg-background/95 md:backdrop-blur-lg border-t border-t-border/80 lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none z-20 flex lg:flex-col gap-3">
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
              disabled={isProcessing || isLoading}
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
