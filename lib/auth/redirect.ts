// Where auth flows land. Email links (confirm sign-up, magic link, password reset) and OAuth return to
// /auth/callback on the same origin, which exchanges the code for a session and continues to `next`.
// Supabase only redirects to URLs on its allow list (Auth → URL Configuration), otherwise it falls back to the Site
// URL: https://www.ezvisa.net/auth/callback (and the preview/localhost variants) must be listed there.

export type LinkType = "signup" | "magiclink" | "recovery"

/** Internal paths only (no protocol, no "//host"): prevents open redirects through ?next=. */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes(":") || raw.includes("\\")) return fallback
  return raw
}

/** Server-side: the origin the visitor sees (behind Vercel's proxy it arrives in x-forwarded-host / -proto). */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host")
  // Next already builds request.url from the Host header; only a proxy that rewrote Host needs the forwarded values.
  if (!host || host === url.host) return url.origin
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")
  return `${proto}://${host}`
}

/** Browser-side: the callback URL for an email link or an OAuth round trip. */
export function authCallbackUrl(opts: { type?: LinkType; next?: string } = {}): string {
  const url = new URL("/auth/callback", window.location.origin)
  if (opts.type) url.searchParams.set("type", opts.type)
  const next = safeNext(opts.next)
  if (next !== "/dashboard") url.searchParams.set("next", next)
  return url.toString()
}

export const loginHref = (next?: string, extra?: Record<string, string>) => {
  const p = new URLSearchParams(extra)
  const n = safeNext(next)
  if (n !== "/dashboard") p.set("next", n)
  const q = p.toString()
  return q ? `/login?${q}` : "/login"
}
