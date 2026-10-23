import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { hasBearerSecret } from "@/lib/bearer-auth"

const CASE_STATUSES = new Set(["draft", "submitted", "reviewing", "preparation", "awaiting_documents", "appointment_booked", "approved", "ready", "rejected", "cancelled", "completed"])

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization")
  const secret = process.env.ADMIN_API_SECRET
  return hasBearerSecret(authHeader, secret)
}

/**
 * GET: List & search visa cases
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Database unconfigured" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100)

  let query = supabase
    .from("visa_applications")
    .select(`
      id,
      tracking_token,
      full_name,
      email,
      phone,
      destination_country,
      nationality,
      entry_date,
      exit_date,
      application_status,
      payment_status,
      payment_amount,
      has_passport,
      has_bank_statements,
      has_employment_proof,
      has_photos,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status && status !== "all") {
    query = query.eq("application_status", status)
  }

  if (search) {
    // Characters that are syntax in a PostgREST or() filter (comma, parentheses, quotes, backslash) are removed.
    const term = search.replace(/[,()"'\\*%]/g, " ").trim().slice(0, 100)
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,destination_country.ilike.%${term}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cases: data })
}

/**
 * PATCH: Update application status with concurrency check & audit trail
 */
export async function PATCH(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Database unconfigured" }, { status: 500 })
  }

  try {
    const { id, application_status, expected_updated_at, notes, actor = "admin_staff" } = await request.json()

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing application ID" }, { status: 400 })
    }
    if (application_status && !CASE_STATUSES.has(application_status)) {
      return NextResponse.json({ error: "Unknown application status" }, { status: 400 })
    }
    // "ready" means the final package was delivered; that goes through trigger-email (documents.ready),
    // which checks that final_package.pdf exists.
    if (application_status === "ready") {
      return NextResponse.json({ error: "Use the 'documents ready' email action to mark a case ready." }, { status: 400 })
    }

    // 1+2. Update only if the record is still the version staff loaded (atomic; a separate read raced).
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (application_status) updatePayload.application_status = application_status

    let update = supabase.from("visa_applications").update(updatePayload).eq("id", id)
    if (expected_updated_at) update = update.eq("updated_at", expected_updated_at)
    const { data: rows, error: updateError } = await update.select()

    if (updateError) {
      console.error("[admin] case update failed", updateError.code)
      return NextResponse.json({ error: "Could not update the case" }, { status: 500 })
    }
    const updated = rows?.[0]
    if (!updated) {
      return NextResponse.json(
        { error: "Conflict: This case was modified by another staff member (or no longer exists). Please refresh." },
        { status: 409 }
      )
    }

    // 3. Log Audit Trail. email_logs has a unique (event_type, entity_id) index for email idempotency, so each
    // audit entry needs its own entity_id or every update after the first one is silently rejected.
    try {
      const { error: auditError } = await supabase.from("email_logs").insert({
        event_type: "admin.case_updated",
        entity_id: `${id}:${updatePayload.updated_at}`,
        recipient: actor,
        template: "audit",
        status: "logged",
        error_reason: notes ? `Notes: ${notes}` : `Status changed to ${application_status}`,
        sent_at: new Date().toISOString()
      })
      if (auditError) console.error("[admin] audit log insert failed", auditError.code)
    } catch {
      // Non-fatal if audit table structure differs
    }

    return NextResponse.json({ success: true, case: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
