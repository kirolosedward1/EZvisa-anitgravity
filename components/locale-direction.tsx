"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"

function isArabicPath(path: string | null | undefined) {
  return path === "/ar" || !!path?.startsWith("/ar/")
}

/** Direction follows the address bar, before paint, so a previous /ar visit cannot restyle an English route. */
export function LocaleDirection() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const arabic = isArabicPath(window.location.pathname)
    document.documentElement.lang = arabic ? "ar" : "en"
    if (arabic) document.documentElement.dir = "rtl"
    else document.documentElement.removeAttribute("dir")
  }, [pathname])

  return null
}
