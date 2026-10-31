/**
 * PUT /api/automation/cases/:id/parts: the automation writes its drafts back. Auth: Bearer MAKE_API_SECRET.
 * Each part is saved as a "draft" on the File preparation board for a specialist to review; a part a person already
 * marked done is never overwritten. The summary (status, missing information, warnings, Drive folder) becomes an
 * internal note on the case. Everything is logged as the automation.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { DOC_BUCKET } from "@/lib/shared/wizard-contract"
import { isAutomationRequest, PART_KEYS, type AutomationPart } from "@/lib/automation/make"
import { caseForAutomation } from "@/lib/automation/case-payload"
import { composePartBody, composeNote } from "@/lib/automation/compose"

export const dynamic = "force-dynamic"

const url = z.string().url().max(500).refine((u) => u.startsWith("https://"), "https only")
const part = z.object({
  body: z.string().max(40000).optional(),
  summary: z.string().max(4000).optional(),
  drive_file_url: url.optional(),
  file_path: z.string().max(300).optional(),
  items: z.array(z.object({ item: z.string().max(300), status: z.enum(["provided", "prepared", "missing"]) })).max(60).optional(),
}).passthrough()
const schema = z.object({
  status: z.enum(["ready_for_review", "needs_info", "to_book_by_staff"]).optional(),
  main_destination: z.string().max(60).optional(),
  missing_info: z.array(z.string().max(300)).max(40).optional(),
  warnings: z.array(z.string().max(500)).max(40).optional(),
  notes_for_specialist: z.string().max(3000).optional(),
  drive_folder_url: url.optional(),
  parts: z.record(z.string(), part).optional(),
}).passthrough()

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAutomationRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_body", detail: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 })
  const v = parsed.data
  const unknown = Object.keys(v.parts ?? {}).filter((k) => !(PART_KEYS as readonly string[]).includes(k))
  if (unknown.length) return NextResponse.json({ error: "unknown_parts", detail: unknown }, { status: 400 })

  const client = serviceClient()
  if (!client) return NextResponse.json({ error: "not_configured" }, { status: 500 })
  const access = await caseForAutomation(client, id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const { data: existing, error: readErr } = await client.from("file_parts").select("part, state").eq("application_id", id)
  if (readErr) return NextResponse.json({ error: "file_parts_unavailable" }, { status: 500 })
  const done = new Set(((existing ?? []) as { part: string; state: string }[]).filter((p) => p.state === "done").map((p) => p.part))

  // Uploaded files must be this case's prepared-part path and exist in storage.
  const { data: prepFiles } = await client.storage.from(DOC_BUCKET).list(`${id}/prep`, { limit: 50 })
  const present = new Set((prepFiles ?? []).map((f) => f.name))

  const saved: string[] = []
  const skipped: { part: string; reason: string }[] = []
  for (const [key, p] of Object.entries(v.parts ?? {}) as [AutomationPart, z.infer<typeof part>][]) {
    if (done.has(key)) { skipped.push({ part: key, reason: "already_done_by_staff" }); continue }
    let filePath: string | null = null
    if (p.file_path) {
      const ok = new RegExp(`^${id}/prep/${key}\\.(pdf|jpg|png)$`).test(p.file_path) && present.has(p.file_path.split("/").pop()!)
      if (!ok) { skipped.push({ part: key, reason: "file_path_not_found" }); continue }
      filePath = p.file_path
    }
    const row = {
      application_id: id,
      part: key,
      state: "draft",
      body: composePartBody(key, p),
      ...(filePath ? { file_path: filePath, file_name: filePath.split("/").pop() } : {}),
      updated_by: "Automation",
      updated_at: new Date().toISOString(),
    }
    const { error } = await client.from("file_parts").upsert(row, { onConflict: "application_id,part" })
    if (error) skipped.push({ part: key, reason: "save_failed" })
    else saved.push(key)
  }

  const note = composeNote({ ...v, saved, skipped })
  if (note) await client.from("case_notes").insert({ application_id: id, author_id: null, author_name: "File preparation automation", body: note, pinned: v.status === "needs_info" }).then(() => undefined, () => undefined)
  await client.from("audit_events").insert({ actor_type: "automation", actor_name: "File preparation automation", action: `Automation saved ${saved.length} draft ${saved.length === 1 ? "part" : "parts"}${v.status ? ` (${v.status.replace(/_/g, " ")})` : ""}`, type: "upload", target_table: "visa_applications", target_id: id, target_label: access.reference, field: "file_parts", after: { saved, skipped, status: v.status ?? null }, notified: "No", reversible: false }).then(() => undefined, () => undefined)

  return NextResponse.json({ saved, skipped, note_added: !!note }, { status: saved.length || !Object.keys(v.parts ?? {}).length ? 200 : 422 })
}
