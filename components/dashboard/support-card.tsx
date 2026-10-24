import { Mail } from "lucide-react"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { requestLocale } from "@/lib/request-locale"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"

/** `id` gives the EZ- reference the customer sees; the tracking token is only a fallback. */
export async function SupportCard({ id, token, destination }: { id?: string; token: string; destination?: string }) {
  const arabic = (await requestLocale()) === "ar"
  return (
    <DashboardCard aria-label="Support" className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="panel-title text-foreground">Questions about your file?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Our Dubai-based visa specialists reply on WhatsApp, usually within minutes.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <a
          href={getCaseTrackingWhatsAppUrl(id || token, destination, arabic)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1A7F37] px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#166C2F]"
        >
          <WhatsAppIcon className="size-4" />
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
