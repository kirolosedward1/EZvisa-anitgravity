// Saved travellers (public.travellers, scripts/007_travellers.sql), server side. The rules (keys, dedupe, answer and
// row mapping) live in lib/shared/wizard-contract.ts and are mirrored in the app; this file only talks to the database.
//
//  - rememberTravellersFromApplication(): called where a case becomes paid (lib/ziina.ts applyIntentStatus) and after
//    the after-payment answers are saved (/api/continue-application). Upserts the main applicant (and the spouse when
//    travelling together) by dedupe key, so an edited name or passport number updates the row instead of adding one.
//  - listTravellers(): what the drop-down and Account show. The first time an account has no rows, its past paid or
//    submitted applications are turned into travellers once ("backfill"), so existing customers get the drop-down too.
//  - The rows are owned by the account email (same rule as visa_applications). Everything here uses the service role
//    and always filters by that email; the API routes (app/api/travellers) check the session before calling in.
import type { SupabaseClient } from "@supabase/supabase-js"
import { serviceClient } from "@/lib/applications"
import { citizenshipName } from "@/lib/nationalities"
import { sanitizeInput, sanitizePhone } from "@/lib/sanitize"
import {
  SCHENGEN_VISA_REQUIRED,
  TRAVELLERS_TABLE,
  TRAVELLER_RELATIONSHIPS,
  UAE_EMIRATES,
  isPaid,
  normalizePassport,
  parseNotes,
  spouseFromAnswers,
  travellerFromAnswers,
  travellerFromRow,
  travellerKeys,
  travellerToRow,
  type Traveller,
  type TravellerDetails,
  type TravellerRelationship,
  type WizardAnswers,
} from "@/lib/shared/wizard-contract"

const COLS = "id, email, relationship, first_name, last_name, date_of_birth, nationality, passport_number, passport_expiry, phone, phone_country, city_of_residence, dedupe_key, source, last_used_at, created_at, updated_at"
type Row = Record<string, unknown> & { id: string; dedupe_key: string; relationship: string }
type AppRow = { email?: string | null; full_name?: string | null; nationality?: string | null; date_of_birth?: string | null; passport_number?: string | null; phone?: string | null; additional_notes?: string | null; payment_status?: string | null; application_status?: string | null }

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
/** The table may not exist yet on an environment where the migration has not run: treat it as "no travellers". */
const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /travellers/.test(e.message ?? "") && /not find|does not exist/i.test(e.message ?? ""))
const sortRows = (rows: Row[]) => rows.sort((a, b) => str(b.last_used_at).localeCompare(str(a.last_used_at)) || str(b.updated_at).localeCompare(str(a.updated_at)))

/**
 * The answers of an application row in the shape travellerFromAnswers() wants: the wizard notes, with the row's own
 * columns as fallback. Website rows keep name, nationality (ISO code), date of birth, passport number and phone only
 * in the columns; app rows have everything in the notes.
 */
export function answersOfRow(row: AppRow): Partial<WizardAnswers> {
  const w = (parseNotes(row.additional_notes).wizard ?? {}) as Partial<WizardAnswers>
  const full = str(row.full_name).replace(/^Draft$/, "")
  const [first = "", ...rest] = full.split(/\s+/).filter(Boolean)
  const nationality = str(w.nationality) || citizenshipName(row.nationality) || str(row.nationality)
  return {
    ...w,
    firstName: str(w.firstName) || first,
    lastName: str(w.lastName) || rest.join(" "),
    nationality,
    dateOfBirth: str(w.dateOfBirth) || str(row.date_of_birth),
    passportNumber: str(w.passportNumber) || str(row.passport_number),
    phone: str(w.phone) || str(row.phone),
  }
}

async function selectByKeys(sb: SupabaseClient, email: string, keys: string[]): Promise<Row[] | null> {
  const { data, error } = await sb.from(TRAVELLERS_TABLE).select(COLS).eq("email", email).in("dedupe_key", keys)
  if (error) {
    if (!missingTable(error)) console.error("[travellers] lookup failed", error.code)
    return null
  }
  return (data ?? []) as Row[]
}

/**
 * Insert or update one traveller of `email`. A row saved under any of the person's keys (passport number, or name +
 * date of birth, or name alone) is updated; blanks never erase known values; an existing relationship is kept.
 */
