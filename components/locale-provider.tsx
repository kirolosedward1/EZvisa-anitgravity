"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { DisplayLocale } from "@/lib/currency"

const LocaleContext = createContext<DisplayLocale>("en")

/** Locale comes from the request (`x-ez-locale`), so /ar server HTML is Arabic only. */
export function LocaleProvider({ locale, children }: { locale: DisplayLocale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useSiteLocale(): DisplayLocale {
  return useContext(LocaleContext)
}
