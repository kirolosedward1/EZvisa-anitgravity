"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CreditCard, Landmark, RefreshCw, Wifi, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { Globi } from "@/components/globi/globi"
import { useArabic } from "@/components/ready-line"
import { getWhatsAppUrl } from "@/lib/whatsapp"
import { CHECKOUT_STORAGE_KEY, WIZARD_STORAGE_KEY } from "@/lib/wizard-storage"

const REASONS: { icon: LucideIcon; en: string; ar: string; bodyEn: string; bodyAr: string }[] = [
  {
    icon: CreditCard,
    en: "Card limit or balance",
    ar: "حد البطاقة أو الرصيد",
    bodyEn: "The amount was above what the card allows today.",
    bodyAr: "المبلغ أعلى مما تسمح به البطاقة اليوم.",
  },
  {
    icon: Landmark,
    en: "Declined by your bank",
    ar: "رفض البنك العملية",
    bodyEn: "Some banks block online or international payments until you approve them in their app.",
    bodyAr: "تحظر بعض البنوك الدفع عبر الإنترنت أو الدولي حتى توافق عليه في تطبيقها.",
  },
  {
    icon: XCircle,
    en: "Payment page closed",
    ar: "أُغلقت صفحة الدفع",
    bodyEn: "The payment was cancelled, or the page closed before it finished.",
    bodyAr: "أُلغي الدفع أو أُغلقت الصفحة قبل اكتماله.",
  },
  {
    icon: Wifi,
    en: "Connection dropped",
    ar: "انقطع الاتصال",
    bodyEn: "The connection was lost while the payment gateway was confirming.",
    bodyAr: "انقطع الاتصال أثناء تأكيد بوابة الدفع.",
  },
]

/** True when this browser still holds the wizard draft or the checkout, so retrying keeps the answers. */
function hasSavedApplication(): boolean {
  try {
    return !!(localStorage.getItem(WIZARD_STORAGE_KEY) || sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || sessionStorage.getItem("pendingApplication"))
  } catch {
    return false
  }
}

export default function PaymentFailedPage() {
  const arabic = useArabic()
  const [saved, setSaved] = useState(false)

  useEffect(() => setSaved(hasSavedApplication()), [])

  const whatsAppHref = getWhatsAppUrl(
    arabic ? "مرحبًا، لم يكتمل الدفع لطلبي. هل يمكنكم المساعدة؟" : "Hi, my payment didn't go through. Can you help?",
    arabic,
  )

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <SiteHeader forceBackground={true} />
      <main id="main-content" className="ez-customer-page ez-payment-page flex-1 px-4 pb-16 pt-28 md:pt-32">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <section className="ez-payment-result ez-payment-failed grid overflow-hidden border border-border bg-card p-0 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <div className="flex items-end justify-center overflow-hidden bg-[#edf4ff] px-6 pt-6 md:items-center md:px-0 md:py-10">
              <Globi pose="calm" className="w-44 shrink-0 md:w-[120%] md:max-w-none" />
            </div>

            <div className="flex min-w-0 flex-col gap-8 p-6 sm:p-8 md:p-10">
              <header className="flex flex-col gap-3">
                <h1 className="text-foreground">
                  <LangText en="Payment not completed" ar="لم يكتمل الدفع" />
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {saved ? (
                    <LangText
                      en="No problem. Your answers are saved, so you can try again in a moment."
                      ar="لا بأس. إجاباتك محفوظة، ويمكنك المحاولة مجددًا خلال لحظات."
                    />
                  ) : (
                    <LangText
                      en="No problem. You can try the payment again, or start a new application."
                      ar="لا بأس. يمكنك إعادة محاولة الدفع أو بدء طلب جديد."
                    />
                  )}
                </p>
              </header>

              <p className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  <LangText
                    en="If your bank shows a charge for this attempt, message us before paying again so you aren't charged twice."
                    ar="إذا ظهر خصم لهذه المحاولة في حسابك البنكي، راسلنا قبل الدفع مرة أخرى حتى لا يُخصم المبلغ مرتين."
                  />
                </span>
              </p>

              <div className="flex flex-col gap-4">
                <h2 className="text-foreground">
                  <LangText en="What usually stops a payment" ar="ما الذي يوقف الدفع عادةً" />
                </h2>
                <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {REASONS.map(({ icon: Icon, en, ar, bodyEn, bodyAr }) => (
                    <li key={en} className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground"><LangText en={en} ar={ar} /></span>
                        <span className="text-sm leading-relaxed text-muted-foreground"><LangText en={bodyEn} ar={bodyAr} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <LocaleLink href={saved ? "/apply?step=payment&retry=true" : "/apply"}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    {saved ? <LangText en="Try payment again" ar="أعد محاولة الدفع" /> : <LangText en="Start an application" ar="ابدأ طلبًا" />}
                  </LocaleLink>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={whatsAppHref} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="size-4 text-[#1A7F37]" />
                    <LangText en="Message us on WhatsApp" ar="راسلنا على واتساب" />
                  </a>
                </Button>
              </div>
            </div>
          </section>

          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>
              <LangText en="Prefer email?" ar="تفضّل البريد الإلكتروني؟" />{" "}
              <a href="mailto:hello@ezvisa.net" className="font-medium text-primary hover:underline" dir="ltr">hello@ezvisa.net</a>
            </span>
            <LocaleLink href="/help/pricing-and-payment/payment-did-not-go-through" className="font-medium text-foreground hover:underline">
              <LangText en="Payment help" ar="مساعدة الدفع" />
            </LocaleLink>
          </p>
        </div>
      </main>
    </div>
  )
}