export async function upsertTraveller(
  sb: SupabaseClient,
  email: string,
  details: TravellerDetails,
  relationship: TravellerRelationship,
  source: "application" | "backfill" | "manual" = "application",
  opts: { touch?: boolean } = {},
): Promise<Traveller | null> {
  const owner = email.trim().toLowerCase()
  if (!owner || !str(details.firstName) || !str(details.lastName)) return null
  const keys = travellerKeys(details)
  const existing = await selectByKeys(sb, owner, keys)
  if (!existing) return null
  const match = keys.map((k) => existing.find((r) => r.dedupe_key === k)).find(Boolean)
  const row = travellerToRow(details, owner, relationship)
  const now = new Date().toISOString()
  if (match) {
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) if (v !== null && v !== "") patch[k] = v
    if (match.relationship !== "other") delete patch.relationship
    if (opts.touch) patch.last_used_at = now
    const { data, error } = await sb.from(TRAVELLERS_TABLE).update(patch).eq("id", match.id).eq("email", owner).select(COLS).maybeSingle()
    if (error) {
      console.error("[travellers] update failed", error.code)
      return null
    }
    return data ? travellerFromRow(data as Row) : null
  }
  const { data, error } = await sb.from(TRAVELLERS_TABLE).insert({ ...row, source, last_used_at: opts.touch ? now : null }).select(COLS).maybeSingle()
  if (error) {
    // 23505: the same person was inserted meanwhile (two payment paths): read that row instead.
    if (error.code === "23505") {
      const again = await selectByKeys(sb, owner, keys)
      const hit = again?.find((r) => keys.includes(r.dedupe_key))
      return hit ? travellerFromRow(hit) : null
    }
    if (!missingTable(error)) console.error("[travellers] insert failed", error.code)
    return null
  }
  return data ? travellerFromRow(data as Row) : null
}

async function hasSelf(sb: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await sb.from(TRAVELLERS_TABLE).select("id").eq("email", email).eq("relationship", "self").limit(1)
  return !error && !!data?.length
}

/**
 * Save the people on a paid application as travellers of its email: the main applicant (relationship "self" for the
 * account's first traveller, else "other"; an existing row keeps its relationship) and, when the spouse travels too,
 * the spouse. Never throws: the payment and continue flows must not fail because of this.
 */
export async function rememberTravellersFromApplication(row: AppRow, client?: SupabaseClient | null, source: "application" | "backfill" = "application"): Promise<void> {
  try {
    const sb = client ?? serviceClient()
    const email = str(row.email).toLowerCase()
    if (!sb || !email || !isPaid(row)) return
    const answers = answersOfRow(row)
    const notes = parseNotes(row.additional_notes)
    const main = travellerFromAnswers(answers)
    if (main) {
      const relationship: TravellerRelationship = (await hasSelf(sb, email)) ? "other" : "self"
      await upsertTraveller(sb, email, main, relationship, source, { touch: true })
    }
    if ((answers.spouseAccompanying ?? notes.spouseAccompanying) === "yes") {
      const spouse = spouseFromAnswers(answers)
      if (spouse) await upsertTraveller(sb, email, spouse, "spouse", source, { touch: true })
    }
  } catch (e) {
    console.error("[travellers] remember failed", e instanceof Error ? e.message : e)
  }
}

/** Rows of `email`, most recently used first. `[]` when the table is missing or the query fails. */
async function selectAll(sb: SupabaseClient, email: string): Promise<Traveller[] | null> {
  const { data, error } = await sb.from(TRAVELLERS_TABLE).select(COLS).eq("email", email)
  if (error) {
    if (!missingTable(error)) console.error("[travellers] list failed", error.code)
    return null
  }
  return sortRows((data ?? []) as Row[]).map(travellerFromRow)
}

/**
 * The saved travellers of an account. When there are none yet, the account's past paid or submitted applications
 * (oldest first, so the newest answers win) are saved as travellers once, then listed.
 */
export async function listTravellers(email: string, opts: { backfill?: boolean; client?: SupabaseClient | null } = {}): Promise<Traveller[]> {
  const sb = opts.client ?? serviceClient()
  const owner = email.trim().toLowerCase()
  if (!sb || !owner) return []
  const first = await selectAll(sb, owner)
  if (first === null) return []
  if (first.length || opts.backfill === false) return first
  const { data: apps, error } = await sb
    .from("visa_applications")
    .select("email, full_name, nationality, date_of_birth, passport_number, phone, additional_notes, payment_status, application_status, created_at")
    .ilike("email", owner)
    .not("application_status", "in", "(draft,cancelled)")
    .order("created_at", { ascending: true })
    .limit(50)
  if (error || !apps?.length) return first
  for (const app of apps as AppRow[]) {
    if (str(app.email).toLowerCase() !== owner) continue
    // Submitted but unpaid cases count for the backfill (the customer typed the details); drafts never.
    await rememberTravellersFromApplication({ ...app, payment_status: isPaid(app) ? app.payment_status : "paid" }, sb, "backfill")
  }
  return (await selectAll(sb, owner)) ?? []
}

export async function getTraveller(email: string, id: string, client?: SupabaseClient | null): Promise<Traveller | null> {
  const sb = client ?? serviceClient()
  const owner = email.trim().toLowerCase()
  if (!sb || !owner || !id) return null
  const { data, error } = await sb.from(TRAVELLERS_TABLE).select(COLS).eq("email", owner).eq("id", id).maybeSingle()
  if (error || !data) return null
  return travellerFromRow(data as Row)
}

