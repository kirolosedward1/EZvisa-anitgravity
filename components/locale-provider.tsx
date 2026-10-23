"use client"

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

/**
 * The locale the server actually rendered with (root layout reads x-ez-locale).
 * Statically prerendered routes (e.g. /documents, force-static) are rendered once without the /ar prefix, so on
 * /ar/documents the server HTML is English while usePathname() in the browser says /ar/documents. Picking the
 * language from the pathname during the first render therefore produced different text on server and client
 * (React #418). The first render now uses this server value; the address bar is applied right after, before paint.
 */
const ServerArabic = createContext(false)

export function LocaleProvider({ arabic, children }: { arabic: boolean; children: ReactNode }) {
  return <ServerArabic.Provider value={arabic}>{children}</ServerArabic.Provider>
}

export function isArabicPath(path: string | null | undefined) {
  return path === "/ar" || !!path?.startsWith("/ar/")
}

/** True on /ar URLs. Hydration-safe: starts from the server's locale, then follows the address bar. */
export function useArabicUrl() {
  const serverArabic = useContext(ServerArabic)
  const pathname = usePathname()
  const [arabic, setArabic] = useState(serverArabic)

  useLayoutEffect(() => {
    setArabic(isArabicPath(window.location.pathname))
  }, [pathname])

  return arabic
}
