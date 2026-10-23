/**
 * Server-only Ziina helpers shared by create-payment, check-payment and the Ziina webhook.
 * The database is only ever updated from a payment intent fetched from Ziina with our API key,
 * never from a client parameter or an unverified webhook body.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { CURRENCIES } from "@/lib/currency"

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

/** Server price: base AED price (lib/currency, 249) per traveller; x2 when the spouse travels too (same rule as payment-step). */
export function priceForApplication(notesRaw: unknown): { amount: number; currency: "AED" } {
  let notes: any = {}
  try { notes = typeof notesRaw === "string" ? JSON.parse(notesRaw) : notesRaw ?? {} } catch { notes = {} }
  const spouse = (notes?.spouseAccompanying ?? notes?.wizard?.spouseAccompanying) === "yes"
  return { amount: CURRENCIES.AED.basePrice * (spouse ? 2 : 1), currency: "AED" }
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
): Promise<{ row: Record<string, any> | null; status: string | null; changed: boolean; error?: string }> {
  const { data: row, error } = await supabase
    .from("visa_applications")
    .select("*")
    .eq("payment_id", intent.id)
    .maybeSingle()
  if (error) return { row: null, status: null, changed: false, error: error.code }
  if (!row) return { row: null, status: null, changed: false }
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
  return { row: updated ?? row, status: next, changed: true }
}
