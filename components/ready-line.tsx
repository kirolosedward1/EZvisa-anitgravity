"use client"

import { useEffect, useState } from "react"
import { APPLICATION_READY, APPLICATION_READY_AR, PREPARATION_TIME, PREPARATION_TIME_AR } from "@/lib/copy"

function useArabic() {
  const [arabic, setArabic] = useState(false)
  useEffect(() => {
    const read = () => {
      const path = window.location.pathname
      const saved = window.localStorage.getItem("ez_lang")
      setArabic(path === "/ar" || path.startsWith("/ar/") || document.documentElement.dir === "rtl" || saved === "ar")
    }
    read()
    window.addEventListener("ez_language_change", read)
    return () => window.removeEventListener("ez_language_change", read)
  }, [])
  return arabic
}

/** "Ready in 1–2 days", in Arabic on /ar. */
export function ReadyLine({ className }: { className?: string }) {
  const arabic = useArabic()
  return <span className={className}>{arabic ? APPLICATION_READY_AR : APPLICATION_READY}</span>
}

/** The FAQ processing sentence, in Arabic on /ar. */
export function PreparationLine({ className }: { className?: string }) {
  const arabic = useArabic()
  return <span className={className}>{arabic ? PREPARATION_TIME_AR : PREPARATION_TIME}</span>
}
