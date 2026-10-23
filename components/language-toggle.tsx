"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Languages } from "lucide-react"

export function LanguageToggle() {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const onArabic = pathname === "/ar" || pathname.startsWith("/ar/")
  const [lang, setLang] = useState<"en" | "ar">(onArabic ? "ar" : "en")

  useEffect(() => {
    const saved = (localStorage.getItem("ez_lang") as "en" | "ar") || "en"
    const next = onArabic ? "ar" : saved
    setLang(next)
    applyLanguage(next)
  }, [onArabic])

  const applyLanguage = (newLang: "en" | "ar") => {
    document.documentElement.lang = newLang
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr"
    localStorage.setItem("ez_lang", newLang)
    document.cookie = `ez_lang=${newLang}; path=/; max-age=31536000`
    window.dispatchEvent(new CustomEvent("ez_language_change", { detail: newLang }))
  }

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "ar" : "en"
    const bare = pathname.replace(/^\/ar/, "") || "/"
    const target = nextLang === "ar" ? (bare === "/" ? "/ar" : `/ar${bare}`) : bare
    setLang(nextLang)
    applyLanguage(nextLang)
    router.push(target)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
      title={lang === "en" ? "تبديل إلى العربية" : "Switch to English"}
      aria-label="Toggle language"
    >
      <Languages className="w-3.5 h-3.5 text-primary" />
      <span>{lang === "en" ? "العربية" : "EN"}</span>
    </button>
  )
}
