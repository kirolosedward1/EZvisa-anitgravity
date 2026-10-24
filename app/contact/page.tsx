import type { Metadata } from "next"
import { LocaleLink } from "@/components/locale-link"
import { ArrowUpRight, Mail, Phone } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { CompanyLegalNotice } from "@/components/legal/company-details"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { ContactForm } from "@/components/contact-form"
import { WHATSAPP_DISPLAY, telUrl, whatsAppUrl } from "@/lib/contact"
import { requestLocale } from "@/lib/request-locale"

export const metadata: Metadata = {
  title: "Contact EZvisa | WhatsApp, Email and Phone",
  description:
    "Ask a visa specialist about your Schengen visa before you pay, or about an application you've started. WhatsApp +971 54 710 9533 or email info@ezvisa.net.",
  keywords: ["contact EZvisa", "Schengen visa help Dubai", "visa support WhatsApp UAE"],
  alternates: {
    canonical: "https://www.ezvisa.net/contact",
  },
  openGraph: {
    title: "Contact EZvisa",
    description: "WhatsApp, email or phone. A visa specialist answers.",
    url: "https://www.ezvisa.net/contact",
    type: "website",
  },
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  )
}

const CHANNELS = [
  {
    label: "WhatsApp",
    value: WHATSAPP_DISPLAY,
    note: "The quickest way to reach us. Send questions, photos of documents you're unsure about, or voice notes.",
    href: whatsAppUrl(),
    external: true,
    icon: <WhatsAppIcon className="size-5" />,
  },
  {
    label: "Email",
    value: "info@ezvisa.net",
    note: "Best for longer questions and refund requests. Include your EZ- reference if you have one.",
    href: "mailto:info@ezvisa.net",
    external: false,
    icon: <Mail className="size-5" aria-hidden="true" />,
  },
  {
    label: "Phone",
    value: WHATSAPP_DISPLAY,
    note: "The same number. Calls 9 AM to 6 PM, UAE time.",
    href: telUrl(),
    external: false,
    icon: <Phone className="size-5" aria-hidden="true" />,
  },
]

export default async function ContactPage() {
  const arabic = (await requestLocale()) === "ar"
  const channels = CHANNELS.map((channel) =>
    channel.label === "WhatsApp" ? { ...channel, href: whatsAppUrl(undefined, arabic) } : channel,
  )
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge="Contact"
          title="Talk to a visa specialist."
          description="Ask about your trip before you pay, or about an application you've already started. You'll get an answer from someone who prepares visa files, not a script."
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
            <div className="flex flex-col gap-8">
              <ul className="flex flex-col rounded-3xl border border-border/70 bg-card">
                {channels.map((channel) => (
                  <li key={channel.label} className="border-b border-border/70 last:border-0">
                    <a
                      href={channel.href}
                      {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-start gap-4 p-6 transition-colors hover:bg-secondary/50"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{channel.icon}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-sm text-muted-foreground">{channel.label}</span>
                        <span className="ltr-isolate font-semibold text-foreground">{channel.value}</span>
                        <span className="text-sm leading-relaxed text-muted-foreground">{channel.note}</span>
                      </span>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:-scale-x-100" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 rounded-3xl bg-secondary/60 p-6">
                <h2 className="panel-title text-foreground">Already applied?</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your application, its status and your documents are in your account and in the EZvisa app.{" "}
                  <LocaleLink href="/login?next=/dashboard" className="font-medium text-primary hover:underline">
                    Sign in
                  </LocaleLink>{" "}
                  or open the link in your confirmation email.
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Common questions are answered in the{" "}
                <LocaleLink href="/#faq" className="font-medium text-primary hover:underline">
                  FAQ
                </LocaleLink>
                .
              </p>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-10">
              <ContactForm />
            </div>
          </div>
        </section>
      </div>
      <CompanyLegalNotice />
      <Footer />
    </>
  )
}
