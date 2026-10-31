// Saved travellers (public.travellers, migrations/0015_travellers.sql): the people this account applied for, shown as
// the "Who is travelling?" question in the wizard, as the spouse picker in Continue application and under
// Account → Saved travellers. The rules (keys, dedupe, answer ↔ row mapping) are the website contract's, mirrored in
// lib/wizard.ts. Rows are owned by the account email (RLS), so every query here goes through the signed-in session.
//
// Reading goes through the website's GET /api/travellers first (it backfills travellers from past applications the
// first time), falling back to the table itself; writing (after the after-payment step, Account edits) is direct.
// Nothing is cached on the phone: the list lives in component state, like lib/profile.ts.
import { supabase } from "./supabase";
import { siteUrl, PHONE_UAE_ONLY } from "./config";
import { isUaeMobile } from "./phone";
import { splitPhone } from "./profile";
import {
  TRAVELLERS_TABLE, applyTraveller, spouseFromAnswers, travellerFromAnswers, travellerFromRow, travellerKeys, travellerToRow,
  type Traveller, type TravellerDetails, type TravellerRelationship, type WizardForm,
} from "./wizard";

const COLS = "id, email, relationship, first_name, last_name, date_of_birth, nationality, passport_number, passport_expiry, phone, phone_country, city_of_residence, dedupe_key, source, last_used_at, created_at, updated_at";
type Row = Record<string, unknown> & { id: string; dedupe_key: string; relationship: string };
/** The table is not in lib/database.types.ts until the types are regenerated; queries go through an untyped handle. */
const table = () => { if (!supabase) throw new Error("Backend not configured"); return (supabase as any).from(TRAVELLERS_TABLE); };
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205");
const sortRows = (rows: Row[]) => rows.sort((a, b) => str(b.last_used_at).localeCompare(str(a.last_used_at)) || str(b.updated_at).localeCompare(str(a.updated_at)));

async function session() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u?.email ? { email: u.email.toLowerCase(), token: data.session!.access_token } : null;
}

/** The account's saved travellers, most recently used first ([] when signed out, offline, or none). */
export async function fetchTravellers(): Promise<Traveller[]> {
  const s = await session();
  if (!s) return [];
  try {
    // The wizard waits for this list, so a slow website (cold start, weak signal) falls back to the table after 4 s.
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4000);
    try {
      const res = await fetch(siteUrl("/api/travellers"), { headers: { Authorization: `Bearer ${s.token}`, Accept: "application/json" }, signal: ctl.signal });
      if (res.ok) { const j = await res.json(); if (Array.isArray(j?.travellers) && j.travellers.length) return j.travellers as Traveller[]; }
    } finally { clearTimeout(timer); }
  } catch { /* fall back to the table */ }
  try {
    const { data, error } = await table().select(COLS).eq("email", s.email);
    if (error) return [];
    return sortRows((data ?? []) as Row[]).map(travellerFromRow);
  } catch { return []; }
}

/** applyTraveller plus the app's split phone fields (PhoneField shows phoneCountry + phoneLocal). */
export function applyTravellerToForm(f: WizardForm, t: Traveller): WizardForm {
  const nf = applyTraveller(f, t);
  if (str(t.phone) && !str(t.phoneLocal)) { const sp = splitPhone(t.phone!, t.phoneCountry); if (sp) Object.assign(nf, sp); }
  // UAE mobiles only for now: a saved number from another country is not carried into the form.
  if (PHONE_UAE_ONLY && str(nf.phone) && !isUaeMobile(nf.phone)) Object.assign(nf, { phone: "", phoneLocal: "", phoneCountry: "AE" });
  return nf;
}

async function upsert(email: string, details: TravellerDetails, relationship: TravellerRelationship, touch: boolean): Promise<Traveller | null> {
  if (!str(details.firstName) || !str(details.lastName)) return null;
  const keys = travellerKeys(details);
  const { data: existing, error } = await table().select(COLS).eq("email", email).in("dedupe_key", keys);
  if (error) { if (!missingTable(error)) console.warn("travellers lookup", error.code); return null; }
  const match = keys.map((k) => ((existing ?? []) as Row[]).find((r) => r.dedupe_key === k)).find(Boolean);
  const row = travellerToRow(details, email, relationship);
  const now = new Date().toISOString();
  if (match) {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) if (v !== null && v !== "") patch[k] = v;
    if (match.relationship !== "other") delete patch.relationship;
    if (touch) patch.last_used_at = now;
    const { data } = await table().update(patch).eq("id", match.id).eq("email", email).select(COLS).maybeSingle();
    return data ? travellerFromRow(data as Row) : null;
  }
  const { data, error: ie } = await table().insert({ ...row, source: "application", last_used_at: touch ? now : null }).select(COLS).maybeSingle();
  if (ie) { if (ie.code !== "23505" && !missingTable(ie)) console.warn("travellers insert", ie.code); return null; }
  return data ? travellerFromRow(data as Row) : null;
}

/**
 * After the after-payment answers were saved (Continue application): the main applicant's passport details and, when
 * the spouse travels too, the spouse go to the account's travellers. Same rules as the website server. Never throws.
 */
export async function rememberTravellersAfterPayment(f: WizardForm): Promise<void> {
  try {
    const s = await session(); if (!s) return;
    const main = travellerFromAnswers(f);
    if (main) {
      const { data } = await table().select("id").eq("email", s.email).eq("relationship", "self").limit(1);
      await upsert(s.email, main, data?.length ? "other" : "self", true);
    }
    if (f.spouseAccompanying === "yes") { const spouse = spouseFromAnswers(f); if (spouse) await upsert(s.email, spouse, "spouse", true); }
  } catch (e) { console.warn("travellers remember", (e as Error)?.message); }
}

/** A saved traveller was picked: remember when (best effort). */
export async function markTravellerUsed(id: string): Promise<void> {
  try { const s = await session(); if (!s || !id) return; await table().update({ last_used_at: new Date().toISOString() }).eq("id", id).eq("email", s.email); } catch { /* best effort */ }
}

// ---- Account → Saved travellers ----
export class TravellerSaveError extends Error { constructor(message: string, public duplicate = false) { super(message); } }

export async function createTraveller(details: TravellerDetails, relationship: TravellerRelationship): Promise<Traveller> {
  const s = await session(); if (!s) throw new TravellerSaveError("Please sign in first");
  const { data, error } = await table().insert({ ...travellerToRow(details, s.email, relationship), source: "manual" }).select(COLS).maybeSingle();
  if (error) throw new TravellerSaveError(error.code === "23505" ? "This traveller is already saved." : "Couldn't save. Check your connection and try again.", error.code === "23505");
  return travellerFromRow(data as Row);
}

export async function updateTraveller(id: string, details: TravellerDetails, relationship: TravellerRelationship): Promise<Traveller> {
  const s = await session(); if (!s) throw new TravellerSaveError("Please sign in first");
  const { data, error } = await table().update(travellerToRow(details, s.email, relationship)).eq("id", id).eq("email", s.email).select(COLS).maybeSingle();
  if (error) throw new TravellerSaveError(error.code === "23505" ? "This traveller is already saved." : "Couldn't save. Check your connection and try again.", error.code === "23505");
  if (!data) throw new TravellerSaveError("Couldn't save. Check your connection and try again.");
  return travellerFromRow(data as Row);
}

export async function deleteTraveller(id: string): Promise<void> {
  const s = await session(); if (!s) throw new TravellerSaveError("Please sign in first");
  const { error } = await table().delete().eq("id", id).eq("email", s.email);
  if (error) throw new TravellerSaveError("Couldn't remove. Check your connection and try again.");
}
