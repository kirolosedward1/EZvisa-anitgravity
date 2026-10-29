import { ArrowRight, Mail } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { LocaleLink } from "@/components/locale-link"
import { getWhatsAppUrl } from "@/lib/contact"

const EMAIL = "hello@ezvisa.net"

/** "Still need help?" strip at the end of every help page: WhatsApp, email and the contact page. No hours promised. */
export function HelpSupport({ arabic, context }: { arabic: boolean; context?: string }) {
  const pick = (en: string, ar: string) => (arabic ? ar : en)
  const message = context
    ? pick(`Hi EZvisa, I read "${context}" in the help center and still have a question.`, `مرحبًا إيزي فيزا، قرأت «${context}» في مركز المساعدة وما زال لدي سؤال.`)
    : pick("Hi EZvisa, I have a question.", "مرحبًا إيزي فيزا، لدي سؤال.")

  return (
    <section aria-labelledby="help-support-heading" className="border-t border-border/70 py-14 md:py-16">
      <div className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 id="help-support-heading" className="panel-title panel-title-lg text-foreground">{pick("Still need help?", "ما زلت بحاجة إلى مساعدة؟")}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {pick(
              "Message a visa specialist. Include your EZ- reference if you have one, so we can find your application.",
              "راسل مختص تأشيرات. واذكر مرجع EZ- إن كان لديك، لنجد طلبك.",
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={getWhatsAppUrl(message, arabic)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <WhatsAppIcon className="size-4 shrink-0" />
            {pick("Chat on WhatsApp", "تواصل عبر واتساب")}
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            <bdi dir="ltr">{EMAIL}</bdi>
          </a>
          <LocaleLink href="/contact" className="inline-flex h-12 items-center justify-center gap-1.5 px-2 text-sm font-semibold text-primary hover:underline">
            {pick("Contact us", "تواصل معنا")}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </LocaleLink>
        </div>
      </div>
    </section>
  )
}
