import { NextResponse } from "next/server"

/**
 * Receives Content-Security-Policy-Report-Only violation reports (report-uri and Reporting API).
 * Logs a compact line to the Vercel function logs; nothing is stored.
 */
export async function POST(request: Request) {
  try {
    const text = (await request.text()).slice(0, 8000)
    const body = JSON.parse(text || "null")
    const reports = Array.isArray(body) ? body.map((r) => r?.body ?? r) : [body?.["csp-report"] ?? body]
    for (const r of reports.slice(0, 20)) {
      const directive = r?.["violated-directive"] ?? r?.effectiveDirective ?? r?.["effective-directive"]
      const blocked = r?.["blocked-uri"] ?? r?.blockedURL
      const page = r?.["document-uri"] ?? r?.documentURL
      console.warn("[csp-report]", JSON.stringify({ directive, blocked, page }))
    }
  } catch {
    // ignore malformed reports
  }
  return new NextResponse(null, { status: 204 })
}
