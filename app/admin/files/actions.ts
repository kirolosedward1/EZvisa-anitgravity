"use server"

// File preparation writes: generate, edit and finish parts, upload bookings, and assemble the prepared file
// (final_package.pdf, what the customer downloads) then mark the case Ready. Files permission (Admin, Specialist).
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { generateConsularChecklist, generateCoverLetter, generateItinerary } from "@/lib/documents/templates"
import { DOC_BUCKET, parseNotes, requirementsFor } from "@/lib/shared/wizard-contract"
import type { VisaApplication } from "@/lib/types/visa-application"
import { recordAudit } from "@/lib/staff/audit"
import { assemblePdf, fileKind, htmlToText, isPartKey, PARTS, partsFrom, type AssemblyInput, type PartKey } from "@/lib/staff/file-prep"
import { can } from "@/lib/staff/roles"
import { getStaff, missingTable, type Staff } from "@/lib/staff/session"

export type FileResult = { ok: true; message: string; body?: string } | { ok: false; error: string }
// The visa_documents bucket rejects files over 5 MB, so the same limit is checked here first.
const MAX_UPLOAD = 5 * 1024 * 1024

async function writer(): Promise<{ staff: Staff } | { error: string }> {
  const staff = await getStaff()
  if (!staff) return { error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "files")) return { error: "Your role cannot prepare files." }
  return { staff }
}

function done(caseId: string) {
  revalidatePath("/admin/files")
  revalidatePath(`/admin/cases/${caseId}`)
}

async function upsertPart(caseId: string, part: PartKey, fields: Record<string, unknown>, staff: Staff): Promise<string | null> {
  const client = serviceClient()
  if (!client) return "The database is not configured."
  const { error } = await client
    .from("file_parts")
    .upsert({ application_id: caseId, part, ...fields, updated_by: staff.name, updated_at: new Date().toISOString() }, { onConflict: "application_id,part" })
  if (error) return missingTable(error) ? "File preparation needs migration 007 (file_parts)." : "The part could not be saved."
  return null
}

export async function generatePart(input: { caseId: string; part: string }): Promise<FileResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error }
  if (!isPartKey(input.part) || PARTS.find((p) => p.key === input.part)?.kind !== "gen") return { ok: false, error: "That part is not generated." }
  if (w.staff.demo) return { ok: true, message: "Demo: a draft was generated from the template. Nothing was saved.", body: "Draft generated from the application (demo)." }
  if (!UUID_RE.test(input.caseId)) return { ok: false, error: "Invalid case." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: app } = await client.from("visa_applications").select("*").eq("id", input.caseId).maybeSingle()
  if (!app) return { ok: false, error: "Case not found." }
  const html = input.part === "cover_letter" ? generateCoverLetter(app as VisaApplication) : input.part === "itinerary" ? generateItinerary(app as VisaApplication) : generateConsularChecklist(app as VisaApplication)
  const body = htmlToText(html).slice(0, 40000)
  const err = await upsertPart(input.caseId, input.part, { state: "draft", body }, w.staff)
  if (err) return { ok: false, error: err }
  done(input.caseId)
  return { ok: true, message: "Draft generated from the application. Review it, then save and mark done.", body }
}

export async function savePart(input: { caseId: string; part: string; body: string; markDone: boolean }): Promise<FileResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error }
  const parsed = z.object({ caseId: w.staff.demo ? z.string().min(1) : z.string().regex(UUID_RE), part: z.string(), body: z.string().max(40000), markDone: z.boolean() }).safeParse(input)
  if (!parsed.success || !isPartKey(parsed.data.part)) return { ok: false, error: "That part is not valid." }
  if (w.staff.demo) return { ok: true, message: "Demo: saved. Nothing was stored." }
  const err = await upsertPart(parsed.data.caseId, parsed.data.part, { state: parsed.data.markDone ? "done" : "draft", body: parsed.data.body }, w.staff)
  if (err) return { ok: false, error: err }
  done(parsed.data.caseId)
  return { ok: true, message: parsed.data.markDone ? "Saved and marked done." : "Saved as a draft." }
}

/**
 * Uploads go straight from the browser to storage with a one-time signed URL (function request bodies are capped at
 * about 4.5 MB on Vercel). startUpload checks the role and the file and returns the URL token; finishUpload checks the
 * object arrived and records the part.
 */
