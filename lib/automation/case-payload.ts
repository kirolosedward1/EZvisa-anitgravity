/**
 * What the file preparation automation may read about one case, and whether it may at all. Server only.
 * Only paid, open cases at Preparation (or later, before Ready is delivered) are readable; documents come as approved
 * uploads with 15-minute signed links. Nothing here is written.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { getReference, isPaid } from "@/lib/application-status"
import { toDocumentReviews } from "@/lib/document-reviews"
import { DOC_BUCKET, parseNotes, requirementsFor } from "@/lib/shared/wizard-contract"
import { PART_KEYS } from "@/lib/automation/make"

export const READABLE_STATUSES = ["preparation", "approved", "reviewing", "awaiting_documents", "submitted", "ready"]

export type CaseAccess = { ok: true; row: Record<string, unknown>; reference: string } | { ok: false; status: number; error: string }

export async function caseForAutomation(client: SupabaseClient, id: string): Promise<CaseAccess> {
  const { data: row, error } = await client.from("visa_applications").select("*").eq("id", id).maybeSingle()
  if (error) return { ok: false, status: 500, error: "read_failed" }
  if (!row) return { ok: false, status: 404, error: "not_found" }
  const r = row as Record<string, unknown>
  if (!isPaid(r as never)) return { ok: false, status: 409, error: "not_paid" }
  if (!READABLE_STATUSES.includes(String(r.application_status ?? "").toLowerCase())) return { ok: false, status: 409, error: "not_in_preparation" }
  return { ok: true, row: r, reference: getReference(r.tracking_token as string | null) || `EZ-${id.slice(0, 8).toUpperCase()}` }
}

/** Pure: the answers the agent works from (wizard answers over the older top-level keys; empty strings dropped). */
export function answersFrom(notesRaw: unknown): Record<string, unknown> {
  const notes = parseNotes(notesRaw as string | null) as Record<string, unknown>
  const top: Record<string, unknown> = {}
  for (const k of ["maritalStatus", "employmentStatus", "jobTitle", "companyName", "monthlySalary", "spouseAccompanying"]) if (notes[k]) top[k] = notes[k]
  const wizard = (notes.wizard ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...top }
  for (const [k, v] of Object.entries(wizard)) if (v !== "" && v !== null && v !== undefined && k !== "email") out[k] = v
  return out
}

export async function buildCasePayload(client: SupabaseClient, id: string, row: Record<string, unknown>, reference: string) {
  const notesRaw = row.additional_notes as string | null
  const answers = answersFrom(notesRaw)
  const { data: reviewRows } = await client.from("document_reviews").select("document_type, status, note, reviewed_at").eq("application_id", id)
  const reviews = toDocumentReviews(reviewRows ?? [])
  const latest = new Map<string, { path: string; name: string; at: string }>()
  // Upload records with their storage paths (the customer-facing views never get the path).
  for (const u of (parseNotes(notesRaw).uploads ?? []) as { type: string; path?: string; name: string; at: string }[]) {
    if (typeof u.path !== "string" || !u.path.startsWith(`${id}/`)) continue
    const prev = latest.get(u.type)
    if (!prev || u.at > prev.at) latest.set(u.type, { path: u.path, name: u.name, at: u.at })
  }
  const documents = await Promise.all(
    [...latest.entries()]
      .filter(([type]) => reviews[type]?.status === "approved")
      .map(async ([type, u]) => {
        const { data } = await client.storage.from(DOC_BUCKET).createSignedUrl(u.path, 15 * 60)
        return { type, file_name: u.name, uploaded_at: u.at, url: data?.signedUrl ?? null }
      }),
  )
  const employment = (answers.employmentStatus as string | undefined) ?? null
  const checklist = requirementsFor(employment).map((r) => ({
    document_type: r.document_type,
    title: r.title,
    description: r.description,
    prepared_by_ezvisa: r.provided_by_ezvisa,
    status: r.provided_by_ezvisa ? "to_prepare" : reviews[r.document_type]?.status === "approved" ? "provided" : "missing",
  }))
  const { data: partRows } = await client.from("file_parts").select("part, state, file_name, updated_by, updated_at").eq("application_id", id)
  return {
    application: {
      id,
      reference,
      full_name: row.full_name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      nationality: row.nationality ?? null,
      destination_country: row.destination_country ?? null,
      travel_purpose: row.travel_purpose ?? null,
      entry_date: row.entry_date ?? answers.travelStartDate ?? null,
      exit_date: row.exit_date ?? answers.travelEndDate ?? null,
      date_of_birth: row.date_of_birth ?? answers.dateOfBirth ?? null,
      passport_number: row.passport_number ?? answers.passportNumber ?? null,
      status: row.application_status ?? null,
    },
    answers,
    documents,
    checklist,
    parts: PART_KEYS.map((p) => {
      const existing = ((partRows ?? []) as { part: string; state: string; file_name: string | null; updated_by: string | null; updated_at: string }[]).find((x) => x.part === p)
      return { part: p, state: existing?.state ?? "todo", file_name: existing?.file_name ?? null, updated_by: existing?.updated_by ?? null, updated_at: existing?.updated_at ?? null }
    }),
    links_expire_in_seconds: 900,
  }
}
