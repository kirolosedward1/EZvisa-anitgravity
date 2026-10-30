"use client"

import { usePathname } from "next/navigation"
import { useSiteLocale } from "@/components/locale-provider"
import { CountryFlag } from "@/components/country-flag"
import { cn } from "@/lib/utils"

/**
 * English / العربية switcher for the footer. The language lives in the URL (/ar/…) and is read by the root layout
 * (lang, dir, translations), which a client-side navigation would keep. So each option is a plain <a>: a full load of
 * the same page in the other language.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const bare = (usePathname() || "/").replace(/^\/ar(?=\/|$)/, "") || "/"
  const onArabic = useSiteLocale() === "ar"
  const options = [
    { lang: "en", label: "English", flag: "GB", href: bare, current: !onArabic },
    { lang: "ar", label: "العربية", flag: "AE", href: bare === "/" ? "/ar" : `/ar${bare}`, current: onArabic },
  ]

  return (
    <nav aria-label={onArabic ? "اللغة" : "Language"} className={cn("inline-flex items-center gap-1 rounded-full border border-border/70 bg-background p-1", className)}>
      {options.map((option) => (
        <a
          key={option.lang}
          href={option.href}
          lang={option.lang}
          hrefLang={option.lang}
          aria-current={option.current ? "true" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-full py-1.5 ps-1.5 pe-3 text-xs font-medium transition-colors",
            option.current ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <CountryFlag iso={option.flag} className="size-4" />
          {option.label}
        </a>
      ))}
    </nav>
  )
}
