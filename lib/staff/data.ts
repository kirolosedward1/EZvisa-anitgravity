/**
 * Console reads: every case as a StaffCase (lib/staff/cases.ts) with its owner, plus the staff list. Server only,
 * service role, after the page checked the staff session. The demo session gets lib/staff/demo.ts and never touches
 * the database. Cached per request, so the layout (sidebar counts) and the page share one load.
 */
import { cache } from "react"
import { serviceClient } from "@/lib/applications"
import { toDocumentReviews, type DocumentReviews } from "@/lib/document-reviews"
import type { VisaApplication } from "@/lib/types/visa-application"
import { toStaffCase, type StaffCase } from "@/lib/staff/cases"
import { DEMO_STAFF, demoConsoleData } from "@/lib/staff/demo"
import { missingTable, type Staff } from "@/lib/staff/session"
import type { Role } from "@/lib/staff/roles"
import { loadSettings, type LoadedSettings } from "@/lib/staff/console-settings-server"

export type StaffMember = { id: string; name: string; email: string; role: Role; active: boolean }

export type ConsoleData = {
  cases: StaffCase[]
  /** The rows behind the cases (same order) and their reviews, for boards that need answers or uploads. */
  apps: VisaApplication[]
  reviews: Record<string, DocumentReviews>
  team: StaffMember[]
  /** Set when part of the data could not be read (shown as a banner, the rest stays visible). */
  problem: string | null
  /** Editable console settings (SLA targets, templates, centres, auto-assign), defaults until migration 011. */
  settings: LoadedSettings
}

const BASE_COLUMNS =
  "id, tracking_token, full_name, email, phone, nationality, destination_country, travel_purpose, application_status, payment_status, payment_amount, additional_notes, has_passport, has_photos, has_bank_statements, has_employment_proof, appointment_at, appointment_centre, entry_date, exit_date, travel_start_date, travel_end_date, referrer, payment_id, created_at, updated_at"
/** Columns from supabase/migrations/002_appointment_step.sql; read only when that migration is applied. */
const STEP_002_COLUMNS = "paid_at, file_downloaded_at, appointment_choice, appointment_help_status, appointment_help_requested_at"

const CASE_LIMIT = 5000

export const loadConsoleData = cache(async (staff: Staff): Promise<ConsoleData> => {
  const settings = await loadSettings(staff.demo)
  if (staff.demo) {
    const { apps, reviews, owners } = demoConsoleData()
    return {
      settings,
      cases: apps.map((a) => toStaffCase(a, reviews[a.id ?? ""] ?? {}, owners[a.id ?? ""] ?? null, settings.sla)),
      apps,
      reviews,
      team: DEMO_STAFF.map((m) => ({ ...m, active: true })),
      problem: null,
    }
  }

  const client = serviceClient()
  if (!client) return { cases: [], apps: [], reviews: {}, team: [], settings, problem: "The database is not configured for this deployment." }

  let problem: string | null = null
  let apps: VisaApplication[] = []
  const full = await client.from("visa_applications").select(`${BASE_COLUMNS}, ${STEP_002_COLUMNS}`).order("created_at", { ascending: false }).limit(CASE_LIMIT)
  if (full.error?.code === "42703") {
    // Migration 002 not applied: read without its columns.
    const base = await client.from("visa_applications").select(BASE_COLUMNS).order("created_at", { ascending: false }).limit(CASE_LIMIT)
    if (base.error) problem = "Cases could not be loaded."
    else apps = (base.data ?? []) as VisaApplication[]
  } else if (full.error) {
    problem = "Cases could not be loaded."
  } else {
    apps = (full.data ?? []) as VisaApplication[]
  }

  const [reviewRows, assignmentRows, teamRows] = await Promise.all([
    client.from("document_reviews").select("application_id, document_type, status, note, reviewed_at").limit(50000),
    client.from("case_assignments").select("application_id, staff_id, created_at").order("created_at", { ascending: false }).limit(50000),
    client.from("staff_users").select("id, name, email, role, active").order("name"),
  ])
  if (reviewRows.error && !missingTable(reviewRows.error)) problem ??= "Document reviews could not be loaded."
  if (assignmentRows.error && !missingTable(assignmentRows.error)) problem ??= "Case owners could not be loaded."

  const reviewsBy = new Map<string, unknown[]>()
  for (const row of (reviewRows.data ?? []) as { application_id: string }[]) {
    const list = reviewsBy.get(row.application_id) ?? []
    list.push(row)
    reviewsBy.set(row.application_id, list)
  }
  const ownerBy = new Map<string, string | null>()
  for (const row of (assignmentRows.data ?? []) as { application_id: string; staff_id: string | null }[]) {
    if (!ownerBy.has(row.application_id)) ownerBy.set(row.application_id, row.staff_id)
  }

  const reviewMap: Record<string, DocumentReviews> = {}
  const cases = apps.map((a) => {
    const reviews: DocumentReviews = toDocumentReviews(reviewsBy.get(a.id ?? "") ?? [])
    reviewMap[a.id ?? ""] = reviews
    return toStaffCase(a, reviews, ownerBy.get(a.id ?? "") ?? null, settings.sla)
  })
  const team = ((teamRows.data ?? []) as StaffMember[]).filter((m) => m.active)
  return { cases, apps, reviews: reviewMap, team, settings, problem }
})
