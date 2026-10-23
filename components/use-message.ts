"use client"

import { message, type MessageKey } from "@/messages"
import { useSiteLocale } from "@/components/locale-provider"

export function MsgText({
  id,
  values,
}: {
  id: MessageKey
  values?: Record<string, string | number>
}) {
  return useMessage(id, values)
}

/** A single string for placeholders, native options, and alerts. Matches the request locale. */
export function useMessage(id: MessageKey, values?: Record<string, string | number>) {
  return message(useSiteLocale(), id, values)
}

export function usePageArabic() {
  return useSiteLocale() === "ar"
}
