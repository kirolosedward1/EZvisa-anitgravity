import { NextResponse } from "next/server"

/**
 * Receives Content-Security-Policy-Report-Only violation reports (report-uri and Reporting API).
 * Logs a compact line to the Vercel function logs; nothing is stored.
 * URLs are reduced to origin + path with secret segments and query strings removed, so a tracking link
 * (/track/<token> is the authorization for an application) never lands in the logs.
 */
const MAX_BODY = 64 * 1024
const MAX_REPORTS = 20

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined
  // Non-URL values ("inline", "eval", "data", a bare scheme) are safe to log as-is.
  if (!/^https?:\/\//i.test(value)) return value.slice(0, 80)
  try {
    const u = new URL(value)
    const path = u.pathname
      .replace(/^(\/ar)?\/track\/[^/]+/, "$1/track/[token]")
      .replace(/^(\/ar)?\/(reset-password|auth)\/[^/]+/, "$1/$2/[redacted]")
    return `${u.origin}${path}`
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0)
  if (length > MAX_BODY) return new NextResponse(null, { status: 413 })
  try {
    const text = await request.text()
    if (text.length > MAX_BODY) return new NextResponse(null, { status: 413 })
    const body = JSON.parse(text || "null")
    const reports = Array.isArray(body) ? body.map((r) => r?.body ?? r) : [body?.["csp-report"] ?? body]
    for (const r of reports.slice(0, MAX_REPORTS)) {
      const directive = r?.["violated-directive"] ?? r?.effectiveDirective ?? r?.["effective-directive"]
      const blocked = safeUrl(r?.["blocked-uri"] ?? r?.blockedURL)
      const page = safeUrl(r?.["document-uri"] ?? r?.documentURL)
      console.warn("[csp-report]", JSON.stringify({ directive, blocked, page }))
    }
  } catch {
    // ignore malformed reports
  }
  return new NextResponse(null, { status: 204 })
}
