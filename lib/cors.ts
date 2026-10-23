import { SITE_URL, siteUrl } from "@/lib/site-url"

const STATIC_ORIGINS = [
  SITE_URL,
  "https://ezvisa.net",
  "https://www.ezvisa.net",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8081",
]

function extraOrigins(): string[] {
  return (process.env.PAYMENT_CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

/** Exact preview deployment hosts. No *.vercel.app pattern. Production never includes these. */
function previewDeploymentOrigins(): string[] {
  if (process.env.VERCEL_ENV !== "preview") return []
  const origins: string[] = []
  for (const raw of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    const host = raw?.trim()
    if (!host || /[\s/]/.test(host)) continue
    origins.push(`https://${host}`)
  }
  return origins
}

/**
 * Preview payment returns may use the request Origin only when VERCEL_ENV is preview and
 * that Origin is exactly https://$VERCEL_URL or https://$VERCEL_BRANCH_URL.
 * Any other Origin, and every production request, returns null. The Host header is never read.
 */
export function exactPreviewReturnOrigin(origin: string | null): string | null {
  if (!origin) return null
  return previewDeploymentOrigins().includes(origin) ? origin : null
}

/**
 * Preview return host when the client sent no Origin (the native app does not).
 * Branch host first, then the deployment host. Production returns null so callers stay on the official site.
 */
function previewReturnFallback(): string | null {
  if (process.env.VERCEL_ENV !== "preview") return null
  const host = (process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL || "").trim()
  if (!host || /[\s/]/.test(host)) return null
  return `https://${host}`
}

/** Absolute payment return URL. Preview uses the validated Origin, or https://$VERCEL_BRANCH_URL || https://$VERCEL_URL when Origin is absent. Everything else stays on the official site. */
export function paymentReturnUrl(options: {
  clientUrl: string | undefined
  fallbackPath: string
  requestOrigin: string | null
  isDev: boolean
}): string {
  const { clientUrl, fallbackPath, requestOrigin, isDev } = options
  const previewOrigin = exactPreviewReturnOrigin(requestOrigin) ?? (requestOrigin ? null : previewReturnFallback())
  const pathOf = (value: string) => {
    const parsed = new URL(value, SITE_URL)
    if (isDev && parsed.hostname === "localhost") return parsed.toString()
    const path = `${parsed.pathname}${parsed.search}`
    return previewOrigin ? `${previewOrigin}${path}` : siteUrl(path)
  }
  if (!clientUrl) return previewOrigin ? `${previewOrigin}${fallbackPath}` : siteUrl(fallbackPath)
  try {
    return pathOf(clientUrl)
  } catch {
    return previewOrigin ? `${previewOrigin}${fallbackPath}` : siteUrl(fallbackPath)
  }
}

/** Web app plus the Expo web preview (localhost and *.exp.direct / *.expo.dev tunnels). */
export function isAllowedPaymentOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (
    STATIC_ORIGINS.includes(origin) ||
    extraOrigins().includes(origin) ||
    previewDeploymentOrigins().includes(origin)
  ) {
    return true
  }
  try {
    const url = new URL(origin)
    const host = url.hostname
    if (host === "localhost" || host === "127.0.0.1") return url.protocol === "http:" || url.protocol === "https:"
    if (host.endsWith(".exp.direct") || host.endsWith(".expo.dev") || host.endsWith(".expo.app")) return url.protocol === "https:"
  } catch {
    return false
  }
  return false
}

export function paymentCorsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && isAllowedPaymentOrigin(origin) ? origin : ""
  if (!allow) return { Vary: "Origin" }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, Cache-Control",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}
