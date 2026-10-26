"use client"

import { LocaleLink } from "@/components/locale-link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, ClipboardList, Clock, FileText, Loader2, MessageCircle, RefreshCw, Upload, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { LangText } from "@/components/lang-text"
import { PaymentWaitBang, PaymentWaitRing } from "@/components/payment/payment-mark"
import { useArabic } from "@/components/ready-line"
import { useEffect, useState, Suspense } from "react"
import { getPaymentConfirmationWhatsAppUrl } from "@/lib/whatsapp"
import { clearWizardAfterPayment } from "@/lib/wizard-storage"
import { referenceOf } from "@/lib/shared/wizard-contract"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const POLL_MS = 2000
const POLL_FOR_MS = 30_000
const SLOW_MS = 8_000

type PaymentOutcome = "checking" | "paid" | "pending" | "failed" | "missing" | "cancelled"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>("")
  const [appId, setAppId] = useState<string>("")
  const [destination, setDestination] = useState<string>("")
  const [outcome, setOutcome] = useState<PaymentOutcome>("checking")
  const [attempt, setAttempt] = useState(0)
  const [confirmingSlow, setConfirmingSlow] = useState(false)
  const arabic = useArabic()

  // Ziina's webhook only reaches production. Confirm the intent here through GET /api/check-payment,
  // which fetches it with our API key and stores the status. Landing on this URL is not proof of payment.
  useEffect(() => {
    const urlToken = searchParams.get("token") || sessionStorage.getItem("lastCompletedToken") || ""
    const urlAppId = searchParams.get("appId") || sessionStorage.getItem("lastCompletedAppId") || ""
    const urlDest = searchParams.get("dest") || sessionStorage.getItem("lastCompletedDest") || ""

    setToken(urlToken || urlAppId)
    setAppId(urlAppId)
    setDestination(urlDest)
    setOutcome("checking")

    if (!UUID_RE.test(urlAppId)) {
      setOutcome("missing")
      return
    }

    let cancelled = false
    let timer = 0
    const started = Date.now()

    const finish = (next: PaymentOutcome) => {
      if (cancelled) return
      if (next === "paid") {
        // Paid: the next /apply visit must start a new application, not offer (and re-pay) this one.
        clearWizardAfterPayment()
      }
      setOutcome(next)
    }

    const tick = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/check-payment?applicationId=${encodeURIComponent(urlAppId)}`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 400 || res.status === 404) {
          finish("missing")
          return
        }
        const status = String(data.payment_status ?? "").toLowerCase()
        if (res.ok && String(data.status ?? "").toLowerCase() === "cancelled") {
          finish("cancelled")
          return
        }
        if (res.ok && (status === "paid" || status === "completed")) {
          finish("paid")
          return
        }
        if (res.ok && (status === "failed" || status === "canceled" || status === "cancelled")) {
          finish("failed")
          return
        }
      } catch {
        // Keep polling until the deadline. A single network error is not a failed payment.
      }
      if (Date.now() - started >= POLL_FOR_MS) {
        finish("pending")
        return
      }
      timer = window.setTimeout(tick, POLL_MS)
    }

    void tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchParams, attempt])

  useEffect(() => {
    if (outcome !== "checking") {
      setConfirmingSlow(false)
      return
    }
    setConfirmingSlow(false)
    const timer = window.setTimeout(() => setConfirmingSlow(true), SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [outcome, attempt])

  const localePath = (path: string) => `${arabic ? "/ar" : ""}${path}`
  const applicationPath = token ? `/track/${token}` : "/dashboard"
  const applicationHref = localePath(applicationPath)
  const reference = UUID_RE.test(appId) ? referenceOf(appId) : ""
  const continueHref = localePath(UUID_RE.test(appId) ? `/continue/${appId}` : "/dashboard")
  const uploadHref = localePath(token && !UUID_RE.test(token) ? `/track/${token}/upload` : "/dashboard")
  const whatsappHref = getPaymentConfirmationWhatsAppUrl(appId || token || "EZVISA", destination, arabic)

  const nextSteps = [
    {
      icon: ClipboardList,
      en: "Continue your application",
      ar: "أكمل طلبك",
      body: { en: "Trip plan, passport and employment details. About 5 minutes.", ar: "خطة الرحلة والجواز وبيانات العمل. حوالي 5 دقائق." },
    },
    {
      icon: Upload,
      en: "Upload your documents",
      ar: "ارفع مستنداتك",
      body: { en: "Passport, photo, bank statement and employment proof.", ar: "الجواز والصورة وكشف الحساب وإثبات العمل." },
    },
    {
      icon: FileText,
      en: "We prepare your visa file",
      ar: "نجهّز ملف التأشيرة",
      body: { en: "A specialist reviews it within 24 hours: cover letter, itinerary and bookings.", ar: "يراجعه مختص خلال 24 ساعة: خطاب التغطية وخط السير والحجوزات." },
    },
  ]

  const statusIcon =
    outcome === "checking" ? <PaymentWaitRing /> :
    outcome === "pending" ? <PaymentWaitBang /> :
    outcome === "paid" ? (
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald-600 text-primary-foreground">
        <Check className="size-6" strokeWidth={2.5} aria-hidden="true" />
      </span>
    ) : outcome === "failed" ? (
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <RefreshCw className="size-6" aria-hidden="true" />
      </span>
    ) : outcome === "cancelled" ? (
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <X className="size-6" aria-hidden="true" />
      </span>
    ) : (
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Clock className="size-6" aria-hidden="true" />
      </span>
    )

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <SiteHeader forceBackground={true} />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-28 md:pt-32">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8" aria-live="polite">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex size-12 shrink-0 items-center justify-center" role="status">{statusIcon}</div>
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                  {outcome === "checking" && <LangText en="Confirming your payment" ar="جارٍ التحقق من الدفع…" />}
                  {outcome === "paid" && <LangText en="Payment confirmed" ar="تم تأكيد الدفع" />}
                  {outcome === "failed" && <LangText en="Payment didn't go through" ar="لم تتم عملية الدفع" />}
                  {outcome === "pending" && <LangText en="Payment not confirmed yet" ar="لم يتأكد الدفع بعد" />}
                  {outcome === "cancelled" && <LangText en="This application was cancelled" ar="تم إلغاء هذا الطلب" />}
                  {outcome === "missing" && <LangText en="We couldn't verify this payment" ar="تعذّر التحقق من هذه الدفعة" />}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {outcome === "checking" && <LangText en="We're checking this payment with Ziina. This takes a few seconds." ar={"نتحقق من هذا الدفع مع ⁨Ziina⁩. يستغرق ذلك بضع ثوانٍ."} />}
                  {outcome === "paid" && <LangText en="Your visa file is open. A receipt is on its way to your email." ar="ملف التأشيرة مفتوح الآن. الإيصال في طريقه إلى بريدك." />}
                  {outcome === "failed" && <LangText en="You weren't charged. You can retry the payment whenever you're ready." ar="لم يُخصم أي مبلغ. يمكنك إعادة محاولة الدفع متى شئت." />}
                  {outcome === "pending" && <LangText en="If you completed payment, it can take a minute to show. Check again, and we'll ask Ziina for the latest status." ar={"إذا دفعت فقد يستغرق ظهوره دقيقة. تحقق مجددًا وسنسأل ⁨Ziina⁩ عن آخر حالة."} />}
                  {outcome === "cancelled" && <LangText en="There is nothing left to confirm for this application." ar="لا يوجد ما يحتاج إلى تأكيد لهذا الطلب." />}
                  {outcome === "missing" && <LangText en="This return link doesn't include an application we can check. If you paid, open your dashboard or contact us on WhatsApp." ar="لا يتضمن رابط العودة هذا طلبًا يمكننا التحقق منه. إذا كنت قد دفعت، افتح لوحتك أو تواصل معنا عبر واتساب." />}
                </p>
                {outcome === "checking" && confirmingSlow && (
                  <p className="text-sm font-medium text-foreground">
                    <LangText en="Still confirming with Ziina…" ar={"ما زلنا نؤكد الدفع مع ⁨Ziina⁩…"} />
                  </p>
                )}
                {reference && (
                  <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div className="flex flex-col">
                      <dt className="text-xs text-muted-foreground"><LangText en="Reference" ar="المرجع" /></dt>
                      <dd className="font-semibold tracking-wide text-foreground tabular-nums" dir="ltr">{reference}</dd>
                    </div>
                    {destination && (
                      <div className="flex flex-col">
                        <dt className="text-xs text-muted-foreground"><LangText en="Destination" ar="الوجهة" /></dt>
                        <dd className="font-semibold text-foreground">{destination}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>

            {outcome === "paid" && (
              <div className="mt-8 border-t border-border/70 pt-6">
                <p className="text-sm font-semibold text-foreground"><LangText en="What's next" ar="الخطوات التالية" /></p>
                <ol className="mt-4 flex flex-col">
                  {nextSteps.map((step, index) => {
                    const Icon = step.icon
                    const current = index === 0
                    return (
                      <li key={step.en} className="relative flex gap-4 pb-6 last:pb-0">
                        {index < nextSteps.length - 1 && <span aria-hidden="true" className="absolute start-5 top-11 bottom-1 w-px bg-border" />}
                        <span
                          className={
                            current
                              ? "relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                              : "relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                          }
                        >
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-1 pt-1">
                          <p className="text-sm font-semibold text-foreground">
                            <LangText en={step.en} ar={step.ar} />
                            {current && (
                              <span className="ms-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                <LangText en="Now" ar="الآن" />
                              </span>
                            )}
                          </p>
                          <p className="text-sm leading-relaxed text-muted-foreground"><LangText en={step.body.en} ar={step.body.ar} /></p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {outcome === "paid" && (
                <>
                  <Button asChild size="lg">
                    <LocaleLink href={continueHref}>
                      <LangText en="Continue application" ar="أكمل الطلب" />
                      <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                    </LocaleLink>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <LocaleLink href={uploadHref}>
                      <LangText en="Upload documents first" ar="ارفع المستندات أولًا" />
                    </LocaleLink>
                  </Button>
                </>
              )}
              {outcome === "pending" && (
                <>
                  <Button type="button" size="lg" onClick={() => setAttempt((n) => n + 1)}>
                    <LangText en="Check again" ar="تحقق مجددًا" />
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <LocaleLink href={applicationHref}><LangText en="Go to my application" ar="الانتقال إلى طلبي" /></LocaleLink>
                  </Button>
                </>
              )}
              {outcome === "failed" && (
                <Button asChild size="lg">
                  <LocaleLink href={localePath("/apply?step=payment&retry=true")}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    <LangText en="Retry payment" ar="إعادة محاولة الدفع" />
                  </LocaleLink>
                </Button>
              )}
              {(outcome === "cancelled" || outcome === "missing") && (
                <Button asChild size="lg" variant="outline">
                  <LocaleLink href={localePath("/dashboard")}><LangText en="Go to my dashboard" ar="الانتقال إلى لوحتي" /></LocaleLink>
                </Button>
              )}
            </div>
          </section>

          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#1A7F37] hover:underline">
              <MessageCircle className="size-4" aria-hidden="true" />
              <LangText en="Questions? Message us on WhatsApp" ar="لديك سؤال؟ راسلنا على واتساب" />
            </a>
            <LocaleLink href={localePath("/dashboard")} className="font-medium text-foreground hover:underline">
              <LangText en="Go to dashboard" ar="الذهاب إلى لوحتي" />
            </LocaleLink>
          </p>
        </div>
      </main>
    </div>
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
