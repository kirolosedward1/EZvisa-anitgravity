"use client"

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowLeft, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { CHAT_WIDGET_ENABLED, suppressesChat } from "@/lib/chat-routes"
import { concealCrisp, presentCrisp } from "@/components/crisp-visibility"

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

/** Google Consent Mode v2 update for the chosen categories (also sent before a reload, so running tags stop first). */
function pushConsent(p: Prefs) {
  gtag("consent", "update", {
    analytics_storage: p.analytics ? "granted" : "denied",
    ad_storage: p.marketing ? "granted" : "denied",
    ad_user_data: p.marketing ? "granted" : "denied",
    ad_personalization: p.marketing ? "granted" : "denied",
  })
}

function applyPrefs(p: Prefs) {
  const w = window as W
  pushConsent(p)
  // GA only with analytics consent (a denied analytics_storage still allows cookieless pings, so the script itself is gated).
  if (p.analytics && !document.getElementById("ez-gtag")) {
    gtag("js", new Date())
    gtag("config", GA_ID)
    addScript("ez-gtag", `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
  }
  // GTM (ad tags) with analytics or marketing consent.
  if ((p.analytics || p.marketing) && !document.getElementById("ez-gtm")) {
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" })
    addScript("ez-gtm", `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`)
  }
  if (p.functional) presentCrisp(CRISP_ID)
  else if (suppressesChat(window.location.pathname)) concealCrisp()
}

export function CookieConsent() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [manage, setManage] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DENIED)
  // Vercel Analytics is held until analytics consent (same stored choice as GA). Starts false on server and client.
  const [analyticsOn, setAnalyticsOn] = useState(false)

  // After a client-side navigation, keep Crisp unloaded on auth pages and bring it back elsewhere.
  useEffect(() => {
    if (readPrefs()?.functional) presentCrisp(CRISP_ID)
  }, [pathname])

  useEffect(() => {
    const stored = readPrefs()
    if (stored) {
      setPrefs(stored)
      setAnalyticsOn(stored.analytics)
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
    if (withdrawn) {
      pushConsent(p) // the tags already running see the withdrawal before the page unloads
      window.location.reload()
    } else {
      setAnalyticsOn(p.analytics)
      applyPrefs(p)
    }
  }, [])

  return (
    <>
      {analyticsOn && <Analytics />}
      {open && <Banner manage={manage} setManage={setManage} prefs={prefs} setPrefs={setPrefs} save={save} />}
    </>
  )
}

function Banner({ manage, setManage, prefs, setPrefs, save }: {
  manage: boolean
  setManage: (v: boolean) => void
  prefs: Prefs
  setPrefs: (p: Prefs) => void
  save: (p: Prefs) => void
}) {
  const pathname = usePathname()
  // Language from the URL only (never the DOM during render), so /ar always gets Arabic and renders are deterministic.
  const ar = pathname === "/ar" || (pathname ?? "").startsWith("/ar/")
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
      if (!CHAT_WIDGET_ENABLED || suppressesChat(window.location.pathname)) return
      if (!document.documentElement.classList.contains("hide-crisp")) w.$crisp?.push(["do", "chat:show"])
    }
  }, [])

  const toggles: { key: "functional" | "analytics" | "marketing"; label: string; desc: string }[] = [
    { key: "functional", label: t("Chat", "المحادثة"), desc: t("Crisp live chat. Sets cookies to keep your conversation.", "محادثة Crisp المباشرة. تحفظ ملفات تعريف الارتباط محادثتك.") },
    { key: "analytics", label: t("Analytics", "التحليلات"), desc: t("Google Analytics, to understand how the site is used.", "تحليلات Google، لفهم طريقة استخدام الموقع.") },
    { key: "marketing", label: t("Marketing", "التسويق"), desc: t("Google Tag Manager ad tags, to measure our advertising.", "وسوم الإعلانات عبر Google Tag Manager، لقياس إعلاناتنا.") },
  ]
  const policyHref = ar ? "/ar/cookie-policy" : "/cookie-policy"
  const heading = useRef<HTMLHeadingElement>(null)
  const manageButton = useRef<HTMLButtonElement>(null)
  const wasManaging = useRef(false)
  useEffect(() => {
    if (manage) heading.current?.focus({ preventScroll: true })
    else if (wasManaging.current) manageButton.current?.focus({ preventScroll: true })
    wasManaging.current = manage
  }, [manage])

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      dir={ar ? "rtl" : "ltr"}
      lang={ar ? "ar" : "en"}
      data-cookie-banner
      style={{ "--cookie-offset": `${offset}px` } as CSSProperties}
      className={`ez-cookie${manage ? " ez-cookie-manage" : ""}`}
    >
      <header className="ez-cookie-header">
        <div className="ez-cookie-title-row">
          <ShieldCheck className="ez-cookie-icon" aria-hidden="true" />
          <h2 ref={heading} tabIndex={-1} id="cookie-banner-title">{manage ? t("Cookie preferences", "تفضيلات ملفات الارتباط") : t("Cookies, your choice.", "ملفات الارتباط، اختيارك.")}</h2>
          {manage && <button type="button" className="ez-cookie-back" onClick={() => setManage(false)} aria-label={t("Back to cookie notice", "العودة إلى إشعار ملفات الارتباط")}><ArrowLeft className="rtl:rotate-180" aria-hidden="true" /></button>}
        </div>
        <p id="cookie-banner-description">{manage
          ? t("Choose which optional cookies to allow. You can update your preferences at any time.", "اختر ملفات الارتباط الاختيارية التي تسمح بها. يمكنك تعديل تفضيلاتك في أي وقت.")
          : t("Essential cookies keep EZvisa working. You choose whether to allow chat, analytics and marketing cookies.", "تحافظ ملفات الارتباط الضرورية على عمل إيزي فيزا. وأنت تختار السماح بملفات المحادثة والتحليلات والتسويق.")}</p>
        <a href={policyHref} className="ez-cookie-policy">{t("Read our cookie policy", "اقرأ سياسة ملفات الارتباط")}</a>
      </header>

      {manage && <div className="ez-cookie-options">
        <div className="ez-cookie-option">
          <div><span className="ez-cookie-label">{t("Necessary", "الضرورية")}</span><p>{t("For sign-in and remembering your cookie choices.", "لتسجيل الدخول وحفظ اختياراتك لملفات الارتباط.")}</p></div>
          <span className="ez-cookie-always">{t("Always on", "مفعّلة دائمًا")}</span>
        </div>
        {toggles.map((o) => <label key={o.key} className="ez-cookie-option ez-cookie-option-toggle">
          <div><span id={`cookie-${o.key}-label`} className="ez-cookie-label">{o.label}</span><p id={`cookie-${o.key}-description`}>{o.desc}</p></div>
          <span className="ez-cookie-toggle">
            <input type="checkbox" role="switch" aria-labelledby={`cookie-${o.key}-label`} aria-describedby={`cookie-${o.key}-description`} checked={prefs[o.key]} onChange={(e) => setPrefs({ ...prefs, [o.key]: e.target.checked })} />
            <span aria-hidden="true" />
          </span>
        </label>)}
      </div>}

      <footer className="ez-cookie-footer">
        <div className="ez-cookie-actions">
          <button type="button" onClick={() => save(DENIED)} className="ez-cookie-button">{t("Reject optional", "رفض الاختيارية")}</button>
          <button type="button" onClick={() => save(ALL)} className={`ez-cookie-button${manage ? "" : " ez-cookie-primary"}`}>{t("Accept all", "قبول الكل")}</button>
        </div>
        {manage
          ? <button type="button" onClick={() => save(prefs)} className="ez-cookie-button ez-cookie-primary ez-cookie-save">{t("Save my preferences", "حفظ تفضيلاتي")}</button>
          : <button ref={manageButton} type="button" onClick={() => setManage(true)} aria-expanded={false} className="ez-cookie-settings"><SlidersHorizontal aria-hidden="true" />{t("Manage preferences", "إدارة التفضيلات")}</button>}
      </footer>
    </section>
  )
}
