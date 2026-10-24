"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { LangText } from "@/components/lang-text"
import { useSiteLocale } from "@/components/locale-provider"
import { Msg } from "@/components/msg"
import type { MessageKey } from "@/messages"
import { LocaleLink } from "@/components/locale-link"
import { WizardBar } from "@/components/apply/wizard-bar"
import { WizardQuestion } from "@/components/apply/wizard-choices"
import { getReference } from "@/lib/application-status"
import { CURRENCIES, applicantCount, formatAedLabel, priceForTravellers } from "@/lib/currency"
import { message } from "@/messages"
import { submitBody } from "@/lib/application-notes"
import { SCHENGEN_META } from "@/lib/countries"
import { citizenshipName, citizenshipNameAr } from "@/lib/nationalities"
import { trackEvent } from "@/lib/analytics"
import type { FormData } from "@/lib/form-types"
import { CHECKOUT_STORAGE_KEY } from "@/lib/wizard-storage"

const KNOWN_ERRORS: Record<string, MessageKey> = {
  "Your previous payment was not completed. Please try again.": "apply.paymentIncomplete",
  "An application with these details was just submitted. Please wait a few minutes before starting another one.": "apply.errDuplicate",
  "Failed to save application. Please try again.": "apply.errSave",
  "Failed to generate payment link. Please try again.": "apply.errPayLink",
  "Ziina didn't open within 20 seconds. Check your connection and retry.": "apply.errTimeout",
  "An unexpected error occurred. Please try again.": "apply.errUnexpected",
}

function KnownError({ text }: { text: string }) {
  const id = KNOWN_ERRORS[text]
  return id ? <Msg id={id} /> : text
}

interface PaymentStepProps {
  formData: FormData
  onBack: () => void
  onEditTrip: () => void
  onEditTraveller: () => void
  isLoading?: boolean
  paymentError?: string | null
}

type SavedCheckout = {
  applicationId: string
  trackingToken?: string
  /** Answers the saved application was created from; a change means the server row must be updated before paying. */
  fingerprint?: string
}


/** Stable summary of the answers (files left out), compared before reusing a saved application. */
export function answersFingerprint(formData: FormData): string {
  const plain: Record<string, unknown> = {}
  for (const key of Object.keys(formData).sort()) {
    const value = (formData as unknown as Record<string, unknown>)[key]
    if (typeof File !== "undefined" && value instanceof File) continue
    if (value === null || value === undefined || value === "") continue
    plain[key] = value
  }
  return JSON.stringify(plain)
}

export function clearSavedCheckout() {
  try {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
  } catch {
    // storage unavailable
  }
}

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

