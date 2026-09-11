"use client"

import { useState, useEffect } from "react"
import { Languages } from "lucide-react"

export function LanguageToggle() {
  const [lang, setLang] = useState<"en" | "ar">("en")

  useEffect(() => {
    const saved = (localStorage.getItem("ez_lang") as "en" | "ar") || "en"
    setLang(saved)
    applyLanguage(saved)
  }, [])

  const applyLanguage = (newLang: "en" | "ar") => {
    document.documentElement.lang = newLang
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr"
    localStorage.setItem("ez_lang", newLang)
    document.cookie = `ez_lang=${newLang}; path=/; max-age=31536000`
    window.dispatchEvent(new CustomEvent("ez_language_change", { detail: newLang }))
  }

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "ar" : "en"
    setLang(nextLang)
    applyLanguage(nextLang)
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
