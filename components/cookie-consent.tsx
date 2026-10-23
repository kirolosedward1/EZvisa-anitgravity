"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Cookie consent (legal audit H1).
 * Nothing that sets non-essential cookies loads before the visitor chooses:
 * - GA (G-3M5NW9FZYG) and GTM (GTM-PMXQRKLC) are injected only after analytics or marketing consent.
 * - Crisp chat is injected only after functional (chat) consent.
 * Google Consent Mode v2 defaults (all denied) are set in app/layout.tsx before anything else runs;
 * this component sends `consent update` whenever the choice changes.
 * The footer "Cookie settings" link reopens this banner via the OPEN_EVENT window event.
 */

export const CONSENT_KEY = "cookie-consent"
export const OPEN_EVENT = "ez:open-cookie-settings"
const GA_ID = "G-3M5NW9FZYG"
const GTM_ID = "GTM-PMXQRKLC"
const CRISP_ID = "d907684d-1156-478a-b3e7-53259782c044"

type Prefs = { necessary: true; functional: boolean; analytics: boolean; marketing: boolean }
const DENIED: Prefs = { necessary: true, functional: false, analytics: false, marketing: false }
const ALL: Prefs = { necessary: true, functional: true, analytics: true, marketing: true }

type W = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; $crisp?: unknown[]; CRISP_WEBSITE_ID?: string }

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

function readPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    // Ask again after 12 months (Cookie Policy §4). Old choices without a date are asked again too.
    if (!p.savedAt || Date.now() - Date.parse(p.savedAt) > 365 * 24 * 3600 * 1000) return null
    return { necessary: true, functional: !!p.functional, analytics: !!p.analytics, marketing: !!p.marketing }
  } catch {
    return null
  }
}

// gtag() must push the Arguments object (not an array), exactly like Google's snippet.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]) {
  const w = window as W
  w.dataLayer = w.dataLayer || []
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments)
}

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const s = document.createElement("script")
  s.id = id
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

function applyPrefs(p: Prefs) {
  const w = window as W
  gtag("consent", "update", {
    analytics_storage: p.analytics ? "granted" : "denied",
    ad_storage: p.marketing ? "granted" : "denied",
    ad_user_data: p.marketing ? "granted" : "denied",
    ad_personalization: p.marketing ? "granted" : "denied",
  })
  if (p.analytics || p.marketing) {
    if (!document.getElementById("ez-gtag")) {
      gtag("js", new Date())
      gtag("config", GA_ID)
      w.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" })
    }
    addScript("ez-gtag", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
    addScript("ez-gtm", `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`)
  }
  if (p.functional && !document.getElementById("ez-crisp")) {
    w.$crisp = w.$crisp || []
    w.CRISP_WEBSITE_ID = CRISP_ID
    if (document.documentElement.classList.contains("hide-crisp")) w.$crisp.push(["do", "chat:hide"])
    addScript("ez-crisp", "https://client.crisp.chat/l.js")
  }
}

export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [manage, setManage] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DENIED)

  useEffect(() => {
    const stored = readPrefs()
    if (stored) {
      setPrefs(stored)
      applyPrefs(stored)
    } else {
      setOpen(true)
    }
    const reopen = () => {
      setPrefs(readPrefs() ?? DENIED)
      setManage(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  const save = useCallback((p: Prefs) => {
    const previous = readPrefs()
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...p, savedAt: new Date().toISOString() }))
    setPrefs(p)
    setOpen(false)
    setManage(false)
    // Scripts that already loaded cannot be unloaded: reload so a withdrawn consent takes effect.
    const withdrawn = previous && ((previous.analytics && !p.analytics) || (previous.marketing && !p.marketing) || (previous.functional && !p.functional))
    if (withdrawn) window.location.reload()
    else applyPrefs(p)
  }, [])

  if (!open) return null
  return <Banner manage={manage} setManage={setManage} prefs={prefs} setPrefs={setPrefs} save={save} />
}

