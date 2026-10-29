"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
import { LocaleLink } from "@/components/locale-link"
import { POPUP_SIGNED_IN } from "@/lib/auth/popup"

/** End of a popup sign-in: tell the window that opened it, then close. Shown only if the browser keeps it open. */
export function PopupDone() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => (arabic ? ar : en)
  const [stillOpen, setStillOpen] = useState(false)

  useEffect(() => {
    try { window.opener?.postMessage({ type: POPUP_SIGNED_IN }, window.location.origin) } catch {}
    try {
      const channel = new BroadcastChannel(POPUP_SIGNED_IN)
      channel.postMessage(Date.now())
      channel.close()
    } catch {}
    try { localStorage.setItem(POPUP_SIGNED_IN, String(Date.now())) } catch {}
    window.close()
    const timer = window.setTimeout(() => setStillOpen(true), 400)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6" dir={arabic ? "rtl" : "ltr"}>
      {stillOpen ? (
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-medium text-foreground">{t("You're signed in", "تم تسجيل الدخول")}</h1>
          <p className="text-muted-foreground">{t("You can close this window and carry on with your application.", "يمكنك إغلاق هذه النافذة ومتابعة طلبك.")}</p>
          <LocaleLink href="/apply?resume=1" className="text-sm font-medium text-primary underline underline-offset-4">
            {t("Back to your application", "العودة إلى طلبك")}
          </LocaleLink>
        </div>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">{t("Signing you in…", "جارٍ تسجيل الدخول…")}</p>
      )}
    </div>
  )
}
