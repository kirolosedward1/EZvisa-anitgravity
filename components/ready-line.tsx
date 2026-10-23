"use client"

import { APPLICATION_READY, APPLICATION_READY_AR, PREPARATION_TIME, PREPARATION_TIME_AR } from "@/lib/copy"
import { LangText } from "@/components/lang-text"
import { useArabicUrl } from "@/components/locale-provider"

/**
 * True only for the current /ar URL.
 * The first render uses the locale the server rendered with (see components/locale-provider);
 * the address bar is applied before paint.
 */
export function useArabic() {
  return useArabicUrl()
}

/** "Ready in 1–2 days". Arabic is in the markup and shows when the route sets dir=rtl. */
export function ReadyLine({ className }: { className?: string }) {
  return (
    <span className={className}>
      <LangText en={APPLICATION_READY} ar={APPLICATION_READY_AR} />
    </span>
  )
}

/** The FAQ processing sentence, in Arabic on /ar. */
export function PreparationLine({ className }: { className?: string }) {
  return (
    <span className={className}>
      <LangText en={PREPARATION_TIME} ar={PREPARATION_TIME_AR} />
    </span>
  )
}
