import { NextResponse } from "next/server"
import { APP_ID, androidFingerprints } from "@/lib/app-links"

// Android App Links for the EZvisa app (see lib/app-links.ts). 404 until ANDROID_CERT_SHA256 is set.
export const dynamic = "force-dynamic"

export function GET() {
  const prints = androidFingerprints()
  if (!prints.length) return new NextResponse("Not found", { status: 404 })
  const body = [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: prints } }]
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } })
}
