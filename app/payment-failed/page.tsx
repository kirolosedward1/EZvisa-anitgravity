"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { Globi } from "@/components/globi/globi"
import { useArabic } from "@/components/ready-line"
import { getWhatsAppUrl } from "@/lib/whatsapp"
import { CHECKOUT_STORAGE_KEY, WIZARD_STORAGE_KEY } from "@/lib/wizard-storage"

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
      <main id="main-content" className="ez-customer-page ez-payment-page flex-1 px-4 pb-16 pt-24 md:pt-28">
        <section className="ez-payment-result mx-auto flex w-full max-w-lg flex-col items-center border border-border bg-card text-center">
          <Globi pose="calm" className="-my-6 w-36 sm:-mt-8 sm:w-40" />

          <h1 className="text-foreground">
            <LangText en="Payment not completed" ar="لم يكتمل الدفع" />
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {saved
              ? <LangText en="Your answers are saved. Try again when you're ready." ar="إجاباتك محفوظة. أعد المحاولة عندما تكون جاهزًا." />
              : <LangText en="You can try again, or start a new application." ar="يمكنك المحاولة مجددًا أو بدء طلب جديد." />}
          </p>
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
            <LangText en="Charged already? Message us before paying again." ar="خُصم المبلغ؟ راسلنا قبل الدفع مرة أخرى." />
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <LocaleLink href={saved ? "/apply?step=payment&retry=true" : "/apply"}>
                <RefreshCw className="size-4" aria-hidden="true" />
                {saved ? <LangText en="Try again" ar="أعد المحاولة" /> : <LangText en="Start an application" ar="ابدأ طلبًا" />}
              </LocaleLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={whatsAppHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-4 text-[#1A7F37]" />
                <LangText en="WhatsApp us" ar="راسلنا على واتساب" />
              </a>
            </Button>
          </div>

          <LocaleLink href="/help/pricing-and-payment/payment-did-not-go-through" className="mt-6 text-sm font-medium text-muted-foreground hover:text-primary hover:underline">
            <LangText en="Why payments fail" ar="لماذا يفشل الدفع" />
          </LocaleLink>
        </section>
      </main>
    </div>
  )
}
