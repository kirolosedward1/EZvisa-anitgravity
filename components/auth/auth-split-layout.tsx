"use client"

import type { ReactNode } from "react"
import { Image } from "@/components/image"
import { ArrowLeft, ArrowRight, FileCheck2, Upload } from "lucide-react"
import { Globi } from "@/components/globi/globi"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"

/** A shared, quiet workspace for every account access screen. */
export function AuthSplitLayout({ children, variant = "login" }: { children: ReactNode; variant?: "login" | "signup" | "recovery" }) {
  const locale = useSiteLocale()
  const recovery = variant === "recovery"
  return (
    <div className="ez-auth-layout">
      <aside className="ez-auth-brand">
        <LocaleLink href="/" className="ez-auth-logo" aria-label={locale === "ar" ? "الصفحة الرئيسية لإيزي فيزا" : "EZvisa home"}>
          <Image src="/images/logo-main.png" alt="EZvisa" width={140} height={44} className="h-9 w-auto" priority />
        </LocaleLink>
        <div className="ez-auth-story">
          <h2>{recovery ? <LangText en="Let’s get you back on your way." ar="لنساعدك على متابعة رحلتك." /> : <LangText en={<>Your next chapter.<br /><em>A little closer.</em></>} ar={<>رحلتك القادمة.<br /><em>أقرب بخطوة.</em></>} />}</h2>
          <p><LangText en={recovery ? "Your application will be here when you get back." : "From the first detail to your finished visa file, we’re here to help you get it right."} ar={recovery ? "ستجد طلبك هنا عندما تعود." : "من أول معلومة إلى ملف التأشيرة الجاهز، نحن هنا لمساعدتك في كل خطوة."} /></p>
          <Globi pose={recovery ? "shield" : "welcome"} className="ez-auth-globi" />
        </div>
        <div className="ez-auth-bottom">
          <div><FileCheck2 aria-hidden="true" /><LangText en="Your application, in one place" ar="طلبك، في مكان واحد" /></div>
          <div><Upload aria-hidden="true" /><LangText en="Documents, updates and next steps" ar="مستنداتك، وآخر التحديثات، وخطوتك القادمة" /></div>
          <LocaleLink href="/how-it-works"><LangText en="How EZvisa works" ar="كيف تعمل إيزي فيزا" /><ArrowRight className="rtl:rotate-180" aria-hidden="true" /></LocaleLink>
        </div>
      </aside>
      <main id="main-content" className="ez-auth-main">
        <div className="ez-auth-topbar">
          <LocaleLink href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /><LangText en="Back to home" ar="العودة للرئيسية" />
          </LocaleLink>
          <LocaleLink href="/" className="lg:hidden" aria-label="EZvisa home"><Image src="/images/logo-main.png" alt="EZvisa" width={110} height={34} className="h-7 w-auto" priority /></LocaleLink>
        </div>
        <div className="ez-auth-form-wrap"><div className="ez-auth-form">{children}</div></div>
        <p className="ez-auth-help"><LangText en="A question before you start?" ar="لديك سؤال قبل البدء؟" /> <LocaleLink href="/contact"><LangText en="We’re here to help" ar="نحن هنا للمساعدة" /></LocaleLink></p>
      </main>
    </div>
  )
}
