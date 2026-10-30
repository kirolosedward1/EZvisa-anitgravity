/**
 * Server-only Ziina helpers shared by create-payment, check-payment and the Ziina webhook.
 * The database is only ever updated from a payment intent fetched from Ziina with our API key,
 * never from a client parameter or an unverified webhook body.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { priceForTravellers } from "@/lib/currency"
import { pricedApplicants } from "@/lib/application-notes"

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ziina payment intent statuses that can still be paid (docs.ziina.com/api-reference/payment-intent). */
export const OPEN_INTENT_STATUSES = ["requires_payment_instrument", "requires_user_action", "pending"]

export type ZiinaIntent = {
  id: string
  status: string
  amount?: number
  currency_code?: string
  redirect_url?: string
  success_url?: string
  cancel_url?: string
  failure_url?: string
  [key: string]: unknown
}

/** Server price from the applicant count stored on the application. A spouse makes it 2, so AED 498. */
export function priceForApplication(notesRaw: unknown): { amount: number; currency: "AED" } {
  let notes: any = {}
  try { notes = typeof notesRaw === "string" ? JSON.parse(notesRaw) : notesRaw ?? {} } catch { notes = {} }
  const count = pricedApplicants(notes)
  return { amount: priceForTravellers(count === 2 ? "yes" : "no"), currency: "AED" }
}

export const isPaidStatus = (s: unknown) => ["paid", "completed"].includes(String(s ?? "").toLowerCase())

/** Ziina intent status -> visa_applications.payment_status. Open intents stay "pending". */
export function mapIntentStatus(status: string): string {
  const s = status.toLowerCase()
  if (s === "completed") return "paid"
  if (s === "failed") return "failed"
  return "pending"
}

export async function fetchIntent(id: string): Promise<ZiinaIntent | null> {
  const apiKey = process.env.ZIINA_API_KEY
  if (!apiKey || !id) return null
  const res = await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  return data && typeof data.id === "string" && typeof data.status === "string" ? data : null
}

export function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Writes the verified intent status to the application linked to it (payment_id = intent.id).
 * Never downgrades a paid application. Returns the stored status and whether it changed.
 */
