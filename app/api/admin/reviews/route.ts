import { NextResponse } from "next/server"
import { adminClient, getStaffUser, isStaffRequest } from "@/lib/admin-auth"
import { UUID_RE } from "@/lib/applications"
import { recordApplicationEvent, loadApplicationEvents } from "@/lib/application-events-server"
import { loadDocumentReviews } from "@/lib/document-reviews-server"
import { specialistName } from "@/lib/application-events"
import { customerDocuments } from "@/lib/dashboard-state"
import { DOC_BUCKET, parseNotes } from "@/lib/shared/wizard-contract"
import type { ReviewStatus } from "@/lib/document-reviews"

/**
 * Staff document review for one case (the /admin case page).
 * Staff only (lib/admin-auth.ts: signed-in staff email, or the script secret).
 * GET  ?id=<uuid>: the case, its document rows (state, uploads with 15-minute signed links, latest review),
 *      the specialist and the stored activity events.
 * POST { id, action: "review", documentType, status, note?, reviewer? }: upserts the document_reviews row and logs a
 *      document_reviewed event. A "rejected" review needs a note; the customer sees it on the dashboard and upload desk.
 * POST { id, action: "specialist", name }: logs specialist_assigned; the dashboard shows the latest name.
 */
const STATUSES: ReviewStatus[] = ["received", "checking", "approved", "rejected"]
const CASE_COLUMNS =
  "id, tracking_token, full_name, email, destination_country, application_status, payment_status, additional_notes, has_passport, has_photos, has_bank_statements, has_employment_proof, created_at, updated_at"

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "")

export async function GET(request: Request) {
  if (!(await isStaffRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = new URL(request.url).searchParams.get("id") ?? ""
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid case id" }, { status: 400 })
  const supabase = adminClient()
  if (!supabase) return NextResponse.json({ error: "Database unconfigured" }, { status: 500 })

  const { data: row, error } = await supabase.from("visa_applications").select(CASE_COLUMNS).eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: "Could not load the case" }, { status: 500 })
  if (!row) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  const [reviews, events] = await Promise.all([loadDocumentReviews(id), loadApplicationEvents(id)])
  const { rows } = customerDocuments(row, reviews)
  // Upload records with their storage paths (customer-facing views never get the path).
  const uploads = (parseNotes(row.additional_notes).uploads ?? []).filter((u) => u && typeof u.path === "string" && u.path.startsWith(`${id}/`))

  const documents = await Promise.all(
    rows.map(async (r) => {
      const files = await Promise.all(
        uploads
          .filter((u) => u.type === r.document_type)
          .sort((a, b) => String(b.at).localeCompare(String(a.at)))
          .map(async (u) => {
            const { data } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(u.path, 15 * 60)
            return { name: u.name, at: u.at, url: data?.signedUrl ?? null }
          }),
      )
      return { documentType: r.document_type, title: r.title, state: r.state, review: reviews[r.document_type] ?? null, files }
    }),
  )

  return NextResponse.json(
    {
      case: {
        id: row.id,
        trackingToken: row.tracking_token,
        name: row.full_name,
        email: row.email,
        destination: row.destination_country,
        status: row.application_status,
        payment: row.payment_status,
      },
      documents,
      specialist: specialistName(row, events),
      events,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(request: Request) {
  if (!(await isStaffRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = typeof body?.id === "string" ? body.id : ""
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid case id" }, { status: 400 })
  const supabase = adminClient()
  if (!supabase) return NextResponse.json({ error: "Database unconfigured" }, { status: 500 })

  const { data: row } = await supabase.from("visa_applications").select(CASE_COLUMNS).eq("id", id).maybeSingle()
  if (!row) return NextResponse.json({ error: "Case not found" }, { status: 404 })

  if (body?.action === "specialist") {
    const name = clean(body.name, 40)
    if (name.length < 2) return NextResponse.json({ error: "Enter the specialist's name" }, { status: 400 })
    await recordApplicationEvent(id, "specialist_assigned", { name }, "team", supabase)
    return NextResponse.json({ ok: true, specialist: name })
  }

  if (body?.action === "review") {
    const documentType = clean(body.documentType, 40)
    const status = body.status as ReviewStatus
    const note = clean(body.note, 1000)
    const allowed = customerDocuments(row).rows.map((r) => r.document_type)
    if (!allowed.includes(documentType)) return NextResponse.json({ error: "This document is not on the case's checklist" }, { status: 400 })
    if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid review status" }, { status: 400 })
    if (status === "rejected" && note.length < 5) return NextResponse.json({ error: "Tell the customer what to change (at least a few words)" }, { status: 400 })

    const { error } = await supabase.from("document_reviews").upsert(
      {
        application_id: id,
        document_type: documentType,
        status,
        note: status === "rejected" ? note : note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: clean(body.reviewer, 60) || (await getStaffUser())?.email || null,
      },
      { onConflict: "application_id,document_type" },
    )
    if (error) return NextResponse.json({ error: "Could not save the review" }, { status: 500 })
    await recordApplicationEvent(id, "document_reviewed", { document_type: documentType, status }, "team", supabase)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
