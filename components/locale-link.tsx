"use client"

import { useLayoutEffect, useState, type ComponentProps } from "react"
import Link from "next/link"

function localize(href: string, arabic: boolean) {
  if (!arabic) return href
  if (!href.startsWith("/") || href.startsWith("//") || href === "/ar" || href.startsWith("/ar/") || href.startsWith("/ar#") || href.startsWith("/ar?")) {
    return href
  }
  if (href === "/") return "/ar"
  return `/ar${href}`
}

/** Internal links stay on /ar after the first paint. The server href is unchanged so hydration matches. */
export function LocaleLink({ href, ...props }: ComponentProps<typeof Link>) {
  const [arabic, setArabic] = useState(false)

  useLayoutEffect(() => {
    const path = window.location.pathname
    setArabic(path === "/ar" || path.startsWith("/ar/"))
  }, [])

  return <Link href={typeof href === "string" ? localize(href, arabic) : href} {...props} />
}
