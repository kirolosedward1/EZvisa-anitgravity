"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { ArrowRight, BookmarkCheck, X } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META, countryNameAr } from "@/lib/countries"
import { WIZARD_STORAGE_KEY, WIZARD_STEP_STORAGE_KEY, WIZARD_DRAFT_EVENT, RESUME_DISMISSED_KEY } from "@/lib/wizard-storage"
import { parseResumeDraft, showResumeOnPath, type ResumeDraft } from "@/lib/wizard-resume"

/** Dismissible saved-application entry point on the homepage and other public pages. */
export function ContinueApplicationNotification({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname() || "/"
  const arabic = useSiteLocale() === "ar"
  const [draft, setDraft] = useState<ResumeDraft | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [cookieOpen, setCookieOpen] = useState(false)
  const t = (en: string, ar: string) => arabic ? ar : en

  useEffect(() => {
    const sync = () => {
      try {
        setDraft(parseResumeDraft(localStorage.getItem(WIZARD_STORAGE_KEY), localStorage.getItem(WIZARD_STEP_STORAGE_KEY)))
        setDismissed(sessionStorage.getItem(RESUME_DISMISSED_KEY) === "1")
      } catch { setDraft(null) }
    }
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener("pageshow", sync)
    window.addEventListener(WIZARD_DRAFT_EVENT, sync)
    document.addEventListener("visibilitychange", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("pageshow", sync)
      window.removeEventListener(WIZARD_DRAFT_EVENT, sync)
      document.removeEventListener("visibilitychange", sync)
    }
  }, [pathname])

  useEffect(() => {
    if (inline || !showResumeOnPath(pathname)) return
    const sync = () => setCookieOpen(Boolean(document.querySelector("[data-cookie-banner]")))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [inline, pathname])

  if (!draft || dismissed || (!inline && (!showResumeOnPath(pathname) || cookieOpen))) return null
  const country = Object.prototype.hasOwnProperty.call(SCHENGEN_META, draft.destination) ? draft.destination : ""
  const title = country ? (arabic ? `طلب تأشيرة ${countryNameAr(country)}` : `Your ${country} application`) : t("Your saved application", "طلبك المحفوظ")

  function dismiss() {
    setDismissed(true)
    try { sessionStorage.setItem(RESUME_DISMISSED_KEY, "1") } catch { /* still hidden until navigation */ }
  }

  return <section className={`ez-resume-box${inline ? " ez-resume-inline" : " ez-resume-floating"}`} aria-label={t("Continue your application", "متابعة طلبك")}>
    <div className="ez-resume-heading">
      {country ? <CountryFlag iso={SCHENGEN_META[country].iso} country={country} className="size-8" /> : <BookmarkCheck className="ez-resume-icon" aria-hidden="true" />}
      <div><h2>{title}</h2><p>{t("Saved on this device. Pick up where you left off.", "محفوظ على هذا الجهاز. تابع من حيث توقفت.")}</p></div>
      <button type="button" onClick={dismiss} className="ez-resume-dismiss" aria-label={t("Hide this reminder", "إخفاء هذا التذكير")}><X size={16} aria-hidden="true" /></button>
    </div>
    <LocaleLink className="ez-resume-action" href={`/apply?resume=1&step=${draft.step}`}>{t("Continue application", "متابعة الطلب")}<ArrowRight size={17} className="rtl:rotate-180" aria-hidden="true" /></LocaleLink>
  </section>
}
