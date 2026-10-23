"use client"

import { Button } from "@/components/ui/button"
import { X, RefreshCw, CreditCard, Wifi, Ban, AlertCircle, Mail, MessageCircle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { LangText } from "@/components/lang-text"
import { useArabic } from "@/components/ready-line"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function PaymentFailedPage() {
  const router = useRouter()
  const arabic = useArabic()
  const [canRetry, setCanRetry] = useState(false)

  useEffect(() => {
    const pendingData = sessionStorage.getItem("pendingApplication")
    setCanRetry(!!pendingData)
  }, [])

  const handleRetry = () => {
    router.push(`${arabic ? "/ar" : ""}/apply?step=payment&retry=true`)
  }

  const whatsAppText = arabic
    ? "مرحبًا، أحتاج مساعدة لأن عملية الدفع لم تكتمل. هل يمكنكم المساعدة؟"
    : "Hi, I need help with my payment that failed. Can you assist me?"

  const reasons = [
    { icon: CreditCard, en: "Insufficient funds", ar: "الرصيد غير كافٍ" },
    { icon: Ban, en: "Card declined by bank", ar: "رفض البنك البطاقة" },
    { icon: AlertCircle, en: "Payment cancelled", ar: "أُلغي الدفع" },
    { icon: Wifi, en: "Network connection issue", ar: "مشكلة في الاتصال بالشبكة" },
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
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4">
            <LangText en="Payment Failed" ar="فشلت عملية الدفع" />
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
            <LangText en="Your payment could not be processed. Don't worry, no charges were made." ar="تعذّر إتمام الدفع. لا تقلق، لم يُخصم أي مبلغ." />
          </p>

          {/* Possible Reasons */}
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              <LangText en="Possible reasons" ar="أسباب محتملة" />
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
                  <span className="text-sm text-muted-foreground"><LangText en={reason.en} ar={reason.ar} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="mb-12">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {canRetry
                  ? <LangText en="Your application details have been saved." ar="تم حفظ تفاصيل طلبك." />
                  : <LangText en="You can retry your payment or start a new application." ar="يمكنك إعادة محاولة الدفع أو بدء طلب جديد." />}
              </p>
              <Button 
                onClick={handleRetry}
                size="lg"
                className="gap-2 px-8 w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <LangText en="Retry Payment" ar="إعادة محاولة الدفع" />
              </Button>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <LangText en="Need help?" ar="هل تحتاج مساعدة؟" />
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
                href={`https://wa.me/971547109533?text=${encodeURIComponent(whatsAppText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-green-600 hover:underline font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                <LangText en="WhatsApp Support" ar="الدعم عبر واتساب" />
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
