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

/** This project's Vercel preview hosts only. Production stays the exact ezvisa.net origins above. */
const PREVIEW_HOST =
  /^e-zvisa-anitgravit[a-z0-9-]*-kirolosedward1-gmailcoms-projects\.vercel\.app$/

function extraOrigins(): string[] {
  return (process.env.PAYMENT_CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function deploymentOrigins(): string[] {
  const origins: string[] = []
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    const value = host?.trim()
    if (!value) continue
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
    try {
      const url = new URL(withProtocol)
      if (url.protocol !== "https:") continue
      origins.push(`https://${url.host}`)
    } catch {
      continue
    }
  }
  return origins
}

function isProjectPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false
    if (url.pathname !== "/" || url.search || url.hash) return false
    return PREVIEW_HOST.test(url.hostname)
  } catch {
    return false
  }
}

/** Web app plus the Expo web preview (localhost and *.exp.direct / *.expo.dev tunnels). */
export function isAllowedPaymentOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (
    STATIC_ORIGINS.includes(origin) ||
    extraOrigins().includes(origin) ||
    deploymentOrigins().includes(origin) ||
    isProjectPreviewOrigin(origin)
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
