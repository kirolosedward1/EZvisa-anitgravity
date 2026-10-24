/** Page path without the /ar prefix, so English and Arabic renders share one identity. */
export function canonicalPath(pathname: string | null | undefined) {
  if (!pathname || pathname === "/ar") return "/"
  if (pathname.startsWith("/ar/")) return pathname.slice(3) || "/"
  return pathname
}

function alreadyArabic(path: string) {
  return path === "/ar" || path.startsWith("/ar/") || path.startsWith("/ar?") || path.startsWith("/ar#")
}

/** Internal page paths get an /ar prefix. API, asset, and already-Arabic paths stay as written. */
export function localizePath(href: string, arabic: boolean) {
  if (!arabic) return href
  if (!href.startsWith("/") || href.startsWith("//") || alreadyArabic(href)) return href
  if (href.startsWith("/api/") || href.startsWith("/_next/")) return href
  const prefixed = href === "/" ? "/ar" : `/ar${href}`
  return localizeNextParam(prefixed)
}

/** `?next=/dashboard` on an Arabic page should land on `/ar/dashboard`, not the English route. */
function localizeNextParam(href: string) {
  const hashAt = href.indexOf("#")
  const hash = hashAt >= 0 ? href.slice(hashAt) : ""
  const beforeHash = hashAt >= 0 ? href.slice(0, hashAt) : href
  const queryAt = beforeHash.indexOf("?")
  if (queryAt < 0 || !/(^|&)next=/.test(beforeHash.slice(queryAt + 1))) return href
  const params = new URLSearchParams(beforeHash.slice(queryAt + 1))
  const next = params.get("next")
  if (!next || !next.startsWith("/") || next.startsWith("//") || alreadyArabic(next) || next.startsWith("/api/") || next.startsWith("/_next/")) {
    return href
  }
  params.set("next", localizePath(next, true))
  return `${beforeHash.slice(0, queryAt)}?${params.toString()}${hash}`
}

/** Sign-out is an API route, so it is not prefixed by localizePath. Posting to /ar still sets the locale header. */
export function signOutAction(arabic: boolean) {
  return arabic ? "/ar/api/auth/signout" : "/api/auth/signout"
}
