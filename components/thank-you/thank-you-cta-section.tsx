"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  const whatsappMessage = `Hi! I just completed my visa application payment. Reference: ${orderId || transactionId || "N/A"}. Can you help me with the next steps?`

  const handleDownloadReceipt = () => {
    // TODO: Implement receipt download functionality
    console.log("[v0] Download receipt clicked")
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "EZvisa - Visa Application Service",
          text: "I just applied for my Schengen visa with EZvisa!",
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
          <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3 bg-transparent"
              onClick={handleDownloadReceipt}
            >
              <Download className="w-4 h-4" />
              <div className="text-left flex-1">
                <div className="font-medium">Download Receipt</div>
                <div className="text-xs text-muted-foreground">Payment confirmation</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3 bg-transparent"
              asChild
            >
              <a href="/documents" target="_blank">
                <FileText className="w-4 h-4" />
                <div className="text-left flex-1">
                  <div className="font-medium">Document Checklist</div>
                  <div className="text-xs text-muted-foreground">What you'll need</div>
                </div>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Need Help Card */}
      <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Need Help?</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Our expert team is here to assist you 24/7
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full justify-start gap-3 bg-emerald-600 hover:bg-emerald-700"
              asChild
            >
              <a
                href={`https://wa.me/971585864446?text=${encodeURIComponent(whatsappMessage)}`}
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
              <a href="tel:+971585864446">
                <Phone className="w-4 h-4" />
                <span className="flex-1 text-left">+971 58 586 4446</span>
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
            <h3 className="font-semibold mb-2">Love our service?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share EZvisa with friends and help them travel too!
            </p>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Share with Friends
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success Stats */}
      <Card className="shadow-lg bg-gradient-to-br from-emerald-500/10 to-primary/5 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-foreground">5,000+</p>
              <p className="text-sm text-muted-foreground">Successful Applications</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xl font-bold text-primary">98%</p>
              <p className="text-xs text-muted-foreground">Approval Rate</p>
            </div>
            <div>
              <p className="text-xl font-bold text-primary">4.9/5</p>
              <p className="text-xs text-muted-foreground">Customer Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
