"use client"

import { Mail } from "lucide-react"
import { Globi } from "@/components/globi/globi"
import { useSiteLocale } from "@/components/locale-provider"
import { customerText } from "@/lib/translations/customer"

interface ThankYouHeroProps {
  applicationData: { firstName: string; lastName: string; email: string; orderId?: string }
}

export function ThankYouHero({ applicationData }: ThankYouHeroProps) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"

  return (
    <section className="px-5 pb-12 pt-28 md:pt-32 text-center">
      <Globi pose="celebrate" className="mx-auto mb-5 max-w-44" />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
          {customerText(locale, "thanks.paid")} <span className="text-primary">{customerText(locale, "thanks.paidAccent")}</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          {arabic ? <>أهلًا بك، <bdi dir="ltr">{applicationData.firstName}</bdi></> : customerText("en", "thanks.welcome", { name: applicationData.firstName })}
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{customerText(locale, "thanks.received")}</p>
        {applicationData.orderId && (
          <p className="mt-6 inline-flex rounded-xl bg-secondary px-5 py-3 text-sm font-medium text-primary">
            {arabic ? <>المرجع: <bdi dir="ltr">#{applicationData.orderId}</bdi></> : customerText("en", "thanks.reference", { id: applicationData.orderId })}
          </p>
        )}
        {applicationData.email && (
          <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <Mail className="size-4 text-primary" aria-hidden="true" />
            <span>{arabic ? "تحقّق من رسالة التأكيد في بريدك:" : "Check your inbox for the confirmation:"} <bdi dir="ltr">{applicationData.email}</bdi></span>
          </p>
        )}
      </div>
    </section>
  )
}