export async function startUpload(input: { caseId: string; part: string; fileName: string; size: number }): Promise<{ ok: true; path: string; token: string; demo?: boolean } | { ok: false; error: string }> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error }
  if (!isPartKey(input.part)) return { ok: false, error: "That part is not valid." }
  const kind = fileKind(input.fileName)
  if (!kind) return { ok: false, error: "Upload a PDF, JPG or PNG." }
  if (!(input.size > 0) || input.size > MAX_UPLOAD) return { ok: false, error: "The file is over 5 MB. Compress it or save it as a smaller PDF." }
  if (w.staff.demo) return { ok: true, path: "", token: "", demo: true }
  if (!UUID_RE.test(input.caseId)) return { ok: false, error: "Invalid case." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const path = `${input.caseId}/prep/${input.part}.${kind}`
  const { data, error } = await client.storage.from(DOC_BUCKET).createSignedUploadUrl(path, { upsert: true })
  if (error || !data) return { ok: false, error: "The upload could not start." }
  return { ok: true, path, token: data.token }
}

export async function finishUpload(input: { caseId: string; part: string; fileName: string }): Promise<FileResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error }
  if (w.staff.demo) return { ok: true, message: `Demo: ${input.fileName} would be uploaded. Nothing was stored.` }
  const kind = fileKind(input.fileName)
  if (!isPartKey(input.part) || !kind || !UUID_RE.test(input.caseId)) return { ok: false, error: "That upload is not valid." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const path = `${input.caseId}/prep/${input.part}.${kind}`
  const { data: listed } = await client.storage.from(DOC_BUCKET).list(`${input.caseId}/prep`, { search: `${input.part}.${kind}` })
  if (!listed?.some((f) => f.name === `${input.part}.${kind}`)) return { ok: false, error: "The file did not arrive. Try again." }
  const err = await upsertPart(input.caseId, input.part, { state: "done", file_path: path, file_name: input.fileName.slice(0, 120) }, w.staff)
  if (err) return { ok: false, error: err }
  await recordAudit(w.staff, { action: `${PARTS.find((p) => p.key === input.part)?.name} uploaded for the prepared file`, type: "upload", targetTable: "visa_applications", targetId: input.caseId, field: `file_parts.${input.part}`, after: { file: input.fileName }, notified: "No" }, client)
  done(input.caseId)
  return { ok: true, message: `${input.fileName} uploaded and the part marked done.` }
}