function HandoffRing() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="payment-wait-ring mx-auto" aria-hidden="true">
      <circle cx="28" cy="28" r="24" fill="none" stroke="#E3E7EF" strokeWidth="3" />
      <path d="M28 4a24 24 0 0 1 24 24" fill="none" stroke="#0436DC" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function PaymentStep({ formData, onBack, onEditTrip, onEditTraveller, paymentError }: PaymentStepProps) {
  const locale = useSiteLocale()
  const [isProcessing, setIsProcessing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [trackingToken, setTrackingToken] = useState<string | undefined>(undefined)
  const inFlightRef = useRef<string | null>(null)
  const trackingTokenRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const saved = readSavedCheckout()
    if (saved) {
      setApplicationId(saved.applicationId)
      setTrackingToken(saved.trackingToken)
      trackingTokenRef.current = saved.trackingToken
    }
  }, [])

  const paymentAmount = priceForTravellers(formData.spouseAccompanying, formData.travelingWith)
  const reference = getReference(trackingToken)
  const laterHref = applicationId ? `/dashboard?id=${applicationId}&pay=1#pay` : "/dashboard"
  const shownError = submitError || paymentError

  const handlePayment = async () => {
    if (inFlightRef.current) return
    const saved = readSavedCheckout()
    const remembered = applicationId
      ? { applicationId, trackingToken: trackingTokenRef.current, fingerprint: saved?.applicationId === applicationId ? saved.fingerprint : undefined }
      : saved
    const fingerprint = answersFingerprint(formData)
    // Edited answers (trip, traveller, spouse) since the application was saved: update it before paying, otherwise
    // the stale row is paid and priced (e.g. "with my spouse" shown as AED 498 but charged 249).
    const stale = !!remembered && remembered.fingerprint !== fingerprint
    inFlightRef.current = remembered?.applicationId ?? "pending"

    setIsProcessing(true)
    trackEvent("checkout_started", { destination: formData.destination, amount: paymentAmount })
    setSubmitError(null)
    const started = performance.now()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    let redirecting = false

    try {
      let checkoutId = stale ? undefined : remembered?.applicationId
      let token = stale ? undefined : remembered?.trackingToken

      if (!checkoutId) {
        const submitResponse = await fetch("/api/submit-application", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            stale && remembered?.trackingToken
              ? { ...submitBody(formData), replaceApplicationId: remembered.applicationId, replaceTrackingToken: remembered.trackingToken }
              : submitBody(formData),
          ),
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
        token = typeof submitData.trackingToken === "string" ? submitData.trackingToken : undefined
        const saved: SavedCheckout = { applicationId: createdId, trackingToken: token, fingerprint }
        setApplicationId(createdId)
        setTrackingToken(token)
        trackingTokenRef.current = token
        rememberCheckout(saved)

        if (submitData.created === true) {
          try {
            await fetch("/api/hubspot/create-lead", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(submitBody(formData)),
            })
          } catch (hubspotError) {
            console.error("HubSpot lead creation failed:", hubspotError)
          }
        }
      }

      if (!checkoutId) throw new Error("Failed to save application. Please try again.")
      inFlightRef.current = checkoutId

      const successUrl = new URL("/payment-success", window.location.origin)
      if (token) successUrl.searchParams.set("token", token)
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
          currency: CURRENCIES.AED.code,
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
        sessionStorage.setItem("lastCompletedToken", token || "")
        sessionStorage.setItem("lastCompletedAppId", checkoutId)
        sessionStorage.setItem("lastCompletedDest", formData.destination || "")
        sessionStorage.setItem("pendingApplication", JSON.stringify({
          ...formData,
          paymentAmount,
          currency: CURRENCIES.AED.code,
          currencySymbol: CURRENCIES.AED.symbol,
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

  const country = formData.destination?.trim() || ""
  const countryAr = (country && SCHENGEN_META[country]?.ar) || country
  const nationality = citizenshipName(formData.nationality)
  const nationalityAr = citizenshipNameAr(formData.nationality) || nationality
  const travellerName = [formData.firstName, formData.lastName].filter(Boolean).join(" ").trim()
  const passport = formData.passportNumber?.trim()
  const withSpouse = applicantCount(formData.spouseAccompanying, formData.travelingWith) > 1
  const travellerLine = [travellerName, passport].filter(Boolean).join(" · ")

  return (
    <div>
      <WizardQuestion
        title="Review & pay"
        titleAr="المراجعة والدفع"
        helper="Check everything once. You can edit any section before paying."
        helperAr="راجع البيانات مرة واحدة. يمكنك تعديل أي قسم قبل الدفع."
      />

      <ReviewRow label="Destination" labelAr="الوجهة" onEdit={onEditTrip}>
        {country ? <LangText en={country} ar={countryAr} /> : <Msg id="summary.yourTrip" />}
        {nationality ? (
          <>
            {" · "}
            <Msg id="review.nationalityPassport" values={{ name: nationality }} valuesAr={{ name: nationalityAr }} />
          </>
        ) : null}
      </ReviewRow>

      <ReviewRow label="Traveller" labelAr="المسافر" onEdit={onEditTraveller}>
        {travellerLine ? travellerLine : <Msg id="summary.yourTrip" />}
      </ReviewRow>

      <ReviewRow
        label={message("en", "review.travellers")}
        labelAr={message("ar", "review.travellers")}
        onEdit={onEditTraveller}
      >
        <Msg id={withSpouse ? "review.travellersWithSpouse" : "review.travellersSolo"} />
      </ReviewRow>

      <div className="flex items-center justify-between border-t border-[#E3E7EF] py-[18px] text-[16px] font-semibold text-[#0A0F1F]">
        <span>
          <LangText en="Total" ar="المجموع" />
        </span>
        {locale === "ar" ? (
          <span dir="ltr">{formatAedLabel(paymentAmount, locale)}</span>
        ) : (
          formatAedLabel(paymentAmount, locale)
        )}
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-[#5B6475]">
        <LangText
          en="Secure payment through Ziina. EZvisa prepares and submits your application; the visa decision is made by the embassy."
          ar="دفع آمن عبر زينة. تجهّز EZvisa طلبك وتقدّمه، وقرار التأشيرة يصدر من السفارة."
        />{" "}
        <LangText
          en="EZvisa is not VAT-registered; prices shown are final."
          ar="إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية."
        />
      </p>

      {shownError && !isProcessing ? (
        <div className="mt-5 rounded-[10px] border border-[#B83200]/30 bg-[#FFFFFF] p-4" role="alert">
          <p className="text-[13px] leading-5 text-[#B83200]"><KnownError text={shownError} /></p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePayment}
              className="inline-flex h-10 items-center rounded-[10px] bg-[#0436DC] px-4 text-[13px] font-semibold text-white"
            >
              <LangText en="Retry" ar="أعد المحاولة" />
            </button>
            <LocaleLink
              href={laterHref}
              className="inline-flex h-10 items-center rounded-[10px] border border-[#E3E7EF] px-4 text-[13px] font-semibold text-[#0436DC]"
            >
              <LangText en="Pay later" ar="ادفع لاحقًا" />
            </LocaleLink>
          </div>
        </div>
      ) : null}

      <WizardBar
        onBack={onBack}
        loading={isProcessing}
        continueType="button"
        onContinue={handlePayment}
        continueLabel={`Pay ${paymentAmount} AED`}
        continueLabelAr={`ادفع ${paymentAmount} درهم`}
        loadingLabel="Opening Ziina…"
        loadingLabelAr="جارٍ فتح زينة…"
      />

      {isProcessing ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#FFFFFF] px-6" role="status" aria-live="polite">
          <div className="w-full max-w-[360px] text-center">
            <HandoffRing />
            <h2 className="wizard-question mt-6 text-[#0A0F1F]">
              <LangText en="Taking you to Ziina" ar="جارٍ تحويلك إلى زينة" />
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#5B6475]">
              <LangText
                en={`Secure payment of ${paymentAmount} AED. Please don't close this page.`}
                ar={`دفع آمن بقيمة ${paymentAmount} درهم. لا تغلق هذه الصفحة.`}
              />
            </p>
            <p className="mt-4 border-t border-[#E3E7EF] pt-4 text-[13px] leading-relaxed text-[#5B6475]">
              {reference ? (
                <LangText
                  en={`Application ${reference} is saved. If anything goes wrong, you can pay later from your application.`}
                  ar={`تم حفظ الطلب ${reference}. إذا حدث خطأ، يمكنك الدفع لاحقًا من طلبك.`}
                />
              ) : (
                <LangText
                  en="Your application is saved. If anything goes wrong, you can pay later from your application."
                  ar="تم حفظ طلبك. إذا حدث خطأ، يمكنك الدفع لاحقًا من طلبك."
                />
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReviewRow({
  label,
  labelAr,
  onEdit,
  children,
}: {
  label: string
  labelAr: string
  onEdit: () => void
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-[#E3E7EF] py-[18px] text-[14px]">
      <div className="min-w-0">
        <div className="text-[#5B6475]">
          <LangText en={label} ar={labelAr} />
        </div>
        <div className="mt-1 text-[#0A0F1F]">{children}</div>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-[13px] font-semibold text-[#0436DC]">
        <LangText en="Edit" ar="تعديل" />
      </button>
    </div>
  )
}
