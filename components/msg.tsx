"use client"

import { message, type MessageKey } from "@/messages"
import { useSiteLocale } from "@/components/locale-provider"

/** One language in the HTML. /ar does not ship the English string. */
export function Msg({
  id,
  values,
  valuesAr,
}: {
  id: MessageKey
  values?: Record<string, string | number>
  valuesAr?: Record<string, string | number>
}) {
  const locale = useSiteLocale()
  return <>{message(locale, id, locale === "ar" ? (valuesAr ?? values) : values)}</>
}
