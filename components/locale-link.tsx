"use client"

import { forwardRef, type ComponentProps } from "react"
import Link from "next/link"
import { useSiteLocale } from "@/components/locale-provider"
import { localizePath } from "@/lib/route-path"

/** Prefix an internal path with /ar when the address bar is Arabic. */
export function localizeHref(href: string) {
  if (typeof window === "undefined") return href
  const path = window.location.pathname
  return localizePath(href, path === "/ar" || path.startsWith("/ar/"))
}

/** Locale comes from the request, so the server href and the hydrated href match. */
export function useLocalizedHref() {
  const arabic = useSiteLocale() === "ar"
  return (href: string) => localizePath(href, arabic)
}

/** Internal links stay on /ar. English pages keep the path that was written. */
export const LocaleLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function LocaleLink(
  { href, ...props },
  ref,
) {
  const localize = useLocalizedHref()
  return <Link ref={ref} href={typeof href === "string" ? localize(href) : href} {...props} />
})
