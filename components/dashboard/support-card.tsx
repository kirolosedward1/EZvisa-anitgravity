import { Mail } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import type { Stage } from "@/lib/application-status"
import { requestLocale } from "@/lib/request-locale"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { getCaseTrackingWhatsAppUrl } from "@/lib/whatsapp"

const COPY: Partial<Record<Stage, { title: CustomerKey; body: CustomerKey }>> = {
  payment: { title: "support.titlePay", body: "support.bodyPay" },
  ready: { title: "support.titleReady", body: "support.bodyReady" },
}

/** `id` gives the EZ- reference the customer sees; the tracking token is only a fallback. */
export async function SupportCard({ id, token, destination, stage, specialist }: { id?: string; token: string; destination?: string; stage?: Stage; specialist?: string }) {
  const arabic = (await requestLocale()) === "ar"
  const locale = arabic ? "ar" : "en"
  const copy = (stage && COPY[stage]) || { title: "support.title", body: "support.bodyCase" }
  return (
    <section aria-label={customerText(locale, "support.aria")} className="flex flex-col gap-3 px-1 pt-1">
      <div className="flex flex-col gap-1">
        <h2 className="ez-dash-panel text-foreground">{customerText(locale, copy.title)}</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{customerText(locale, copy.body)}</p>
      </div>
      <a
        href={getCaseTrackingWhatsAppUrl(id || token, destination, arabic)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-[#1A7F37] px-[18px] text-sm font-medium text-white transition-colors hover:bg-[#166C2F]"
      >
        <WhatsAppIcon className="size-4" />
        {specialist ? customerText(locale, "support.chatWith", { name: specialist }) : customerText(locale, "support.chat")}
      </a>
      <a href="mailto:hello@ezvisa.net" className="inline-flex items-center justify-center gap-2 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        <Mail className="size-[15px]" aria-hidden="true" />
        <span className="ltr-isolate">hello@ezvisa.net</span>
      </a>
    </section>
  )
}