/** Mark a traveller as used now (picked in the wizard). */
export async function touchTravellerUsed(email: string, id: string, client?: SupabaseClient | null): Promise<void> {
  const sb = client ?? serviceClient()
  const owner = email.trim().toLowerCase()
  if (!sb || !owner || !id) return
  await sb.from(TRAVELLERS_TABLE).update({ last_used_at: new Date().toISOString() }).eq("email", owner).eq("id", id)
}

/** Edit a traveller the customer owns. Blank values clear the column (unlike the automatic upsert). */
export async function updateTraveller(email: string, id: string, details: TravellerDetails, relationship: TravellerRelationship | undefined, client?: SupabaseClient | null): Promise<{ traveller: Traveller | null; error?: "duplicate" | "failed" }> {
  const sb = client ?? serviceClient()
  const owner = email.trim().toLowerCase()
  if (!sb || !owner || !id) return { traveller: null, error: "failed" }
  const current = await getTraveller(owner, id, sb)
  if (!current) return { traveller: null, error: "failed" }
  const merged: TravellerDetails = { ...current, ...details }
  const row = travellerToRow(merged, owner, relationship ?? current.relationship)
  const { data, error } = await sb.from(TRAVELLERS_TABLE).update(row).eq("id", id).eq("email", owner).select(COLS).maybeSingle()
  if (error) return { traveller: null, error: error.code === "23505" ? "duplicate" : "failed" }
  return { traveller: data ? travellerFromRow(data as Row) : null }
}

export async function createTraveller(email: string, details: TravellerDetails, relationship: TravellerRelationship, client?: SupabaseClient | null): Promise<{ traveller: Traveller | null; error?: "duplicate" | "failed" }> {
  const sb = client ?? serviceClient()
  const owner = email.trim().toLowerCase()
  if (!sb || !owner) return { traveller: null, error: "failed" }
  const row = travellerToRow(details, owner, relationship)
  const { data, error } = await sb.from(TRAVELLERS_TABLE).insert({ ...row, source: "manual" }).select(COLS).maybeSingle()
  if (error) return { traveller: null, error: error.code === "23505" ? "duplicate" : "failed" }
  return { traveller: data ? travellerFromRow(data as Row) : null }
}

export async function deleteTraveller(email: string, id: string, client?: SupabaseClient | null): Promise<boolean> {
  const sb = client ?? serviceClient()
  const owner = email.trim().toLowerCase()
  if (!sb || !owner || !id) return false
  const { data, error } = await sb.from(TRAVELLERS_TABLE).delete().eq("id", id).eq("email", owner).select("id")
  return !error && !!data?.length
}

/**
 * Validate and clean a traveller sent by a client (Account → add / edit). Returns the details or the first error
 * message to show. Passport numbers are normalised; the nationality accepts a name or an ISO code.
 */
export function parseTravellerInput(body: Record<string, unknown>): { details: TravellerDetails; relationship?: TravellerRelationship } | { error: string } {
  const text = (k: string, max: number) => sanitizeInput(str(body[k]), max)
  const day = (k: string) => { const v = str(body[k]).slice(0, 10); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : "" }
  const firstName = text("firstName", 100), lastName = text("lastName", 100)
  if (!firstName || !lastName) return { error: "Enter the traveller's first and last name." }
  if (str(body.dateOfBirth) && !day("dateOfBirth")) return { error: "Enter a valid date of birth." }
  if (str(body.passportExpiry) && !day("passportExpiry")) return { error: "Enter a valid passport expiry date." }
  const nationalityRaw = str(body.nationality)
  const nationality = nationalityRaw ? (SCHENGEN_VISA_REQUIRED.includes(nationalityRaw) ? nationalityRaw : citizenshipName(nationalityRaw)) : ""
  if (nationalityRaw && !SCHENGEN_VISA_REQUIRED.includes(nationality)) return { error: "Choose a nationality that needs a Schengen visa." }
  const passportNumber = normalizePassport(str(body.passportNumber))
  if (passportNumber.length > 20) return { error: "Enter a valid passport number." }
  const phone = str(body.phone) ? sanitizePhone(str(body.phone)) : ""
  const cityOfResidence = str(body.cityOfResidence)
  if (cityOfResidence && !UAE_EMIRATES.includes(cityOfResidence)) return { error: "Choose an emirate." }
  const relationship = str(body.relationship)
  if (relationship && !(TRAVELLER_RELATIONSHIPS as readonly string[]).includes(relationship)) return { error: "Choose a relationship." }
  const details: TravellerDetails = {
    firstName, lastName,
    dateOfBirth: day("dateOfBirth"), nationality, passportNumber, passportExpiry: day("passportExpiry"),
    phone, phoneCountry: text("phoneCountry", 2).toUpperCase(), cityOfResidence,
    hasValidPassport: passportNumber ? "yes" : "",
  }
  return { details, ...(relationship ? { relationship: relationship as TravellerRelationship } : {}) }
}
