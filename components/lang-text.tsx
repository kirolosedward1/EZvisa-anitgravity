"use client"

import type { ReactNode } from "react"
import { useSiteLocale } from "@/components/locale-provider"

/** One language in the HTML. /ar does not ship the English string. */
export function LangText({ en, ar }: { en: ReactNode; ar: ReactNode }) {
  const locale = useSiteLocale()
  return <>{locale === "ar" ? ar : en}</>
}
