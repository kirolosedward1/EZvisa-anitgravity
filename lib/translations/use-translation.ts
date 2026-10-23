"use client"

import { useLayoutEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { translations, Language } from "./index"

function languageFromPath(path: string | null | undefined): Language {
  return path === "/ar" || path?.startsWith("/ar/") ? "ar" : "en"
}

export function useTranslation() {
  const pathname = usePathname()
  const [browserPath, setBrowserPath] = useState<string | null>(null)

  useLayoutEffect(() => {
    setBrowserPath(window.location.pathname)
  }, [pathname])

  const active = languageFromPath(browserPath ?? pathname)

  return {
    t: translations[active] || translations.en,
    lang: active,
    isRtl: active === "ar",
  }
}
