"use client"

import { useArabicUrl } from "@/components/locale-provider"
import { translations, Language } from "./index"

export function useTranslation() {
  const active: Language = useArabicUrl() ? "ar" : "en"

  return {
    t: translations[active] || translations.en,
    lang: active,
    isRtl: active === "ar",
  }
}