export async function applyIntentStatus(
  supabase: SupabaseClient,
  intent: ZiinaIntent,
  depth = 0,
): Promise<{ row: Record<string, any> | null; status: string | null; changed: boolean; error?: string }> {
  const { data: row, error } = await supabase
    .from("visa_applications")
    .select("*")
    .eq("payment_id", intent.id)
    .maybeSingle()
  if (error) return { row: null, status: null, changed: false, error: error.code }
  if (!row) {
    // An older intent for the application (replaced by a newer one, e.g. a second tab or the app vs the website)
    // was paid. create-payment records every intent id it issues in additional_notes.paymentIntentIds.
    const older = await findByEarlierIntent(supabase, intent.id)
    if (older.error) return { row: null, status: null, changed: false, error: older.error }
    if (!older.row) return { row: null, status: null, changed: false }
    if (mapIntentStatus(intent.status) !== "paid") return { row: older.row, status: older.row.payment_status, changed: false }
    if (isPaidStatus(older.row.payment_status)) {
      // Both an earlier and the current intent were paid: the customer was charged twice. Log it for a refund.
      console.error(`[payment] DOUBLE PAYMENT: application ${older.row.id} already paid via ${older.row.payment_id ?? "?"}; earlier intent ${intent.id} was also paid. Refund one.`)
      return { row: older.row, status: older.row.payment_status, changed: false }
    }
    if (depth > 0) return { row: older.row, status: older.row.payment_status, changed: false }
    // Re-point the application at the intent that was actually paid (only if nobody changed the link meanwhile),
    // then apply its status normally (once: depth guard).
    let relink = supabase.from("visa_applications").update({ payment_id: intent.id }).eq("id", older.row.id)
    relink = older.row.payment_id == null ? relink.is("payment_id", null) : relink.eq("payment_id", older.row.payment_id)
    const { data: relinked, error: relinkError } = await relink.select("id")
    if (relinkError) return { row: older.row, status: older.row.payment_status, changed: false, error: relinkError.code }
    if (!relinked?.length) return { row: older.row, status: older.row.payment_status, changed: false }
    console.info(`[payment] ${older.row.id} relinked to paid earlier intent ${intent.id} (was ${older.row.payment_id ?? "null"})`)
    return applyIntentStatus(supabase, intent, depth + 1)
  }
  const next = mapIntentStatus(intent.status)
  if (isPaidStatus(row.payment_status) || row.payment_status === next) return { row, status: row.payment_status, changed: false }
  const { data: updated, error: upError } = await supabase
    .from("visa_applications")
    .update({
      payment_status: next,
      payment_amount: typeof intent.amount === "number" ? intent.amount / 100 : row.payment_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("payment_id", intent.id)
    .select()
    .maybeSingle()
  if (upError) return { row, status: row.payment_status, changed: false, error: upError.code }
  // Audit trail (no personal data): every stored payment status change, whichever path made it.
  console.info(`[payment] ${row.id} ${row.payment_status ?? "null"} -> ${next} (intent ${intent.id}, ziina ${intent.status})`)
  const stored = updated ?? row
  // Email on the transition, whichever path stored it (webhook, check-payment polling on /payment-success, or the
  // reconcile cron). Previously only the webhook emailed, and it usually arrived after check-payment had already
  // stored "paid", so the confirmation email was skipped. EmailService dedupes per (event, application).
  if (next === "paid" || next === "failed") await sendPaymentEmail(stored, intent, next)
  // Activity log (lib/application-events-server.ts; best effort, never throws).
  if (next === "paid" || next === "failed") {
    const { recordApplicationEvent } = await import("@/lib/application-events-server")
    await recordApplicationEvent(row.id, next === "paid" ? "payment_received" : "payment_failed", next === "paid" ? { amount: stored.payment_amount ?? null } : {}, "system", supabase)
  }
  // Paid: the people on the case become saved travellers of the account (lib/travellers.ts; never throws).
  if (next === "paid") {
    const { rememberTravellersFromApplication } = await import("@/lib/travellers")
    await rememberTravellersFromApplication(stored, supabase)
  }
  return { row: stored, status: next, changed: true }
}

async function sendPaymentEmail(application: Record<string, any>, intent: ZiinaIntent, status: "paid" | "failed") {
  if (!application.email) return
  try {
    const { EmailService } = await import("@/lib/email/service")
    await EmailService.sendEvent({
      event: status === "paid" ? "payment.completed" : "payment.failed",
      entityId: application.id,
      recipient: application.email,
      language: application.preferred_language === "ar" ? "ar" : "en",
      data: {
        id: application.id,
        trackingToken: application.tracking_token,
        firstName: application.full_name?.split(" ")[0] || "Customer",
        destination: application.destination_country || "",
        paymentAmount: typeof intent.amount === "number" ? intent.amount / 100 : 0,
        currency: intent.currency_code || "AED",
      },
    })
  } catch (e) {
    console.error("[payment] could not send payment email", application.id, e instanceof Error ? e.message : e)
  }
}

async function findByEarlierIntent(supabase: SupabaseClient, intentId: string): Promise<{ row: Record<string, any> | null; error?: string }> {
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(intentId)) return { row: null }
  const { data, error } = await supabase
    .from("visa_applications")
    .select("*")
    .like("additional_notes", `%${intentId}%`)
    .limit(5)
  if (error) return { row: null, error: error.code }
  const match = (data ?? []).find((r) => {
    try { const n = JSON.parse(r.additional_notes ?? "{}"); return Array.isArray(n?.paymentIntentIds) && n.paymentIntentIds.includes(intentId) } catch { return false }
  })
  return { row: match ?? null }
}
