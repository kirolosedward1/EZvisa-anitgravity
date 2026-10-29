import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

// A database compare-and-set serializes checkout across Vercel instances, including
// when Redis is unavailable. A crashed request releases itself after two minutes.
const LOCK_KEY = "paymentCreationLock"
const LOCK_MS = 120_000

type LockResult =
  | { acquired: true; release: () => Promise<void> }
  | { acquired: false; status: 404 | 423 | 503 }

function notesOf(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw)
    if (value && typeof value === "object" && !Array.isArray(value)) return value
  } catch { /* Preserve older free-text notes. */ }
  return { legacyNotes: raw }
}

function compare(query: any, row: { additional_notes: string | null; updated_at: string | null }) {
  query = row.additional_notes == null ? query.is("additional_notes", null) : query.eq("additional_notes", row.additional_notes)
  return row.updated_at == null ? query.is("updated_at", null) : query.eq("updated_at", row.updated_at)
}

export async function claimPaymentCreation(client: SupabaseClient, applicationId: string): Promise<LockResult> {
  const token = randomUUID()
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error } = await client.from("visa_applications")
      .select("additional_notes, updated_at").eq("id", applicationId).maybeSingle()
    if (error) return { acquired: false, status: 503 }
    if (!row) return { acquired: false, status: 404 }
    const notes = notesOf(row.additional_notes)
    const lock = notes[LOCK_KEY] as { expiresAt?: number } | undefined
    if (typeof lock?.expiresAt === "number" && lock.expiresAt > Date.now()) return { acquired: false, status: 423 }
    notes[LOCK_KEY] = { token, expiresAt: Date.now() + LOCK_MS }
    const query = client.from("visa_applications").update({
      additional_notes: JSON.stringify(notes), updated_at: new Date().toISOString(),
    }).eq("id", applicationId)
    const { data: changed, error: updateError } = await compare(query, row).select("id")
    if (updateError) return { acquired: false, status: 503 }
    if (changed?.length) {
      return { acquired: true, release: async () => {
        // Preserve notes/payment IDs written while the checkout was being created.
        try {
          for (let retry = 0; retry < 3; retry++) {
            const { data: latest, error: readError } = await client.from("visa_applications")
              .select("additional_notes, updated_at").eq("id", applicationId).maybeSingle()
            if (readError || !latest) return
            const current = notesOf(latest.additional_notes)
            if ((current[LOCK_KEY] as { token?: string } | undefined)?.token !== token) return
            delete current[LOCK_KEY]
            const update = client.from("visa_applications").update({
              additional_notes: JSON.stringify(current), updated_at: new Date().toISOString(),
            }).eq("id", applicationId)
            const result = await compare(update, latest).select("id")
            if (result.error || result.data?.length) return
          }
        } catch { console.error("[payment] Checkout lock release failed; it will expire automatically") }
      } }
    }
  }
  return { acquired: false, status: 423 }
}
