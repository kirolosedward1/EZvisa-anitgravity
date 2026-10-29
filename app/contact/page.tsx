import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
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
import { withArabicMeta } from "@/lib/page-meta"

export async function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Contact Us: WhatsApp, Email and Phone",
      description:
        "Ask a visa specialist about your Schengen visa before you pay, or about an application you've started. WhatsApp +971 54 710 9533 or email hello@ezvisa.net.",
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
    },
    {
      title: "تواصل مع إيزي فيزا",
      description: "اسأل مختص تأشيرات عن تأشيرة شنغن قبل الدفع، أو عن طلب بدأته. واتساب +971547109533 أو البريد hello@ezvisa.net.",
      path: "/ar/contact",
    },
  )
}

const CHANNELS = [
  {
    label: "WhatsApp",
    labelAr: "واتساب",
    value: WHATSAPP_DISPLAY,
    note: "Send us a message about your trip or application.",
    noteAr: "أرسل لنا رسالة بشأن رحلتك أو طلبك.",
    href: whatsAppUrl(),
    external: true,
    icon: <WhatsAppIcon className="size-5" />,
  },
  {
    label: "Email",
    labelAr: "البريد الإلكتروني",
    value: "hello@ezvisa.net",
    note: "For detailed questions and refund requests. Please include your EZ- reference if you have one.",
    noteAr: "للأسئلة المفصلة وطلبات الاسترداد. يُرجى ذكر مرجع EZ- إن كان لديك.",
    href: "mailto:hello@ezvisa.net",
    external: false,
    icon: <Mail className="size-5" aria-hidden="true" />,
  },
  {
    label: "Phone",
    labelAr: "الهاتف",
    value: WHATSAPP_DISPLAY,
    note: "Call us with questions about your application.",
    noteAr: "اتصل بنا للاستفسار عن طلبك.",
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
      <div className="ez-contact-page min-h-screen bg-background">
        <InnerHero
          badge={arabic ? "تواصل" : "Contact"}
          title={arabic ? "تواصل معنا" : "Contact us"}
          description={
            arabic
              ? "لديك سؤال عن رحلتك أو عن طلب بدأته؟ تواصل معنا عبر واتساب أو البريد الإلكتروني أو الهاتف."
              : "Questions about your trip or about an application you've already started? Contact us on WhatsApp, by email or by phone."
          }
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
            <div className="flex flex-col gap-8">
              <ul className="ez-contact-channels flex flex-col">
                {channels.map((channel) => (
                  <li key={channel.label} className="border-b border-border/70 last:border-0">
                    <a
                      href={channel.href}
                      {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-start gap-4 p-6 transition-colors hover:bg-secondary/50"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{channel.icon}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-sm text-muted-foreground">{arabic ? channel.labelAr : channel.label}</span>
                        <span className="ltr-isolate font-semibold text-foreground">{channel.value}</span>
                        <span className="text-sm leading-relaxed text-muted-foreground">{arabic ? channel.noteAr : channel.note}</span>
                      </span>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:-scale-x-100" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 rounded-3xl bg-secondary/60 p-6">
                <h2 className="panel-title text-foreground">{arabic ? "قدّمت طلبًا من قبل؟" : "Already applied?"}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {arabic ? (
                    <>
                      طلبك وحالته ومستنداتك في حسابك وفي تطبيق إيزي فيزا.{" "}
                      <LocaleLink href="/login?next=/dashboard" className="font-medium text-primary hover:underline">
                        سجّل الدخول
                      </LocaleLink>{" "}
                      أو افتح الرابط في رسالة التأكيد.
                    </>
                  ) : (
                    <>
                      Your application, its status and your documents are in your account and in the EZvisa app.{" "}
                      <LocaleLink href="/login?next=/dashboard" className="font-medium text-primary hover:underline">
                        Sign in
                      </LocaleLink>{" "}
                      or open the link in your confirmation email.
                    </>
                  )}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                {arabic ? (
                  <>
                    تجد إجابات أخرى في{" "}
                    <LocaleLink href="/#faq" className="font-medium text-primary hover:underline">
                      الأسئلة الشائعة
                    </LocaleLink>
                    .
                  </>
                ) : (
                  <>
                    You can also find answers in our{" "}
                    <LocaleLink href="/#faq" className="font-medium text-primary hover:underline">
                      FAQ
                    </LocaleLink>
                    .
                  </>
                )}
              </p>
            </div>

            <div className="ez-contact-form p-6 md:p-10">
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
