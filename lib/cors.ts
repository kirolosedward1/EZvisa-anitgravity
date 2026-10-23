import { SITE_URL } from "@/lib/site-url"

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}
