"use client"

import { useLayoutEffect, useState } from "react"
import { formatPageDate } from "@/lib/dates"

/** English on the server, then the page language before paint. */
export function LocaleDate({ iso, withYear = false }: { iso: string; withYear?: boolean }) {
  const [text, setText] = useState(() => formatPageDate(iso, false, withYear))

  useLayoutEffect(() => {
    const root = document.documentElement
    const arabic = root.lang === "ar" || root.dir === "rtl"
    setText(formatPageDate(iso, arabic, withYear))
  }, [iso, withYear])

  return <>{text}</>
}
