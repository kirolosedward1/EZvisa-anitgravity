"use client"

import { useLayoutEffect, useState } from "react"
import { LangText } from "@/components/lang-text"
import { SCHENGEN_META } from "@/lib/countries"

export function countryNameAr(name: string) {
  return SCHENGEN_META[name]?.ar ?? name
}

/** Visible country name. English and Arabic are both in the markup. */
export function CountryName({ name }: { name: string }) {
  return <LangText en={name} ar={countryNameAr(name)} />
}

/** One label for a native <option>, switched before paint. */
export function CountryOptionLabel({ name }: { name: string }) {
  const [label, setLabel] = useState(name)

  useLayoutEffect(() => {
    const root = document.documentElement
    const arabic = root.lang === "ar" || root.dir === "rtl"
    setLabel(arabic ? countryNameAr(name) : name)
  }, [name])

  return label
}
