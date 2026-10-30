/**
 * The one way the console changes data: `staffWrite` checks the permission, runs the write with the service role and
 * records the audit_events row (supabase/migrations/005_staff_console.sql) with before and after values, the device
 * and the request id. The demo staff session never writes. Server only.
 */
import { headers } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { serviceClient } from "@/lib/applications"
import { can, type Permission } from "@/lib/staff/roles"
import { missingTable, type Staff } from "@/lib/staff/session"
import { deviceLabel } from "@/lib/staff/audit-format"

export { deviceLabel }

export type AuditType =
  | "document" | "message" | "payment" | "stage" | "upload" | "settings" | "team" | "assignment" | "edit" | "export"
  | "sla" | "sign_in" | "reversal" | "note" | "appointment" | "insurance" | "customer"

export type AuditInput = {
  action: string
  type: AuditType
  targetTable?: string
  targetId?: string
  targetLabel?: string
  field?: string
  before?: unknown
  after?: unknown
  /** Who was told, e.g. "WhatsApp and email" or "No". */
  notified?: string
  /** Undo is offered for assignments, notes, settings and role changes only. */
  reversible?: boolean
  reversalOf?: number
}

export type WriteResult<T> = { ok: true; value: T; demo?: boolean } | { ok: false; status: number; error: string }

async function requestContext(): Promise<{ device: string; requestId: string }> {
  try {
    const h = await headers()
    return { device: deviceLabel(h.get("user-agent")), requestId: (h.get("x-vercel-id") ?? "").slice(0, 120) }
  } catch {
    return { device: "", requestId: "" }
  }
}

/** Inserts one audit row. Returns false when it could not be stored (logged, never thrown). */
export async function recordAudit(staff: Staff, input: AuditInput, client?: SupabaseClient | null): Promise<boolean> {
  if (staff.demo) return true
  const writer = client ?? serviceClient()
  if (!writer) return false
  const { device, requestId } = await requestContext()
  try {
    const { error } = await writer.from("audit_events").insert({
      actor_type: "staff",
      actor_id: staff.staffId,
      actor_name: staff.name,
      action: input.action.slice(0, 500),
      type: input.type,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      target_label: input.targetLabel ?? null,
      field: input.field ?? null,
      before: input.before === undefined ? null : input.before,
      after: input.after === undefined ? null : input.after,
      notified: input.notified ?? null,
      device: device || null,
      request_id: requestId || null,
      reversible: input.reversible ?? false,
      reversal_of: input.reversalOf ?? null,
    })
    if (error) {
      console.error(missingTable(error) ? "[audit] audit_events missing: apply migration 005" : `[audit] insert failed: ${error.code}`)
      return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Permission check, write, audit. The write gets the service-role client and returns the audit's after value (and
 * optionally a before value read inside the write). Demo sessions get { ok: true, demo: true } and nothing happens.
 */
export async function staffWrite<T>(
  staff: Staff,
  permission: Permission,
  audit: AuditInput,
  write: (client: SupabaseClient) => Promise<{ ok: true; value: T; before?: unknown; after?: unknown } | { ok: false; status?: number; error: string }>,
): Promise<WriteResult<T | null>> {
  if (!can(staff.role, permission)) return { ok: false, status: 403, error: "Your role cannot do this." }
  if (staff.demo) return { ok: true, value: null, demo: true }
  const client = serviceClient()
  if (!client) return { ok: false, status: 500, error: "The database is not configured." }
  const result = await write(client)
  if (!result.ok) return { ok: false, status: result.status ?? 400, error: result.error }
  await recordAudit(
    staff,
    { ...audit, before: result.before ?? audit.before, after: result.after ?? audit.after },
    client,
  )
  return { ok: true, value: result.value }
}
