import { NextResponse } from "next/server"
import crypto from "crypto"
import { contractJson } from "@/lib/shared/wizard-contract"

/**
 * GET /api/app-config
 * The website ↔ app contract as JSON (lib/shared/wizard-contract.ts): price rule, country and option lists,
 * step order, statuses and document types. The EZvisa app can fetch this at launch and prefer it over its bundled
 * copy, so a released build never drifts from the website. Public, cacheable, no personal data.
 */
export const revalidate = 300

export async function GET() {
  const body = contractJson()
  const etag = `"${crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16)}"`
  return NextResponse.json(
    { ...body, hash: etag.replace(/"/g, ""), generatedAt: new Date().toISOString() },
    {
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  )
}
