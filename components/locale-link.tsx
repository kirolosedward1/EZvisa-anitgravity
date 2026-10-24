"use client"

import { forwardRef, useLayoutEffect, useState, type ComponentProps } from "react"
import Link from "next/link"

function localize(href: string, arabic: boolean) {
  if (!arabic) return href
  if (!href.startsWith("/") || href.startsWith("//") || href === "/ar" || href.startsWith("/ar/") || href.startsWith("/ar#") || href.startsWith("/ar?")) {
    return href
  }
  if (href === "/") return "/ar"
  return `/ar${href}`
}

/** Prefix an internal path with /ar when the address bar is Arabic. */
export function localizeHref(href: string) {
  if (typeof window === "undefined") return href
  const path = window.location.pathname
  return localize(href, path === "/ar" || path.startsWith("/ar/"))
}

/** Internal links stay on /ar after the first paint. The server href is unchanged so hydration matches. */
export const LocaleLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function LocaleLink(
  { href, ...props },
  ref,
) {
  const [arabic, setArabic] = useState(false)

  useLayoutEffect(() => {
    const path = window.location.pathname
    setArabic(path === "/ar" || path.startsWith("/ar/"))
  }, [])

  return <Link ref={ref} href={typeof href === "string" ? localize(href, arabic) : href} {...props} />
})