/** Assembles the prepared file in embassy order, stores it as final_package.pdf and moves the case to Ready. */
export async function assembleAndReady(input: { caseId: string }): Promise<FileResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error }
  if (!can(w.staff.role, "stage")) return { ok: false, error: "Your role cannot move a case to Ready." }
  if (w.staff.demo) return { ok: true, message: "Demo: the file would be assembled and the case moved to Ready. Nothing was saved." }
  if (!UUID_RE.test(input.caseId)) return { ok: false, error: "Invalid case." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const id = input.caseId

  const [{ data: app }, { data: rows, error: partsError }] = await Promise.all([
    client.from("visa_applications").select("*").eq("id", id).maybeSingle(),
    client.from("file_parts").select("part, state, body, file_name, file_path, updated_by").eq("application_id", id),
  ])
  if (!app) return { ok: false, error: "Case not found." }
  if (partsError) return { ok: false, error: missingTable(partsError) ? "File preparation needs migration 007 (file_parts)." : "The parts could not be read." }
  const parts = partsFrom(rows ?? [])
  const unfinished = parts.filter((p) => p.state !== "done").map((p) => PARTS.find((x) => x.key === p.key)!.name)
  if (unfinished.length) return { ok: false, error: `Finish the remaining parts first: ${unfinished.join(", ")}.` }

  const download = async (path: string) => {
    const { data } = await client.storage.from(DOC_BUCKET).download(path)
    return data ? new Uint8Array(await data.arrayBuffer()) : null
  }
  const inputs: AssemblyInput[] = []
  for (const p of parts) {
    const title = PARTS.find((x) => x.key === p.key)!.name
    if (p.filePath) {
      const bytes = await download(p.filePath)
      const kind = fileKind(p.filePath)
      if (bytes && kind === "pdf") inputs.push({ kind: "pdf", title, bytes })
      else if (bytes && kind) inputs.push({ kind: "image", title, bytes, type: kind === "png" ? "png" : "jpg" })
      else if (p.body) inputs.push({ kind: "text", title, body: p.body })
    } else if (p.body) inputs.push({ kind: "text", title, body: p.body })
  }
  // Then the customer's documents, latest upload of each required type.
  const notes = parseNotes((app as VisaApplication).additional_notes)
  const types = requirementsFor(notes.wizard?.employmentStatus ?? notes.employmentStatus).filter((r) => !r.provided_by_ezvisa)
  for (const r of types) {
    const u = (notes.uploads ?? []).filter((x) => x.type === r.document_type && typeof x.path === "string" && x.path.startsWith(`${id}/`)).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]
    const kind = u ? fileKind(u.path) : null
    if (!u || !kind) continue
    const bytes = await download(u.path)
    if (!bytes) continue
    inputs.push(kind === "pdf" ? { kind: "pdf", title: r.title, bytes } : { kind: "image", title: r.title, bytes, type: kind === "png" ? "png" : "jpg" })
  }

  const { bytes, pages, skipped } = await assemblePdf(inputs)
  const { error: upErr } = await client.storage.from(DOC_BUCKET).upload(`${id}/final_package.pdf`, Buffer.from(bytes), { contentType: "application/pdf", upsert: true })
  if (upErr) return { ok: false, error: "The prepared file could not be stored." }

  const { data: updated } = await client
    .from("visa_applications")
    .update({ application_status: "ready", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("updated_at", (app as VisaApplication).updated_at ?? "")
    .select("id")
  const moved = !!updated?.length
  await recordAudit(w.staff, {
    action: `File assembled, ${pages} pages${skipped.length ? ` (could not read: ${skipped.join(", ")})` : ""}${moved ? "; stage changed to Ready" : ""}`,
    type: "stage",
    targetTable: "visa_applications",
    targetId: id,
    field: "application_status",
    before: (app as VisaApplication).application_status,
    after: moved ? "ready" : (app as VisaApplication).application_status,
    notified: moved ? "Customer dashboard" : "No",
  }, client)
  if (moved) await recordApplicationEvent(id, "status_changed", { to: "ready" }, "team", client)
  done(id)
  revalidatePath("/admin/overview")
  const skippedText = skipped.length ? ` Could not read: ${skipped.join(", ")}; check those files.` : ""
  return moved
    ? { ok: true, message: `File assembled, ${pages} pages. Case moved to Ready; the customer can download it from their dashboard.${skippedText}` }
    : { ok: true, message: `File assembled, ${pages} pages, but the case changed meanwhile so the stage was not moved. Reload and use Change stage.${skippedText}` }
}

/** "Send to automation" on File preparation: asks the Make scenario to prepare drafts for this case. Logged. */
export async function sendToAutomation(input: { caseId: string }): Promise<FileResult> {
  const w = await writer()
  if ("error" in w) return { ok: false, error: w.error }
  const { automationConfigured, notifyAutomation } = await import("@/lib/automation/make")
  if (w.staff.demo) return { ok: true, message: "Demo: the case would be sent to the file preparation automation. Nothing was sent." }
  if (!automationConfigured().outbound) return { ok: false, error: "The automation is not connected yet: MAKE_WEBHOOK_URL and MAKE_API_SECRET need to be set in Vercel." }
  if (!UUID_RE.test(input.caseId)) return { ok: false, error: "Invalid case." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: row } = await client.from("visa_applications").select("tracking_token, payment_status").eq("id", input.caseId).maybeSingle()
  if (!row) return { ok: false, error: "Case not found." }
  if (!["paid", "completed"].includes(String(row.payment_status ?? "").toLowerCase())) return { ok: false, error: "The case is not paid." }
  const { getReference } = await import("@/lib/application-status")
  const ref = getReference(row.tracking_token as string | null) || `EZ-${input.caseId.slice(0, 8).toUpperCase()}`
  const r = await notifyAutomation(input.caseId, ref, "manual")
  await recordAudit(w.staff, { action: r.sent ? "Sent to the file preparation automation" : `Sending to the automation failed (${r.reason})`, type: "upload", targetTable: "visa_applications", targetId: input.caseId, targetLabel: ref, field: "automation", notified: "No" }, client)
  return r.sent ? { ok: true, message: "Sent. Drafts appear here as the automation saves them (refresh in a minute or two)." } : { ok: false, error: `The automation did not accept it (${r.reason?.replace(/_/g, " ")}). Check the Make scenario is on.` }
}
