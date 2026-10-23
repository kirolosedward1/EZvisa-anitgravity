"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Mail, FileText, Clock, Headphones, Upload, RefreshCw, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { LangText } from "@/components/lang-text"
import { PaymentWaitBang, PaymentWaitRing } from "@/components/payment/payment-mark"
import { useArabic } from "@/components/ready-line"
import { useEffect, useState, Suspense } from "react"
import { getPaymentConfirmationWhatsAppUrl, getWhatsAppUrl } from "@/lib/whatsapp"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const POLL_MS = 2000
const POLL_FOR_MS = 30_000
const SLOW_MS = 8_000

type PaymentOutcome = "checking" | "paid" | "pending" | "failed" | "missing" | "cancelled"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>("")
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
        sessionStorage.removeItem("pendingApplication")
        localStorage.removeItem("visa-wizard-form")
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

  const steps = [
    { icon: Mail, en: "Confirmation email sent to your inbox", ar: "أُرسل بريد التأكيد إلى بريدك" },
    { icon: Clock, en: "Application reviewed within 24 hours by a specialist", ar: "يراجع مختص الطلب خلال ٢٤ ساعة" },
    { icon: FileText, en: "Custom cover letter, flight, and hotel vouchers prepared", ar: "نجهّز خطاب التغطية وقسائم الطيران والفندق" },
    { icon: Headphones, en: "Direct WhatsApp concierge support throughout your journey", ar: "دعم مباشر عبر واتساب طوال إجراءاتك" },
  ]

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container max-w-xl mx-auto text-center">
          <div className="mb-8" role="status" aria-live="polite">
            {outcome === "checking" ? (
              <div className="mx-auto flex h-24 w-24 items-center justify-center">
                <PaymentWaitRing />
              </div>
            ) : outcome === "pending" ? (
              <div className="mx-auto flex h-24 w-24 items-center justify-center">
                <PaymentWaitBang />
              </div>
            ) : outcome === "paid" ? (
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in duration-300">
                <Check className="w-12 h-12 text-primary-foreground stroke-[3]" />
              </div>
            ) : outcome === "cancelled" ? (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
                <X className="h-12 w-12 text-[#5B6475]" />
              </div>
            ) : outcome === "failed" ? (
              <div className="w-24 h-24 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-destructive" />
              </div>
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {outcome === "checking" && <LangText en="Confirming your payment" ar="جارٍ التحقق من الدفع…" />}
            {outcome === "paid" && <LangText en="Payment Confirmed" ar="تم تأكيد الدفع" />}
            {outcome === "failed" && <LangText en="Payment didn't go through" ar="لم تتم عملية الدفع" />}
            {outcome === "pending" && <LangText en="Payment not confirmed yet" ar="لم يتأكد الدفع بعد" />}
            {outcome === "cancelled" && <LangText en="This application was cancelled" ar="تم إلغاء هذا الطلب" />}
            {outcome === "missing" && <LangText en="We couldn't verify this payment" ar="تعذّر التحقق من هذه الدفعة" />}
          </h1>

          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {outcome === "checking" && <LangText en="We're checking this payment with Ziina. This takes a few seconds." ar={"نتحقق من هذا الدفع مع \u2068Ziina\u2069. يستغرق ذلك بضع ثوانٍ."} />}
            {outcome === "paid" && <LangText en="Your Schengen visa application package has been received and is now assigned to our document preparation desk." ar="استلمنا ملف طلب تأشيرة شنغن وأُسند إلى مكتب تجهيز المستندات." />}
            {outcome === "failed" && <LangText en="You weren't charged. You can retry the payment whenever you're ready." ar="لم يُخصم أي مبلغ. يمكنك إعادة محاولة الدفع متى شئت." />}
            {outcome === "pending" && <LangText en="If you completed payment, it can take a minute to show. Check again, and we'll ask Ziina for the latest status." ar={"إذا دفعت فقد يستغرق ظهوره دقيقة. تحقق مجددًا وسنسأل \u2068Ziina\u2069 عن آخر حالة."} />}
            {outcome === "cancelled" && <LangText en="There is nothing left to confirm for this application." ar="لا يوجد ما يحتاج إلى تأكيد لهذا الطلب." />}
            {outcome === "missing" && <LangText en="This return link doesn't include an application we can check. If you paid, use your tracking reference or contact us on WhatsApp." ar="لا يتضمن رابط العودة هذا طلبًا يمكننا التحقق منه. إذا كنت قد دفعت، استخدم رقم التتبع أو تواصل معنا عبر واتساب." />}
          </p>

          {outcome === "checking" && confirmingSlow && (
            <p className="text-foreground mb-6 text-sm font-medium">
              <LangText en="Still confirming with Ziina…" ar={"ما زلنا نؤكد الدفع مع \u2068Ziina\u2069…"} />
            </p>
          )}

          {/* Case Reference Badge */}
          {token && (
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-sm font-semibold">
              <span className="text-muted-foreground font-sans text-xs"><LangText en="Tracking Reference:" ar="رقم التتبع:" /></span>
              <span>#EZ-{token.substring(0, 8).toUpperCase()}</span>
            </div>
          )}

          {outcome === "pending" && (
            <div className="mb-8 flex flex-col items-center gap-2">
              <Button type="button" size="lg" className="h-12 rounded-full bg-[#0436DC] px-6 text-primary-foreground hover:bg-[#0436DC]/90" onClick={() => setAttempt((n) => n + 1)}>
                <LangText en="Check again" ar="تحقق مجددًا" />
              </Button>
              <Button asChild variant="ghost" className="h-12 bg-transparent px-4 text-sm font-semibold text-foreground shadow-none hover:bg-transparent">
                <Link href={applicationHref}>
                  <LangText en="Go to my application" ar="الانتقال إلى طلبي" />
                </Link>
              </Button>
            </div>
          )}

          {outcome === "cancelled" && (
            <div className="mb-8 flex flex-col items-center">
              <Button asChild variant="ghost" className="h-12 bg-transparent px-4 text-sm font-semibold text-foreground shadow-none hover:bg-transparent">
                <Link href={applicationHref}>
                  <LangText en="Go to my application" ar="الانتقال إلى طلبي" />
                </Link>
              </Button>
            </div>
          )}

          {outcome === "failed" && (
            <div className="mb-8">
              <Button asChild size="lg" className="h-12 px-6 rounded-xl">
                <Link href={localePath("/apply?step=payment&retry=true")}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <LangText en="Retry Payment" ar="إعادة محاولة الدفع" />
                </Link>
              </Button>
            </div>
          )}

          {outcome === "paid" && (
          <div className="mb-8 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 md:p-8 text-left shadow-md relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                <LangText en="2" ar="٢" />
              </span>
              <div>
                <h2 className="text-base md:text-lg font-bold text-foreground">
                  <LangText en="Step 2: Upload Your Supporting Documents" ar="الخطوة ٢: ارفع المستندات الداعمة" />
                </h2>
                <p className="text-xs text-muted-foreground">
                  <LangText en="Provide your passport copy, bank statement, and employment proof to begin file preparation." ar="أرسل نسخة من جواز السفر وكشف الحساب وإثبات العمل لنبدأ تجهيز الملف." />
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              <LangText en="Our specialists review your documents within 24 hours to generate your tailored consular cover letter, confirmed flight/hotel vouchers, and complete appointment submission pack." ar="يراجع مختصونا مستنداتك خلال ٢٤ ساعة لإعداد خطاب التغطية ووثائق الطيران والفندق وملف الموعد." />
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {token && (
                <Button asChild size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-sm font-semibold">
                  <Link href={localePath(`/track/${token}/upload`)}>
                    <Upload className="w-4 h-4 mr-2" />
                    <LangText en="Upload Documents Now" ar="ارفع المستندات الآن" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-xl text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm font-semibold">
                <a href={arabic
                  ? getWhatsAppUrl(`مرحبًا EZvisa! أتممت الدفع${destination ? ` إلى ${destination}` : ""} (المرجع: #${(token || "EZVISA").substring(0, 8).toUpperCase()}). يرجى تأكيد الاستلام وإخباري متى تبدأ مراجعة الملف.`)
                  : getPaymentConfirmationWhatsAppUrl(token || "EZVISA", destination)} target="_blank" rel="noopener noreferrer">
                  <LangText en="Send via WhatsApp Instead" ar="الإرسال عبر واتساب بدلًا من ذلك" />
                </a>
              </Button>
            </div>
          </div>
          )}

          {outcome === "paid" && (
          <div className="mb-8 bg-card border border-border/80 shadow-sm rounded-3xl p-6 text-left">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-foreground"><LangText en="Track Your Case & Download Later" ar="تتبع طلبك وحمّل الملف لاحقًا" /></h3>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                  <LangText en="Access your customer portal anytime to track case milestones, upload additional files, and download your finalized dossier." ar="ادخل إلى حسابك في أي وقت لتتبع مراحل الطلب ورفع ملفات إضافية وتنزيل الملف النهائي." />
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none rounded-xl text-xs">
                  <Link href={localePath(`/track/${token}`)}><LangText en="Case Details" ar="تفاصيل الطلب" /></Link>
                </Button>
                <Button asChild size="sm" className="flex-1 sm:flex-none rounded-xl text-xs">
                  <Link href={localePath("/dashboard")}><LangText en="Customer Dashboard" ar="لوحة العميل" /></Link>
                </Button>
              </div>
            </div>
          </div>
          )}

          {outcome === "paid" && (
          <div className="mb-8 bg-card border border-border/80 shadow-sm rounded-3xl p-6 md:p-8 max-w-md mx-auto text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full pointer-events-none" />
            <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-6">
              <LangText en="What Happens Next" ar="ماذا يحدث بعد ذلك" />
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
                  <span className="text-foreground text-sm font-medium"><LangText en={step.en} ar={step.ar} /></span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-full text-sm font-medium">
              <Link href={arabic ? "/ar" : "/"}><LangText en="Return to Home" ar="العودة إلى الرئيسية" /></Link>
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
