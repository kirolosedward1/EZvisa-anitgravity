"use client"

import { useLayoutEffect, useState } from "react"
import { message, type MessageKey } from "@/messages"

export function MsgText({
  id,
  values,
}: {
  id: MessageKey
  values?: Record<string, string | number>
}) {
  return useMessage(id, values)
}

function pageIsArabic() {
  const root = document.documentElement
  return root.lang === "ar" || root.dir === "rtl"
}

/**
 * A single string for placeholders, native options, and alerts.
 * The first render matches the server (English). The address-bar language
 * is applied before paint.
 */
export function useMessage(id: MessageKey, values?: Record<string, string | number>) {
  const [arabic, setArabic] = useState(false)

  useLayoutEffect(() => {
    setArabic(pageIsArabic())
  }, [])

  return message(arabic ? "ar" : "en", id, values)
}

export function usePageArabic() {
  const [arabic, setArabic] = useState(false)

  useLayoutEffect(() => {
    setArabic(pageIsArabic())
  }, [])

  return arabic
}
