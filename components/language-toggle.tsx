"use client"

import { usePathname, useRouter } from "next/navigation"
import { Languages } from "lucide-react"

export function LanguageToggle() {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const onArabic = pathname === "/ar" || pathname.startsWith("/ar/")

  const toggleLanguage = () => {
    const bare = pathname.replace(/^\/ar(?=\/|$)/, "") || "/"
    const target = onArabic ? bare : bare === "/" ? "/ar" : `/ar${bare}`
    router.push(target)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
      title={onArabic ? "Switch to English" : "تبديل إلى العربية"}
      aria-label="Toggle language"
    >
      <Languages className="w-3.5 h-3.5 text-primary" />
      <span>{onArabic ? "EN" : "العربية"}</span>
    </button>
  )
}
