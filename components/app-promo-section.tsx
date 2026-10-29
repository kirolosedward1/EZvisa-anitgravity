import { ArrowRight, BellRing, FileCheck2, Smartphone } from "lucide-react"

import { LocaleLink } from "@/components/locale-link"
import { LangText } from "@/components/lang-text"
import { IphoneFrame } from "@/components/app/iphone-frame"
import { StoreBadges } from "@/components/app/store-badges"
import { appCopy } from "@/components/app/localized"
import { requestLocale } from "@/lib/request-locale"

const POINTS = [
  {
    icon: Smartphone,
    en: "Apply in minutes, one question at a time",
    ar: "قدّم طلبك خلال دقائق، سؤالًا تلو الآخر",
  },
  {
    icon: FileCheck2,
    en: "Snap and upload your documents from your phone",
    ar: "صوّر مستنداتك وارفعها من هاتفك مباشرة",
  },
  {
    icon: BellRing,
    en: "Follow every step, from review to appointment",
    ar: "تابع كل خطوة من المراجعة حتى الموعد",
  },
]

/** Homepage section promoting the EZvisa app, with two iPhone mockups showing real app screens. */
export async function AppPromoSection() {
  const copy = appCopy(await requestLocale())
  return (
    <section id="app" aria-labelledby="app-promo-title" className="py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden bg-secondary/60">
          <div className="relative grid items-center gap-12 px-6 py-12 sm:px-10 md:py-16 lg:grid-cols-2 lg:gap-8 lg:px-14">
            {/* Copy */}
            <div data-site-reveal="rise" className="flex flex-col items-start gap-6">
              <h2 id="app-promo-title" className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-4xl md:text-5xl">
                <LangText en="Your visa, in your pocket" ar="تأشيرتك في جيبك" />
              </h2>

              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                <LangText
                  en="Everything you do on ezvisa.net, on your iPhone. Same account, same application, updated in real time."
                  ar="كل ما تفعله على ezvisa.net متاح على هاتفك. الحساب نفسه والطلب نفسه، بتحديث فوري."
                />
              </p>

              <ul className="flex flex-col gap-3">
                {POINTS.map(({ icon: Icon, en, ar }) => (
                  <li key={en} className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <span className="flex size-5 shrink-0 items-center justify-center text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <LangText en={en} ar={ar} />
                  </li>
                ))}
              </ul>

              <div className="flex flex-col items-start gap-4 pt-2">
                <StoreBadges />
                <LocaleLink href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <LangText en="See how the app works" ar="تعرّف على التطبيق" />
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </LocaleLink>
              </div>
            </div>

            {/* Mockup: front phone (home) with a second phone (track) behind it */}
            <div data-site-reveal="rise" data-site-delay="100" className="relative mx-auto flex h-[420px] w-full max-w-sm items-end justify-center sm:h-[500px] lg:h-[540px]">
              <div className="absolute bottom-4 start-1/2 w-40 -translate-x-[95%] rotate-[-6deg] opacity-95 sm:w-48 lg:w-52 rtl:translate-x-[95%] rtl:rotate-[6deg]">
                <IphoneFrame src={copy.screens.track.src} alt={copy.screens.track.alt} sizes="(min-width: 1024px) 208px, 192px" className="w-full" />
              </div>
              <div className="relative z-10 w-48 translate-x-[18%] sm:w-56 lg:w-60 rtl:-translate-x-[18%]">
                <IphoneFrame src={copy.screens.home.src} alt={copy.screens.home.alt} sizes="(min-width: 1024px) 240px, 224px" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
