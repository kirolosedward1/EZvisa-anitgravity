"use server"

// Insurance quotes: send a quote (price typed from the insurer's rates), remind, record the customer's answer, and
// issue the policy (PDF upload). Payments permission (Admin, Finance). No insurer is called from here.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { withInsurancePreference } from "@/lib/insurance"
import { DOC_BUCKET } from "@/lib/shared/wizard-contract"
import { recordAudit } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff, missingTable } from "@/lib/staff/session"

export type InsuranceResult = { ok: true; message: string } | { ok: false; error: string }
const NEEDS_009 = "Insurance quotes need migration 009 (insurance_quotes)."

async function writer() {
  const staff = await getStaff()
  if (!staff) return { error: "Your session has ended. Sign in again." } as const
  if (!can(staff.role, "pay")) return { error: "Insurance needs the Finance role or Admin." } as const
  return { staff } as const
}

export async function sendQuote(input: { caseId: string; price: number; insurer: string; cover: string }): Promise<InsuranceResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error! }
  const parsed = z.object({ caseId: w.staff.demo ? z.string().min(1) : z.string().regex(UUID_RE), price: z.number().min(1).max(99999), insurer: z.string().trim().max(80), cover: z.string().trim().max(200) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: "Enter the price in AED." }
  const v = parsed.data
  if (w.staff.demo) return { ok: true, message: `Demo: quote of ${v.price} AED recorded. Nothing was saved.` }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { error } = await client.from("insurance_quotes").upsert({ application_id: v.caseId, price: v.price, insurer: v.insurer || null, cover: v.cover || null, status: "sent", sent_at: new Date().toISOString(), updated_by: w.staff.name }, { onConflict: "application_id" })
  if (error) return { ok: false, error: missingTable(error) ? NEEDS_009 : "The quote could not be saved." }
  await recordAudit(w.staff, { action: `Insurance quote ${v.price} AED sent${v.insurer ? ` (${v.insurer})` : ""}`, type: "insurance", targetTable: "visa_applications", targetId: v.caseId, field: "insurance_quotes", after: v, notified: "WhatsApp, sent by staff" }, client)
  revalidatePath("/admin/insurance")
  return { ok: true, message: `Quote of ${v.price} AED recorded. Send it on WhatsApp with the button.` }
}

export async function setQuoteStatus(input: { caseId: string; status: "accepted" | "declined" | "reminded" }): Promise<InsuranceResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error! }
  const parsed = z.object({ caseId: w.staff.demo ? z.string().min(1) : z.string().regex(UUID_RE), status: z.enum(["accepted", "declined", "reminded"]) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: "That change is not valid." }
  const v = parsed.data
  if (w.staff.demo) return { ok: true, message: `Demo: marked ${v.status}. Nothing was saved.` }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const patch = v.status === "reminded" ? { reminded_at: new Date().toISOString() } : { status: v.status, decided_at: new Date().toISOString(), updated_by: w.staff.name }
  const { data, error } = await client.from("insurance_quotes").update(patch).eq("application_id", v.caseId).select("id")
  if (error) return { ok: false, error: missingTable(error) ? NEEDS_009 : "The quote could not be updated." }
  if (!data?.length) return { ok: false, error: "No quote was sent for this case yet." }
  if (v.status === "declined") {
    // The customer will bring their own policy: their dashboard shows "I'll provide my own".
    const { data: row } = await client.from("visa_applications").select("additional_notes").eq("id", v.caseId).maybeSingle()
    try {
      await client.from("visa_applications").update({ additional_notes: withInsurancePreference(row?.additional_notes, "own") }).eq("id", v.caseId)
      await recordApplicationEvent(v.caseId, "insurance_preference", { preference: "own" }, "team", client)
    } catch {
      // malformed notes are left untouched
    }
  }
  await recordAudit(w.staff, { action: v.status === "reminded" ? "Insurance quote reminder sent" : `Insurance quote ${v.status} by the customer`, type: "insurance", targetTable: "visa_applications", targetId: v.caseId, field: "insurance_quotes.status", after: patch, notified: v.status === "declined" ? "Customer dashboard" : "No" }, client)
  revalidatePath("/admin/insurance")
  return { ok: true, message: v.status === "declined" ? "Declined. The case now shows the customer is providing their own policy." : v.status === "accepted" ? "Accepted. Issue the policy when the insurer sends it." : "Reminder noted." }
}

export async function issuePolicy(form: FormData): Promise<InsuranceResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error! }
  const caseId = String(form.get("caseId") ?? "")
  const file = form.get("file")
  if (!(file instanceof File) || !/\.pdf$/i.test(file.name)) return { ok: false, error: "Upload the policy as a PDF." }
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "The PDF is over 10 MB." }
  if (w.staff.demo) return { ok: true, message: "Demo: policy issued. Nothing was stored." }
  if (!UUID_RE.test(caseId)) return { ok: false, error: "Invalid case." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const path = `${caseId}/insurance_policy.pdf`
  const { error: up } = await client.storage.from(DOC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: "application/pdf", upsert: true })
  if (up) return { ok: false, error: "The upload failed." }
  const { data, error } = await client.from("insurance_quotes").update({ status: "issued", policy_path: path, decided_at: new Date().toISOString(), updated_by: w.staff.name }).eq("application_id", caseId).select("id")
  if (error || !data?.length) return { ok: false, error: missingTable(error) ? NEEDS_009 : "Record the quote first." }
  await recordAudit(w.staff, { action: "Insurance policy issued and attached to the case", type: "insurance", targetTable: "visa_applications", targetId: caseId, field: "insurance_quotes.policy_path", after: { file: file.name }, notified: "No" }, client)
  revalidatePath("/admin/insurance")
  return { ok: true, message: "Policy issued and attached to the case file. Send it to the customer on WhatsApp." }
}
