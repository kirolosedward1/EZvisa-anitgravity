/**
 * POST /api/automation/cases/:id/upload-url: a one-time signed upload link for a prepared part (for example the
 * flight reservation PDF). Body: { part, file_name, size }. Auth: Bearer MAKE_API_SECRET. Upload the file with
 * PUT to signed_url, then register it with PUT /api/automation/cases/:id/parts (parts.<part>.file_path = path).
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { DOC_BUCKET } from "@/lib/shared/wizard-contract"
import { isAutomationRequest, PART_KEYS } from "@/lib/automation/make"
import { caseForAutomation } from "@/lib/automation/case-payload"
import { fileKind } from "@/lib/staff/file-prep"

export const dynamic = "force-dynamic"
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAutomationRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 })
  const v = z.object({ part: z.enum(PART_KEYS), file_name: z.string().min(1).max(200), size: z.number().int().positive().max(MAX_BYTES) }).safeParse(await request.json().catch(() => null))
  if (!v.success) return NextResponse.json({ error: "invalid_body", detail: "part must be one of form, cover_letter, flight, hotel, itinerary, checklist; size at most 5 MB" }, { status: 400 })
  const kind = fileKind(v.data.file_name)
  if (!kind) return NextResponse.json({ error: "invalid_file_type", detail: "PDF, JPG or PNG" }, { status: 400 })
  const client = serviceClient()
  if (!client) return NextResponse.json({ error: "not_configured" }, { status: 500 })
  const access = await caseForAutomation(client, id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const path = `${id}/prep/${v.data.part}.${kind}`
  const { data, error } = await client.storage.from(DOC_BUCKET).createSignedUploadUrl(path, { upsert: true })
  if (error || !data) return NextResponse.json({ error: "upload_link_failed" }, { status: 500 })
  return NextResponse.json({ path, signed_url: data.signedUrl, content_type: kind === "pdf" ? "application/pdf" : kind === "png" ? "image/png" : "image/jpeg" }, { headers: { "Cache-Control": "no-store" } })
}
