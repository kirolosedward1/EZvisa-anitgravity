import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization")
  const secret = process.env.ADMIN_API_SECRET
  if (!secret) return false
  return authHeader === `Bearer ${secret}`
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
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,destination_country.ilike.%${search}%`)
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

    if (!id) {
      return NextResponse.json({ error: "Missing application ID" }, { status: 400 })
    }

    // 1. Concurrency Check: Verify record hasn't been modified since it was loaded
    if (expected_updated_at) {
      const { data: current } = await supabase
        .from("visa_applications")
        .select("updated_at")
        .eq("id", id)
        .single()

      if (current && current.updated_at && current.updated_at !== expected_updated_at) {
        return NextResponse.json(
          { error: "Conflict: This case was modified by another staff member. Please refresh." },
          { status: 409 }
        )
      }
    }

    // 2. Perform Update
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (application_status) updatePayload.application_status = application_status

    const { data: updated, error: updateError } = await supabase
      .from("visa_applications")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Log Audit Trail
    try {
      await supabase.from("email_logs").insert({
        event_type: "admin.case_updated",
        entity_id: id,
        recipient: actor,
        template: "audit",
        status: "logged",
        error_reason: notes ? `Notes: ${notes}` : `Status changed to ${application_status}`,
        sent_at: new Date().toISOString()
      })
    } catch {
      // Non-fatal if audit table structure differs
    }

    return NextResponse.json({ success: true, case: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
