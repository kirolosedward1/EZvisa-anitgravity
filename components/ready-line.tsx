"use client"

import { useLayoutEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { APPLICATION_READY, PREPARATION_TIME } from "@/lib/copy"
import { LangText } from "@/components/lang-text"

function isArabicPath(path: string | null | undefined) {
  return path === "/ar" || !!path?.startsWith("/ar/")
}

/**
 * True only for the current /ar URL.
 * The first render uses the route (same on server and client). The address bar is
 * applied before paint, and a previous /ar visit is dropped as soon as the route changes.
 */
export function useArabic() {
  const pathname = usePathname()
  const [browserPath, setBrowserPath] = useState<string | null>(null)

  useLayoutEffect(() => {
    setBrowserPath(window.location.pathname)
  }, [pathname])

  return isArabicPath(browserPath ?? pathname)
}

/** "Ready in 1–2 days". Arabic is in the markup and shows when the route sets dir=rtl. */
export function ReadyLine({ className }: { className?: string }) {
  return (
    <span className={className}>
      <LangText en={APPLICATION_READY} ar={<>جاهز خلال <bdi dir="ltr">1–2</bdi> يوم</>} />
    </span>
  )
}

/** The FAQ processing sentence, in Arabic on /ar. */
export function PreparationLine({ className }: { className?: string }) {
  return (
    <span className={className}>
      <LangText en={PREPARATION_TIME} ar={<>نجهّز طلبك خلال <bdi dir="ltr">1–2</bdi> يوم. قرار السفارة يستغرق وقتًا أطول.</>} />
    </span>
  )
}