function Banner({ manage, setManage, prefs, setPrefs, save }: {
  manage: boolean
  setManage: (v: boolean) => void
  prefs: Prefs
  setPrefs: (p: Prefs) => void
  save: (p: Prefs) => void
}) {
  const pathname = usePathname()
  // Pick the language explicitly (not via the rtl: CSS variant) so /ar always gets Arabic, even mid-navigation.
  const ar = (pathname ?? "").startsWith("/ar") || (typeof document !== "undefined" && document.documentElement.dir === "rtl")
  const t = (en: string, arText: string) => (ar ? arText : en)

  // Sit directly above a fixed bottom bar (the wizard's Back/Continue bar) instead of covering it.
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const measure = () => {
      let h = 0
      document.querySelectorAll<HTMLElement>("[data-wizard-bar]").forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.height > 0 && r.top < window.innerHeight) h = Math.max(h, window.innerHeight - r.top)
      })
      setOffset(Math.max(0, Math.round(h)))
    }
    measure()
    const id = window.setInterval(measure, 400)
    window.addEventListener("resize", measure)
    return () => {
      window.clearInterval(id)
      window.removeEventListener("resize", measure)
    }
  }, [pathname])

  // Never cover the Crisp chat icon: hide it while the banner is open.
  useEffect(() => {
    const w = window as W
    w.$crisp?.push(["do", "chat:hide"])
    return () => {
      if (!document.documentElement.classList.contains("hide-crisp")) w.$crisp?.push(["do", "chat:show"])
    }
  }, [])

  const toggles: { key: "functional" | "analytics" | "marketing"; label: string; desc: string }[] = [
    { key: "functional", label: t("Chat", "المحادثة"), desc: t("Crisp live chat. Sets cookies to keep your conversation.", "محادثة Crisp المباشرة. تحفظ ملفات تعريف الارتباط محادثتك.") },
    { key: "analytics", label: t("Analytics", "التحليلات"), desc: t("Google Analytics, to understand how the site is used.", "تحليلات Google، لفهم طريقة استخدام الموقع.") },
    { key: "marketing", label: t("Marketing", "التسويق"), desc: t("Google Tag Manager ad tags, to measure our advertising.", "وسوم الإعلانات عبر Google Tag Manager، لقياس إعلاناتنا.") },
  ]
  const policyHref = ar ? "/ar/cookie-policy" : "/cookie-policy"
  const btn = "h-11 flex-1 whitespace-nowrap sm:flex-none sm:min-w-32 rounded-xl border border-[#0436DC] bg-white px-3 text-[14px] font-semibold text-[#0436DC] cursor-pointer transition-colors hover:bg-[#0436DC]/5"
  const link = "h-11 px-2 whitespace-nowrap text-[14px] font-semibold text-[#0436DC] underline underline-offset-2 cursor-pointer"

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      dir={ar ? "rtl" : "ltr"}
      lang={ar ? "ar" : "en"}
      data-cookie-banner
      style={{ bottom: offset }}
      className="fixed inset-x-0 z-[1000] border-t border-[#E3E7EF] bg-white"
    >
      <div className="mx-auto max-h-[70vh] w-full max-w-6xl overflow-y-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p id="cookie-banner-title" className="text-[13px] leading-snug text-[#5B6475]">
          {t("We use cookies for chat and analytics. ", "نستخدم ملفات تعريف الارتباط للدردشة والتحليلات. ")}
          <a href={policyHref} className="text-[#0436DC] underline">{t("Cookie policy", "سياسة ملفات تعريف الارتباط")}</a>
        </p>

        {manage && (
          <div className="mt-3 divide-y divide-[#E3E7EF] border-y border-[#E3E7EF]">
            <label className="flex items-start justify-between gap-3 py-3">
              <span>
                <span className="block text-[13px] font-semibold text-[#0A0F1F]">{t("Necessary", "الضرورية")}</span>
                <span className="block text-[13px] text-[#5B6475]">{t("Sign-in (Supabase) and your cookie choice. Always on.", "تسجيل الدخول (Supabase) وحفظ اختيارك. مفعّلة دائمًا.")}</span>
              </span>
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-[#0436DC]" />
            </label>
            {toggles.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-start justify-between gap-3 py-3">
                <span>
                  <span className="block text-[13px] font-semibold text-[#0A0F1F]">{o.label}</span>
                  <span className="block text-[13px] text-[#5B6475]">{o.desc}</span>
                </span>
                <input
                  type="checkbox"
                  checked={prefs[o.key]}
                  onChange={(e) => setPrefs({ ...prefs, [o.key]: e.target.checked })}
                  className="mt-1 h-4 w-4 cursor-pointer accent-[#0436DC]"
                />
              </label>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex flex-nowrap items-center gap-2">
          <button type="button" onClick={() => save(ALL)} className={btn}>{t("Accept all", "قبول الكل")}</button>
          <button type="button" onClick={() => save(DENIED)} className={btn}>{t("Reject", "رفض")}</button>
          {manage ? (
            <button type="button" onClick={() => save(prefs)} className={link}>{t("Save", "حفظ")}</button>
          ) : (
            <button type="button" onClick={() => setManage(true)} className={link}>{t("Manage", "إدارة")}</button>
          )}
        </div>
      </div>
    </div>
  )
}
