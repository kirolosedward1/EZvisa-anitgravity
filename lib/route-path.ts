/** Page path without the /ar prefix, so English and Arabic renders share one identity. */
export function canonicalPath(pathname: string | null | undefined) {
  if (!pathname || pathname === "/ar") return "/"
  if (pathname.startsWith("/ar/")) return pathname.slice(3) || "/"
  return pathname
}
