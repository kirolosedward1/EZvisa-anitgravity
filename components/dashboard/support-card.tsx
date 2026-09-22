import { Mail } from "lucide-react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"

export function SupportCard({ token, destination }: { token: string; destination?: string }) {
  return (
    <DashboardCard aria-label="Support" className="flex flex-col gap-4 bg-secondary/60 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Questions about your file?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Our Dubai-based visa specialists reply on WhatsApp, usually within minutes.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <a
          href={getCaseTrackingWhatsAppUrl(token, destination)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/60 bg-background px-5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          <WhatsAppIcon className="size-4 text-whatsapp" />
          Chat with a specialist
        </a>
        <a
          href="mailto:support@ezvisa.net"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mail className="size-4" aria-hidden="true" />
          support@ezvisa.net
        </a>
      </div>
    </DashboardCard>
  )
}
