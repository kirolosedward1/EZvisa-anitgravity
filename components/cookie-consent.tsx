"use client"

import { useCallback, useEffect, useState } from "react"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"

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

  const toggles: { key: "functional" | "analytics" | "marketing"; en: string; ar: string; enD: string; arD: string }[] = [
    { key: "functional", en: "Chat", ar: "المحادثة", enD: "Crisp live chat. Sets cookies to keep your conversation.", arD: "محادثة Crisp المباشرة. تحفظ ملفات تعريف الارتباط محادثتك." },
    { key: "analytics", en: "Analytics", ar: "التحليلات", enD: "Google Analytics, to understand how the site is used.", arD: "تحليلات Google، لفهم طريقة استخدام الموقع." },
    { key: "marketing", en: "Marketing", ar: "التسويق", enD: "Google Tag Manager ad tags, to measure our advertising.", arD: "وسوم الإعلانات عبر Google Tag Manager، لقياس إعلاناتنا." },
  ]

  const btn = "h-10 rounded-lg px-4 text-sm font-semibold cursor-pointer transition-colors"

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-2xl rounded-xl border border-[#E3E7EF] bg-white p-5 text-[#0A0F1F] shadow-lg md:bottom-5"
    >
      <h2 id="cookie-banner-title" className="text-base font-semibold">
        <LangText en="Cookies on EZvisa" ar="ملفات تعريف الارتباط في إيزي فيزا" />
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[#3A4150]">
        <LangText
          en={<>We use necessary cookies to run the site and sign you in. With your permission we also use chat, analytics and marketing cookies. See our <LocaleLink href="/cookie-policy" className="text-[#0436DC] underline">cookie policy</LocaleLink>.</>}
          ar={<>نستخدم ملفات تعريف الارتباط الضرورية لتشغيل الموقع وتسجيل دخولك. وبإذنك نستخدم أيضًا ملفات المحادثة والتحليلات والتسويق. راجع <LocaleLink href="/cookie-policy" className="text-[#0436DC] underline">سياسة ملفات تعريف الارتباط</LocaleLink>.</>}
        />
      </p>

      {manage && (
        <div className="mt-4 divide-y divide-[#E3E7EF] rounded-lg border border-[#E3E7EF]">
          <label className="flex items-start justify-between gap-3 p-3">
            <span>
              <span className="block text-sm font-semibold"><LangText en="Necessary" ar="الضرورية" /></span>
              <span className="block text-xs text-[#5B6475]"><LangText en="Sign-in (Supabase) and your cookie choice. Always on." ar="تسجيل الدخول (Supabase) وحفظ اختيارك. مفعّلة دائمًا." /></span>
            </span>
            <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-[#0436DC]" />
          </label>
          {toggles.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-start justify-between gap-3 p-3">
              <span>
                <span className="block text-sm font-semibold"><LangText en={t.en} ar={t.ar} /></span>
                <span className="block text-xs text-[#5B6475]"><LangText en={t.enD} ar={t.arD} /></span>
              </span>
              <input
                type="checkbox"
                checked={prefs[t.key]}
                onChange={(e) => setPrefs({ ...prefs, [t.key]: e.target.checked })}
                className="mt-1 h-4 w-4 cursor-pointer accent-[#0436DC]"
              />
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => save(ALL)} className={`${btn} bg-[#0436DC] text-white hover:bg-[#032bb0]`}>
          <LangText en="Accept all" ar="قبول الكل" />
        </button>
        <button type="button" onClick={() => save(DENIED)} className={`${btn} border border-[#0436DC] text-[#0436DC] hover:bg-[#0436DC]/5`}>
          <LangText en="Reject" ar="رفض" />
        </button>
        {manage ? (
          <button type="button" onClick={() => save(prefs)} className={`${btn} border border-[#E3E7EF] text-[#0A0F1F] hover:bg-[#F7F8FA]`}>
            <LangText en="Save choices" ar="حفظ الاختيارات" />
          </button>
        ) : (
          <button type="button" onClick={() => setManage(true)} className={`${btn} border border-[#E3E7EF] text-[#0A0F1F] hover:bg-[#F7F8FA]`}>
            <LangText en="Manage" ar="إدارة" />
          </button>
        )}
      </div>
    </div>
  )
}
