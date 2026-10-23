import { NextResponse } from "next/server"
import { applyIntentStatus, fetchIntent, serviceClient } from "@/lib/ziina"

/**
 * GET /api/cron/reconcile-payments (Vercel Cron, see vercel.json)
 * Safety net for missed webhooks and closed apps: every application with a linked Ziina payment that is not yet
 * paid (updated in the last 7 days) is checked with Ziina and the verified status is stored.
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; without that secret configured the route refuses to run.
 */
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await supabase
    .from("visa_applications")
    .select("id, payment_id, payment_status")
    .not("payment_id", "is", null)
    .not("payment_status", "in", "(paid,completed,refunded)")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: "Could not load applications" }, { status: 500 })

  let checked = 0, changed = 0, failed = 0
  for (const row of rows ?? []) {
    checked++
    const intent = await fetchIntent(row.payment_id as string)
    if (!intent) { failed++; continue }
    const result = await applyIntentStatus(supabase, intent)
    if (result.error) failed++
    else if (result.changed) changed++
  }
  console.info(`[payment] reconcile: checked ${checked}, changed ${changed}, failed ${failed}`)
  return NextResponse.json({ checked, changed, failed })
}
