import { NextResponse } from "next/server"
import { APP_ID, APP_LINK_PATHS, appleTeamId } from "@/lib/app-links"

// iOS universal links for the EZvisa app (see lib/app-links.ts). 404 until APPLE_TEAM_ID is set.
export const dynamic = "force-dynamic"

export function GET() {
  const team = appleTeamId()
  if (!/^[A-Z0-9]{10}$/.test(team)) return new NextResponse("Not found", { status: 404 })
  const paths = APP_LINK_PATHS.flatMap((p) => [p, `/ar${p}`])
  const body = { applinks: { details: [{ appIDs: [`${team}.${APP_ID}`], components: paths.map((p) => ({ "/": p })) }] } }
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } })
}
