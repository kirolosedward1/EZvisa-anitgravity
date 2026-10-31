"use server"

// Refunds: request (anyone who can view cases, except Finance who decide directly), approve with an amount or decline
// (Finance and Admin), and mark sent once issued in the payment gateway's dashboard. Money is never edited inline:
// every step needs a reason or note and writes an audit row. The payment gateway itself is not called from here.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { recordAudit } from "@/lib/staff/audit"
import { REFUND_REASONS } from "@/lib/staff/refunds"
import { can } from "@/lib/staff/roles"
import { getStaff, missingTable } from "@/lib/staff/session"

export type RefundResult = { ok: true; message: string } | { ok: false; error: string }
const NEEDS_008 = "Refunds need migration 008 (refund_requests)."

function refresh() {
  revalidatePath("/admin/payments")
  revalidatePath("/admin/overview")
}

/** Creates a refund request, or (Finance/Admin) records an approved refund in one step. */
export async function requestRefund(input: { caseId: string; amount: number; reason: string; note: string; policy: string; stage: string; approveNow: boolean }): Promise<RefundResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  const parsed = z
    .object({
      caseId: staff.demo ? z.string().min(1) : z.string().regex(UUID_RE),
      amount: z.number().min(1).max(100000),
      reason: z.enum(REFUND_REASONS),
      note: z.string().trim().max(1000),
      policy: z.string().max(80),
      stage: z.string().max(40),
      approveNow: z.boolean(),
    })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: !input.reason ? "Choose a reason." : "Enter an amount of at least 1 AED and a reason." }
  const v = parsed.data
  const approve = v.approveNow && can(staff.role, "refund")
  if (staff.demo) return { ok: true, message: approve ? `Demo: refund of ${v.amount.toFixed(2)} AED approved. Nothing was saved.` : `Demo: refund request of ${v.amount.toFixed(2)} AED sent to Finance. Nothing was saved.` }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: row } = await client.from("visa_applications").select("payment_status, payment_amount, payment_id, full_name").eq("id", v.caseId).maybeSingle()
  if (!row) return { ok: false, error: "Case not found." }
  if (!["paid", "completed"].includes((row.payment_status ?? "").toLowerCase())) return { ok: false, error: "This case has no completed payment to refund." }
  const paid = Number(row.payment_amount ?? 0)
  if (v.amount > paid) return { ok: false, error: `Amount must be between 1 and ${paid} AED.` }

  const now = new Date().toISOString()
  const { data, error } = await client
    .from("refund_requests")
    .insert({
      application_id: v.caseId,
      payment_ref: row.payment_id,
      amount_paid: paid,
      amount: v.amount,
      reason: v.reason,
      policy: v.policy,
      stage_at_request: v.stage,
      note: v.note || null,
      status: approve ? "approved" : "requested",
      requested_by: staff.name,
      ...(approve ? { decided_by: staff.name, decided_at: now } : {}),
    })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: missingTable(error) ? NEEDS_008 : "The refund could not be recorded." }
  await recordAudit(staff, {
    action: approve ? `Refund ${v.amount.toFixed(2)} AED approved, reason "${v.reason}"` : `Refund ${v.amount.toFixed(2)} AED requested, reason "${v.reason}"`,
    type: "payment",
    targetTable: "visa_applications",
    targetId: v.caseId,
    field: `refund_requests.${data.id}`,
    before: { paid },
    after: { amount: v.amount, reason: v.reason, policy: v.policy, status: approve ? "approved" : "requested", note: v.note || null },
    notified: "No",
  }, client)
  refresh()
  return {
    ok: true,
    message: approve
      ? `Refund of ${v.amount.toFixed(2)} AED approved and logged. Issue it in the payment gateway dashboard, then mark it sent here.`
      : `Refund request of ${v.amount.toFixed(2)} AED sent to Finance with your note.`,
  }
}

/** Finance/Admin decision on a request: approve (amount may change) or decline; or mark an approved refund as sent. */
export async function decideRefund(input: { id: string; action: "approve" | "decline" | "sent"; amount?: number; gatewayRef?: string }): Promise<RefundResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "refund")) return { ok: false, error: "Refunds need the Finance role or Admin." }
  const parsed = z
    .object({ id: staff.demo ? z.string().min(1) : z.string().uuid(), action: z.enum(["approve", "decline", "sent"]), amount: z.number().min(0).max(100000).optional(), gatewayRef: z.string().trim().max(120).optional() })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: "That decision is not valid." }
  const v = parsed.data
  if (staff.demo) return { ok: true, message: v.action === "approve" ? "Demo: refund approved. Nothing was saved." : v.action === "decline" ? "Demo: refund declined. Nothing was saved." : "Demo: marked as sent. Nothing was saved." }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: r, error: readErr } = await client.from("refund_requests").select("*").eq("id", v.id).maybeSingle()
  if (readErr) return { ok: false, error: missingTable(readErr) ? NEEDS_008 : "The request could not be read." }
  if (!r) return { ok: false, error: "Refund request not found." }
  const expected = v.action === "sent" ? "approved" : "requested"
  if (r.status !== expected) return { ok: false, error: `This refund is already ${r.status}.` }
  if (v.action === "approve" && (v.amount === undefined || v.amount < 1 || v.amount > Number(r.amount_paid))) return { ok: false, error: `Amount must be between 1 and ${r.amount_paid} AED.` }
  if (v.action === "sent" && !v.gatewayRef) return { ok: false, error: "Enter the payment gateway's refund reference." }

  const patch =
    v.action === "approve"
      ? { status: "approved", amount: v.amount, decided_by: staff.name, decided_at: new Date().toISOString() }
      : v.action === "decline"
        ? { status: "declined", decided_by: staff.name, decided_at: new Date().toISOString() }
        : { status: "sent", gateway_ref: v.gatewayRef }
  const { data: updated, error } = await client.from("refund_requests").update(patch).eq("id", v.id).eq("status", expected).select("id")
  if (error || !updated?.length) return { ok: false, error: "Someone decided this a moment ago. Reload." }
  await recordAudit(staff, {
    action: v.action === "approve" ? `Refund ${Number(v.amount).toFixed(2)} AED approved (requested by ${r.requested_by})` : v.action === "decline" ? `Refund declined under policy (requested by ${r.requested_by})` : `Refund marked sent, gateway ref ${v.gatewayRef}`,
    type: "payment",
    targetTable: "visa_applications",
    targetId: r.application_id,
    field: `refund_requests.${r.id}`,
    before: { status: r.status, amount: r.amount },
    after: { ...patch },
    notified: "No",
  }, client)
  refresh()
  return {
    ok: true,
    message:
      v.action === "approve"
        ? `Approved ${Number(v.amount).toFixed(2)} AED. Issue it in the payment gateway dashboard, then mark it sent.`
        : v.action === "decline"
          ? `Declined. Tell ${r.requested_by} and the customer the policy reason.`
          : "Marked as sent. Refunds usually reach the card in 5 to 10 business days.",
  }
}
