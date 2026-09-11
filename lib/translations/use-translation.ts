"use client"

import { useState, useEffect } from "react"
import { translations, Language } from "./index"

export function useTranslation() {
  const [lang, setLang] = useState<Language>("en")

  useEffect(() => {
    const current = (localStorage.getItem("ez_lang") as Language) || "en"
    setLang(current)

    const handleLanguageChange = (e: CustomEvent<Language>) => {
      if (e.detail && (e.detail === "en" || e.detail === "ar")) {
        setLang(e.detail)
      }
    }

    window.addEventListener("ez_language_change" as any, handleLanguageChange)
    return () => {
      window.removeEventListener("ez_language_change" as any, handleLanguageChange)
    }
  }, [])

  return {
    t: translations[lang] || translations.en,
    lang,
    isRtl: lang === "ar",
  }
}
