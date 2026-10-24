"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { ltr } from "@/lib/bidi"
import { getWhatsAppUrl } from "@/lib/whatsapp"
import { customerText } from "@/lib/translations/customer"
import { 
  Download, 
  FileText, 
  MessageCircle, 
  Phone, 
  Mail, 
  ExternalLink,
  Share2,
  CheckCircle2
} from "lucide-react"

interface ThankYouCTASectionProps {
  orderId?: string
  transactionId?: string
}

export function ThankYouCTASection({ orderId, transactionId }: ThankYouCTASectionProps) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const reference = orderId || transactionId || (arabic ? "غير متوفر" : "N/A")
  const whatsappMessage = arabic
    ? `مرحبًا، أكملت دفع طلب التأشيرة. المرجع: ${ltr(reference)}. هل تساعدونني في الخطوات التالية؟`
    : `Hi! I just completed my visa application payment. Reference: ${reference}. Can you help me with the next steps?`

  const handleDownloadReceipt = () => {
    // TODO: Implement receipt download functionality
    console.log("[v0] Download receipt clicked")
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: customerText(locale, "thanks.shareTitle"),
          text: customerText(locale, "thanks.shareText"),
          url: "https://www.ezvisa.net",
        })
      } catch (err) {
        console.log("[v0] Share cancelled")
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-4">{customerText(locale, "thanks.actions")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3 bg-transparent"
              onClick={handleDownloadReceipt}
            >
              <Download className="w-4 h-4" />
              <div className="text-start flex-1">
                <div className="font-medium">{customerText(locale, "thanks.receipt")}</div>
                <div className="text-xs text-muted-foreground">{customerText(locale, "thanks.receiptHint")}</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3 bg-transparent"
              asChild
            >
              <LocaleLink href="/documents" target="_blank">
                <FileText className="w-4 h-4" />
                <div className="text-start flex-1">
                  <div className="font-medium">{customerText(locale, "thanks.checklist")}</div>
                  <div className="text-xs text-muted-foreground">{customerText(locale, "thanks.checklistHint")}</div>
                </div>
              </LocaleLink>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Need Help Card */}
      <Card className="shadow-lg border-primary/20 bg-[#F7F8FA]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{customerText(locale, "thanks.help")}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {customerText(locale, "thanks.hours")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full justify-start gap-3 bg-emerald-600 hover:bg-emerald-700"
              asChild
            >
              <a
                href={getWhatsAppUrl(whatsappMessage, arabic)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="flex-1 text-left">WhatsApp Support</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              asChild
            >
              <a href="tel:+971547109533">
                <Phone className="w-4 h-4" />
                <span className="ltr-isolate flex-1 text-start">+971 54 710 9533</span>
              </a>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              asChild
            >
              <a href="mailto:hello@ezvisa.net">
                <Mail className="w-4 h-4" />
                <span className="flex-1 text-left">hello@ezvisa.net</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social Share */}
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">{customerText(locale, "thanks.love")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {customerText(locale, "thanks.shareBody")}
            </p>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              {customerText(locale, "thanks.share")}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
