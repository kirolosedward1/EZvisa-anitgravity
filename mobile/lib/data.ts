import * as Crypto from "expo-crypto";
// Data layer for the LIVE website database (Supabase project ezvisa-uae, ref dravvaykssrbktztmrlj),
// matching exactly how ezvisa.net reads and writes:
//  - one row per case in public.visa_applications (same columns, statuses and additional_notes JSON as
//    web app/api/submit-application/route.ts); the dashboard lists rows by the signed-in user's email
//  - documents go through the website's POST /api/upload-document (bucket + has_* flags are set server-side)
//  - payments go through POST /api/create-payment (Ziina), see lib/api.ts
// Only the publishable/anon key is used. Nothing here needs a service-role key.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { siteUrl } from "./config";
import type { Database } from "./database.types";
import { emptyForm, continueComplete, employmentComplete, missingDocs, type WizardForm } from "./wizard";

export type VisaRow = Database["public"]["Tables"]["visa_applications"]["Row"];
type VisaUpdate = Database["public"]["Tables"]["visa_applications"]["Update"];

/** Website application_status values (admin: submitted -> reviewing -> ready | cancelled) plus the app's "draft". */
export type AppStatus = "draft" | "submitted" | "reviewing" | "ready" | "cancelled" | string;
export type Doc = { id: string; document_type: string; requirement_id: string | null; status: string; source: string; storage_path: string; file_name: string | null; rejection_reason: string | null; created_at: string };
export type Applicant = { id: string; is_primary: boolean; first_name: string; last_name: string; passport_number: string | null; passport_expiry_date: string | null };
export type Notes = {
  maritalStatus?: string; employmentStatus?: string; jobTitle?: string; companyName?: string; monthlySalary?: string; spouseAccompanying?: string;
  source?: string; platform?: string; wizardStep?: string; wizardQuestion?: string; itinerary?: unknown; contactEmail?: string; wizard?: Partial<WizardForm>; missingDocuments?: string[];
  uploads?: { type: string; path: string; name: string; at: string }[];
  /** Where the draft was last edited ("app" | "website"), for staff and for the "newer copy" prompt. */
  lastEditedOn?: string;
  /** ISO time the app submitted the case (recorded at submit; drafts are created earlier, so created_at is not it). */
  submittedAt?: string;
};
export type Application = VisaRow & {
  status: AppStatus; reference: string; country_id: string | null;
  countries: { name: string; slug: string; flag_emoji: string | null } | null;
  applicants: Applicant[]; documents: Doc[];
  payments: { id: string; status: string; amount: number | null; currency: string; created_at: string }[];
  application_status_history: { to_status: string; created_at: string; note?: string | null }[];
  /** Amount from the server record (payment_amount) only; null until Ziina reports it. Never a client-side price. */
  total_amount: number | null; currency: string; notes: Notes;
};

const need = () => { if (!supabase) throw new Error("Backend not configured"); return supabase; };
async function me() {
  const { data, error } = await need().auth.getUser();
  // Offline / server unreachable: keep the original (retryable) error so autosave keeps retrying instead of giving up.
  if (error && error.name === "AuthRetryableFetchError") throw error;
  if (!data.user?.email) throw new Error("Please sign in first");
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}
export const parseNotes = (s: string | null): Notes => { if (!s) return {}; try { const j = JSON.parse(s); return j && typeof j === "object" ? j : {}; } catch { return { }; } };
/** Same display reference the website uses (#EZ-XXXXXXXX). The live table has no tracking_token column, so it is derived from the id. */
/** Paid per the backend (payment_status set by the Ziina webhook). Documents are uploaded only after this. */
export const isPaid = (a: { payment_status?: string | null }) => a.payment_status === "paid" || a.payment_status === "completed";
export const referenceOf = (id: string) => `EZ-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const slug = (n: string) => n.toLowerCase().replace(/\s+/g, "-");

/** Website doc types (web app/track/[token]/upload + app/dashboard/upload) and the has_* flag each one sets. */
export const DOC_FLAG: Record<string, keyof VisaRow> = {
  passportCopy: "has_passport", passportFront: "has_passport", passportBack: "has_passport", residencyCopy: "has_passport",
  photo: "has_photos", personalPhoto: "has_photos", passportPhoto: "has_photos",
  bankStatement: "has_bank_statements", nocCertificate: "has_employment_proof", salaryCertificate: "has_employment_proof",
};
export const DOC_TYPES = [
  { value: "passportCopy", label: "Passport" }, { value: "photo", label: "Photo" }, { value: "residencyCopy", label: "UAE visa & ID" },
  { value: "bankStatement", label: "Bank statement" }, { value: "nocCertificate", label: "NOC / employment" }, { value: "salaryCertificate", label: "Salary certificate" },
];

export type Requirement = { id: string; document_type: string; title: string; description: string | null; is_mandatory: boolean; provided_by_ezvisa: boolean; sort_order: number; country_id: string | null };
const REQS: Requirement[] = [
  { id: "req-passport", document_type: "passportCopy", title: "Passport bio page", description: "Clear colour copy", is_mandatory: true, provided_by_ezvisa: false, sort_order: 1, country_id: null },
  { id: "req-residency", document_type: "residencyCopy", title: "UAE residence visa / Emirates ID", description: null, is_mandatory: true, provided_by_ezvisa: false, sort_order: 2, country_id: null },
  { id: "req-photo", document_type: "photo", title: "Personal photo", description: "White background", is_mandatory: true, provided_by_ezvisa: false, sort_order: 3, country_id: null },
  { id: "req-bank", document_type: "bankStatement", title: "Bank statement", description: "Last 3-6 months, stamped", is_mandatory: true, provided_by_ezvisa: false, sort_order: 4, country_id: null },
  { id: "req-noc", document_type: "nocCertificate", title: "NOC / employment proof", description: null, is_mandatory: true, provided_by_ezvisa: false, sort_order: 5, country_id: null },
  { id: "req-dossier", document_type: "final_package", title: "Cover letter, itinerary & bookings", description: null, is_mandatory: false, provided_by_ezvisa: true, sort_order: 6, country_id: null },
];
/** Employment status of a row: the app's wizard notes, else the website's top-level additional_notes key (rows the
 *  website created have no wizard), same rule as continueForm. Drives whether the NOC is required. */
export const employmentOf = (a: { notes?: Notes | null }) => a.notes?.wizard?.employmentStatus || a.notes?.employmentStatus || null;
/** The website has no requirements table; this is the website's upload checklist. */
/** NOC applies only to employees (the wizard asks it only for "employed"); self-employed / other statuses never get it. */
export function requirementsFor(employmentStatus?: string | null): Requirement[] {
  return employmentStatus && employmentStatus !== "employed" ? REQS.filter((r) => r.document_type !== "nocCertificate") : REQS;
}
export async function listRequirements(_countryId?: string | null, employmentStatus?: string | null): Promise<Requirement[]> {
  return requirementsFor(employmentStatus);
}

/** Documents are inferred from the row: uploads recorded by this app (exact type) and the website's has_* flags. */
function docsOf(r: VisaRow, n: Notes): Doc[] {
  const out: Doc[] = [];
  const seen = new Set<string>();
  for (const u of n.uploads ?? []) {
    out.push({ id: `up-${u.path}`, document_type: u.type, requirement_id: REQS.find((q) => q.document_type === u.type)?.id ?? null, status: "uploaded", source: "customer", storage_path: u.path, file_name: u.name, rejection_reason: null, created_at: u.at });
    seen.add(DOC_FLAG[u.type] as string);
  }
  const flagDoc: [keyof VisaRow, string][] = [["has_passport", "passportCopy"], ["has_photos", "photo"], ["has_bank_statements", "bankStatement"], ["has_employment_proof", "nocCertificate"]];
  for (const [col, type] of flagDoc) if (r[col] === true && !seen.has(col as string))
    // No upload time is known for a website upload (only the flag), so none is given: updated_at moves on every edit,
    // including the staff edit that writes document_reviews, and would make every review look older than the file.
    out.push({ id: `flag-${col}`, document_type: type, requirement_id: REQS.find((q) => q.document_type === type)?.id ?? null, status: "uploaded", source: "customer", storage_path: "", file_name: null, rejection_reason: null, created_at: "" });
  // Staff review per document (document_reviews column, migrations/0005). A newer upload than the review resets it to "uploaded".
  const reviews = ((r as any).document_reviews ?? {}) as Record<string, { status?: string; reason?: string | null; at?: string }>;
  for (const [type, rv] of Object.entries(reviews)) {
    if (!rv || !["under_review", "approved", "rejected"].includes(rv.status ?? "")) continue;
    const t = type === "salaryCertificate" ? "nocCertificate" : type;
    const latest = out.filter((d) => d.document_type === t).sort((x, y) => (y.created_at ?? "").localeCompare(x.created_at ?? ""))[0];
    if (latest && rv.at && latest.created_at && latest.created_at > rv.at) continue;
    if (latest) Object.assign(latest, { status: rv.status, rejection_reason: rv.status === "rejected" ? rv.reason ?? null : null });
    else if (rv.status === "rejected") out.push({ id: `rev-${t}`, document_type: t, requirement_id: REQS.find((q) => q.document_type === t)?.id ?? null, status: "rejected", source: "customer", storage_path: "", file_name: null, rejection_reason: rv.reason ?? null, created_at: rv.at ?? "" });
  }
  // No document row is made up for EZvisa's own files (audit H4): the live table has no record of them, so the
  // checklist shows them as ready only from the real application_status (lib/checklist.ts), with nothing to open.
  return out;
}

export function toApplication(r: VisaRow): Application {
  const n = parseNotes(r.additional_notes);
  const spouse = n.spouseAccompanying === "yes" || n.wizard?.spouseAccompanying === "yes";
  const status = r.application_status ?? "submitted";
  const name = r.destination_country || "";
  const w = n.wizard ?? {};
  const applicants: Applicant[] = [{ id: `${r.id}-p`, is_primary: true, first_name: w.firstName ?? r.full_name.split(" ")[0] ?? "", last_name: w.lastName ?? r.full_name.split(" ").slice(1).join(" "), passport_number: r.passport_number ?? (w.passportNumber || null), passport_expiry_date: null }];
  if (spouse && w.spouseFirstName) applicants.push({ id: `${r.id}-s`, is_primary: false, first_name: w.spouseFirstName, last_name: w.spouseLastName ?? "", passport_number: null, passport_expiry_date: null });
  const total = r.payment_amount != null ? Number(r.payment_amount) : null;
  const history = [{ to_status: "submitted", created_at: r.created_at ?? "" }];
  if (status !== "submitted" && status !== "draft") history.push({ to_status: status, created_at: r.updated_at ?? "" });
  return {
    ...r, status, reference: referenceOf(r.id), country_id: null, notes: n,
    countries: name ? { name, slug: slug(name), flag_emoji: null } : null,
    applicants, documents: docsOf(r, n),
    payments: r.payment_id ? [{ id: r.payment_id, status: r.payment_status ?? "pending", amount: total, currency: "AED", created_at: r.updated_at ?? "" }] : [],
    application_status_history: status === "draft" ? [] : history,
    total_amount: total, currency: "AED",
  };
}

/** Same query as the website dashboard (app/dashboard/page.tsx): rows whose email is the signed-in user's email. */
export async function listApplications(): Promise<Application[]> {
  const u = await me();
  const { data, error } = await need().from("visa_applications").select("*").eq("email", u.email).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toApplication);
}
export async function getApplication(id: string): Promise<Application> {
  const u = await me();
  const { data, error } = await need().from("visa_applications").select("*").eq("id", id).eq("email", u.email).single();
  if (error) throw error;
  return toApplication(data);
}

const days = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
/** Column mapping identical to web /api/submit-application, plus the full wizard state for cross-device resume. */
function columns(f: WizardForm, email: string, step: string, prev: Notes = {}, question?: string): VisaUpdate {
  const t = (s: string) => (s ?? "").trim();
  return {
    full_name: `${t(f.firstName)} ${t(f.lastName)}`.trim() || "Draft", email, phone: t(f.phone), nationality: t(f.nationality),
    destination_country: t(f.destination), date_of_birth: f.dateOfBirth || null, entry_date: f.travelStartDate || null, exit_date: f.travelEndDate || null,
    travel_purpose: t(f.purposeOfTrip), passport_number: t(f.passportNumber) || null,
    duration_days: f.travelStartDate && f.travelEndDate ? days(f.travelStartDate, f.travelEndDate) : null,
    previous_schengen_visa: f.isFirstSchengenVisa ? f.isFirstSchengenVisa === "no" : false,
    previous_rejections: f.previousRefusals === "yes",
    rejection_details: f.previousRefusals === "yes" ? t(f.refusalDetails) || null : null,
    user_agent: `EZvisa app (${Platform.OS})`, referrer: "ezvisa-mobile-app",
    additional_notes: JSON.stringify({
      ...prev,
      maritalStatus: f.maritalStatus, employmentStatus: f.employmentStatus, jobTitle: t(f.jobTitle), companyName: t(f.companyName),
      monthlySalary: f.monthlySalary, spouseAccompanying: f.spouseAccompanying || "no",
      // A draft started on the website keeps its source; the step is always overwritten (undefined drops a stale question).
      source: prev.source ?? "mobile-app", platform: Platform.OS, lastEditedOn: "app", wizardStep: step, wizardQuestion: question ? question.replace(/^q:/, "") : undefined,
      ...(t(f.email).toLowerCase() !== email ? { contactEmail: t(f.email).toLowerCase() } : {}),
      missingDocuments: missingDocs(f),
      wizard: { ...f },
    } satisfies Notes),
  };
}

// ---------------- Drafts: autosave with stale-copy detection ----------------
// The table has no version column, so updated_at is the version: every write is `... where updated_at = <the value we
// last saw>`, and 0 rows updated means someone else (the website, another phone) saved in between. The new value is
// always read back from the server, never compared with this phone's clock. Ids are made on the phone and stored
// before the first insert, so a save interrupted after the insert (app killed, response lost) updates that same row.

/** The draft as stored on the server: answers, where the user was, and its version. */
export type ServerDraft = { id: string; form: WizardForm; step: string; question: string | null; updatedAt: string | null; status: string; editedOn: string | null; fingerprint: string };
export type DraftSaveResult =
  | { ok: true; id: string; updatedAt: string }
  /** newer: saved elsewhere since we last saw it · existing: an open draft for the same country already exists ·
   *  closed: submitted / cancelled elsewhere · gone: the row no longer exists (or is no longer visible). */
  | { ok: false; reason: "newer" | "existing" | "closed" | "gone"; server: ServerDraft | null };

/** Same instant (the server may return the timestamp in a different text form than the one we hold). */
export const sameVersion = (a?: string | null, b?: string | null) => !!a && !!b && (a === b || Date.parse(a) === Date.parse(b));
/** Stable text of the saved content (answers + step + question), so the same content always gives the same value. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().filter((k) => (v as any)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}
/** Short hash of what a save writes. Used to tell "the server copy is what we saved" from "someone else changed it". */
export function fingerprint(f: Partial<WizardForm>, step: string, question: string | null): string {
  const s = stable({ f: JSON.parse(JSON.stringify(f ?? {})), s: step, q: question ? question.replace(/^q:/, "") : null });
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}.${s.length}`;
}
const DRAFT_COLS = "id, application_status, additional_notes, updated_at";
function toServerDraft(r: { id: string; application_status: string | null; additional_notes: string | null; updated_at: string | null }): ServerDraft {
  const n = parseNotes(r.additional_notes); const w = n.wizard ?? {};
  const step = n.wizardStep ?? "personal"; const question = n.wizardQuestion ?? null;
  return { id: r.id, form: { ...emptyForm, ...w }, step, question, updatedAt: r.updated_at, status: r.application_status ?? "submitted", editedOn: n.lastEditedOn ?? (n.source === "mobile-app" ? "app" : n.wizard ? "website" : null), fingerprint: fingerprint(w, step, question) };
}
export async function getDraft(id: string): Promise<ServerDraft | null> {
  const u = await me();
  const { data, error } = await need().from("visa_applications").select(DRAFT_COLS).eq("id", id).eq("email", u.email).maybeSingle();
  if (error) throw error;
  return data ? toServerDraft(data) : null;
}
/** Newest open draft of this account for a destination (any device), to offer it instead of creating a second one. */
export async function findOpenDraft(destination: string, exceptIds: string[] = []): Promise<ServerDraft | null> {
  if (!destination) return null;
  const u = await me();
  const { data, error } = await need().from("visa_applications").select(DRAFT_COLS).eq("email", u.email).eq("application_status", "draft").eq("destination_country", destination).order("updated_at", { ascending: false }).limit(5);
  if (error) throw error;
  const r = (data ?? []).find((x) => !exceptIds.includes(x.id));
  return r ? toServerDraft(r) : null;
}

/** Saves the signed-in user's draft row (application_status "draft") without ever overwriting newer data.
 *  `base` is the server version this phone last confirmed (null = never confirmed). `known` are fingerprints of content
 *  this phone wrote itself (last confirmed + the save in flight), so a version bump that changed nothing we care about,
 *  or our own write whose answer was lost, is adopted instead of reported as a conflict.
 *  `checkExisting`: before the first insert, look for an open draft for the same destination (no duplicates). */
export async function saveDraft(f: WizardForm, step: string, id: string, base: string | null, question: string | undefined, known: string[], checkExisting: boolean): Promise<DraftSaveResult> {
  const sb = need(); const u = await me();
  const { data: cur, error: ce } = await sb.from("visa_applications").select(DRAFT_COLS).eq("id", id).eq("email", u.email).maybeSingle();
  if (ce) throw ce;
  const now = new Date().toISOString(); // overwritten by the updated_at trigger where it exists; read back either way
  if (!cur) {
    if (base) return { ok: false, reason: "gone", server: null };
    if (checkExisting) { const other = await findOpenDraft(f.destination.trim(), [id]); if (other) return { ok: false, reason: "existing", server: other }; }
    const { data, error } = await sb.from("visa_applications").insert({ id, ...(columns(f, u.email, step, {}, question) as any), application_status: "draft", payment_status: "pending", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false, updated_at: now }).select("updated_at").single();
    if (error) throw error;
    return { ok: true, id, updatedAt: data.updated_at ?? now };
  }
  const server = toServerDraft(cur);
  if (server.status !== "draft") return { ok: false, reason: "closed", server };
  if (!sameVersion(cur.updated_at, base) && !known.includes(server.fingerprint)) return { ok: false, reason: "newer", server };
  const { data, error } = await sb.from("visa_applications").update({ ...columns(f, u.email, step, parseNotes(cur.additional_notes), question), updated_at: now })
    .eq("id", id).eq("email", u.email).eq("application_status", "draft").eq("updated_at", cur.updated_at as string).select("updated_at");
  if (error) throw error;
  if (data?.[0]) return { ok: true, id, updatedAt: data[0].updated_at ?? now };
  const again = await getDraft(id); // changed between our read and our write
  return { ok: false, reason: !again ? "gone" : again.status !== "draft" ? "closed" : "newer", server: again };
}

/** Guest checkout (no account yet): RLS "Allow public submissions" lets anon INSERT, but anon cannot SELECT the row back,
 *  so the id is made on the phone and nothing is returned. Payment then goes through /api/create-payment (links payment_id
 *  server-side) and the Ziina webhook marks it paid. Signing in later with the same email makes the row visible (SELECT by email). */
export async function guestSubmit(f: WizardForm, id: string = Crypto.randomUUID()): Promise<{ id: string; reference: string; email: string }> {
  const sb = need(); const email = f.email.trim().toLowerCase();
  const { error } = await sb.from("visa_applications").insert({ id, ...(columns(f, email, "payment", { submittedAt: new Date().toISOString() }) as any), application_status: "submitted", payment_status: "pending", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false });
  // Same id again (the caller keeps it per submit): the earlier attempt landed and only its reply was lost.
  if (error && error.code !== "23505") throw error;
  return { id, reference: referenceOf(id), email };
}

/** Latest unsubmitted draft for this account (started on any device), for resume at the exact question. */
export async function latestDraft(): Promise<ServerDraft | null> {
  const u = await me();
  const { data, error } = await need().from("visa_applications").select(DRAFT_COLS).eq("email", u.email).eq("application_status", "draft").order("updated_at", { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] ? toServerDraft(data[0]) : null;
}

/** Thrown when the draft changed elsewhere after this phone's last confirmed save; nothing was written. */
export class DraftConflictError extends Error { constructor() { super("This application was changed on another device."); } }

/** Submits: the draft row becomes application_status "submitted", payment_status "pending", like the website.
 *  Call after the draft was saved (`base` = its confirmed version). Idempotent: if it is already submitted it is
 *  returned; if it changed elsewhere since `base`, nothing is written and DraftConflictError is thrown. */
export async function submitApplication(f: WizardForm, id: string, base: string | null): Promise<Application> {
  const sb = need(); const u = await me();
  const { data: cur, error: ce } = await sb.from("visa_applications").select("*").eq("id", id).eq("email", u.email).single();
  if (ce) throw ce;
  if (cur.application_status !== "draft") return toApplication(cur);
  if (!sameVersion(cur.updated_at, base)) throw new DraftConflictError();
  const { data, error } = await sb.from("visa_applications").update({ ...columns(f, u.email, "payment", { ...parseNotes(cur.additional_notes ?? null), submittedAt: new Date().toISOString() }), application_status: "submitted", payment_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", id).eq("application_status", "draft").eq("updated_at", cur.updated_at as string).select("*");
  if (error) throw error;
  if (data?.[0]) return toApplication(data[0]);
  const { data: again, error: ae } = await sb.from("visa_applications").select("*").eq("id", id).single(); // a parallel call won the race
  if (ae) throw ae;
  if (again.application_status === "draft") throw new DraftConflictError();
  return toApplication(again);
}

/** Read-modify-write of one key in additional_notes (keeps uploads, wizard, website keys). RLS lets customers update only
 *  while the case is draft/submitted, so `synced` is false when the row was not writable (e.g. already in review). */
export async function patchNotes(applicationId: string, patch: Partial<Notes>): Promise<{ synced: boolean }> {
  const sb = need(); const u = await me();
  const { data: cur, error: ce } = await sb.from("visa_applications").select("id, additional_notes, application_status").eq("id", applicationId).eq("email", u.email).single();
  if (ce) throw ce;
  const n = { ...parseNotes(cur.additional_notes), ...patch };
  const { data, error } = await sb.from("visa_applications").update({ additional_notes: JSON.stringify(n) }).eq("id", applicationId).eq("email", u.email).select("id");
  if (error) throw error;
  return { synced: !!data?.length };
}

/** Every answer of this row as a form: the wizard notes, with the website's columns as fallback (rows from the website,
 *  or answers written by staff), so Continue application only asks what is really missing. */
export function continueForm(a: Pick<Application, "notes"> & Partial<VisaRow>): WizardForm {
  const w = (a.notes?.wizard ?? {}) as Partial<WizardForm>; const n = a.notes as any;
  const yn = (b: boolean | null | undefined): WizardForm["previousRefusals"] => (b === true ? "yes" : b === false ? "no" : "");
  return {
    ...emptyForm, ...w,
    employmentStatus: w.employmentStatus || n?.employmentStatus || "", jobTitle: w.jobTitle || n?.jobTitle || "", companyName: w.companyName || n?.companyName || "",
    monthlySalary: w.monthlySalary || n?.monthlySalary || "", maritalStatus: w.maritalStatus || n?.maritalStatus || "", spouseAccompanying: w.spouseAccompanying || n?.spouseAccompanying || "",
    passportNumber: w.passportNumber || a.passport_number || "", dateOfBirth: w.dateOfBirth || a.date_of_birth || "",
    travelStartDate: w.travelStartDate || a.entry_date || "", travelEndDate: w.travelEndDate || a.exit_date || "", purposeOfTrip: w.purposeOfTrip || a.travel_purpose || "",
    previousRefusals: w.previousRefusals || (a.previous_rejections == null ? "" : yn(a.previous_rejections)),
    refusalDetails: w.refusalDetails || a.rejection_details || "",
  } as WizardForm;
}
/** Paid, still open, and the answers asked after payment are not all there yet. */
export const needsContinue = (a: Application) => {
  if (!isPaid(a) || !["submitted", "draft", "reviewing"].includes(a.status)) return false;
  const f = continueForm(a);
  // Rows from the website asked everything before payment there; only the passport number and employment may be missing.
  if (a.notes?.source !== "mobile-app") return !employmentComplete(f) || (f.hasValidPassport !== "no" && !f.passportNumber.trim());
  return !continueComplete(f);
};

/** A row keeps where it came from. Rows the website created have no `source`; after the app saves the answers asked after
 *  payment they stay website rows, so Continue keeps asking only what the website did not (needsContinue) and the
 *  timeline keeps created_at as their real submit time. App rows already carry source "mobile-app". */
export const keepOrigin = (prev: Notes): Notes => ({ ...prev, source: prev.source ?? "website" });
/** Saves the answers asked after payment (Continue application): the same columns the website reads (dates, purpose,
 *  date of birth, passport number, refusals ...) and additional_notes (wizard + the website's keys). While the case is in
 *  review the guard trigger (migrations/0002) keeps only additional_notes, which also hold every answer (wizard).
 *  `synced` is false when the row was not writable. */
export async function saveAfterPayment(applicationId: string, f: WizardForm): Promise<{ synced: boolean }> {
  const sb = need(); const u = await me();
  const { data: cur, error: ce } = await sb.from("visa_applications").select("email, additional_notes").eq("id", applicationId).eq("email", u.email).single();
  if (ce) throw ce;
  const prev = parseNotes(cur.additional_notes);
  const { user_agent: _ua, referrer: _ref, ...cols } = columns(f, cur.email ?? u.email, prev.wizardStep ?? "payment", keepOrigin(prev)) as any;
  const { data, error } = await sb.from("visa_applications").update({ ...cols, updated_at: new Date().toISOString() }).eq("id", applicationId).eq("email", u.email).select("id");
  if (error) throw error;
  return { synced: !!data?.length };
}

export class UploadError extends Error { constructor(message: string, public network: boolean) { super(message); } }
/** Statuses in which a paid case still takes documents (the detail screen uses the same list). */
export const UPLOAD_STATUSES = ["draft", "submitted", "reviewing", "awaiting_documents"];
const isNetwork = (e: any) => { const m = String(e?.message ?? e).toLowerCase(); return m.includes("network") || m.includes("timeout") || m.includes("offline") || m.includes("failed to fetch"); };

/** Same bucket + path scheme as the website's /api/upload-document: visa_documents/<applicationId>/<type>_<id>.<ext>.
 *  <id> is the queue job's stable UUID, so every retry of one upload targets the same object (no duplicates). */
export const DOC_BUCKET = "visa_documents";
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png" };
/** Only the website's document types (DOC_FLAG keys) and its file types (PDF/JPG/PNG) are ever sent. */
export const isUploadType = (documentType: string) => Object.prototype.hasOwnProperty.call(DOC_FLAG, documentType);
export const isUploadMime = (mime: string) => mime in EXT;

/** multipart POST with real upload progress (fetch has none). Rejects only on network failure. */
function postForm(url: string, fd: FormData, token: string | null, onProgress?: (fraction: number) => void): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", url);
    if (token) x.setRequestHeader("Authorization", `Bearer ${token}`);
    if (onProgress) x.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total)); };
    x.onload = () => { let json: any = {}; try { json = JSON.parse(x.responseText); } catch {} resolve({ status: x.status, json }); };
    x.onerror = () => reject(new Error("Network request failed"));
    x.ontimeout = () => reject(new Error("Network timeout"));
    x.send(fd);
  });
}
/** Object path for one upload. Pure, used by tests. */
export const docPath = (applicationId: string, documentType: string, uploadId: string, type: string) => `${applicationId}/${documentType}_${uploadId}.${EXT[type] ?? "jpg"}`;
const alreadyThere = (m: string) => /already exists|duplicate|\b409\b/i.test(m);

/** 1) Upload through the website (POST /api/upload-document, multipart: file, applicationId, documentType, uploadId), exactly
 *     like web app/dashboard/upload; the server stores the file and flips the matching has_* flag.
 *  2) If the website route is not configured (it currently answers 500 "Storage not configured"), upload directly to the
 *     same bucket/path with the user's own session and set the has_* flag ourselves. This needs the storage policy in
 *     db/proposed-live-changes.sql; until it is approved the direct upload is refused and the error is shown.
 *  Idempotent per uploadId: "already exists" means an earlier attempt got through, which counts as success. */
export async function uploadDocument(applicationId: string, file: { uri: string; name: string; mimeType?: string | null; size?: number | null }, documentType: string, uploadId: string, onProgress?: (fraction: number) => void) {
  const sb = need();
  try {
    if (!isUploadType(documentType)) throw new UploadError("This document type can't be uploaded.", false);
    const raw = file.mimeType || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const type = raw === "image/jpg" ? "image/jpeg" : raw;
    if (!isUploadMime(type)) throw new UploadError("Only PDF, JPG or PNG files.", false);
    const u = await me();
    // Documents are uploaded only after payment, and only while the case can still change (same rule as the detail screen).
    const { data: row, error: re } = await sb.from("visa_applications").select("payment_status, application_status").eq("id", applicationId).eq("email", u.email).single();
    if (re) throw re;
    if (!isPaid(row)) throw new UploadError("Documents can be uploaded after payment.", false);
    if (!UPLOAD_STATUSES.includes(row.application_status ?? "submitted")) throw new UploadError("This application can't take new documents.", false);
    const token = (await sb.auth.getSession()).data.session?.access_token ?? null;
    let path: string | null = null; let viaSite = "";
    try {
      const fd = new FormData();
      if (Platform.OS === "web") { const blob = await (await fetch(file.uri)).blob(); fd.append("file", new File([blob], file.name, { type })); }
      else fd.append("file", { uri: file.uri, name: file.name, type } as any);
      fd.append("applicationId", applicationId); fd.append("documentType", documentType); fd.append("uploadId", uploadId);
      // The user's session token goes with the file so the website can check who is uploading (audit B2).
      const res = await postForm(siteUrl("/api/upload-document"), fd, token, onProgress);
      const j = res.json ?? {};
      if (res.status >= 200 && res.status < 300 && j.success) path = String(j.path ?? "");
      else if (res.status === 400 || res.status === 401 || res.status === 403) throw new UploadError(j.error || `Upload refused (${res.status})`, false);
      else viaSite = j.error || `HTTP ${res.status}`;
    } catch (e: any) {
      if (e instanceof UploadError) throw e;
      if (isNetwork(e)) throw new UploadError(e?.message ?? "Network request failed", true); // offline: retry later, don't fall through
      viaSite = e?.message ?? "network";
    }
    if (path === null) {
      const p = docPath(applicationId, documentType, uploadId, type);
      const body = await (await fetch(file.uri)).arrayBuffer();
      const { error: ue } = await sb.storage.from(DOC_BUCKET).upload(p, body, { contentType: type, upsert: false });
      if (ue && !alreadyThere(ue.message)) throw new UploadError(/row-level security|not found|unauthorized|403|bucket/i.test(ue.message) ? `Uploads aren't enabled on the server yet (${viaSite || "website upload unavailable"}). Please send the file on WhatsApp for now.` : ue.message, isNetwork(ue));
      path = p;
      const col = DOC_FLAG[documentType];
      if (col) await sb.from("visa_applications").update({ [col]: true } as VisaUpdate).eq("id", applicationId).eq("email", u.email);
    }
    const { data: cur } = await sb.from("visa_applications").select("additional_notes").eq("id", applicationId).eq("email", u.email).single();
    const n = parseNotes(cur?.additional_notes ?? null);
    if (!(n.uploads ?? []).some((x) => x.path === path)) {
      n.uploads = [...(n.uploads ?? []), { type: documentType, path, name: file.name, at: new Date().toISOString() }];
      await sb.from("visa_applications").update({ additional_notes: JSON.stringify(n) }).eq("id", applicationId);
    }
  } catch (e: any) {
    if (e instanceof UploadError) throw e;
    throw new UploadError(e?.message ?? String(e), isNetwork(e));
  }
}

/** Signed links live this long: opened at once, useless to anyone a minute later. Never a public URL. */
export const SIGNED_URL_SECONDS = 60;
/** Short-lived signed link to one of the user's own files. Storage RLS decides: the read policy only covers the user's own
 *  application folder (migrations/0011, proposed). Returns null when the file can't be opened by this user
 *  (no path recorded, policy not in place, or someone else's file). */
export async function openDocumentUrl(path: string): Promise<string | null> {
  if (!path || !supabase) return null;
  const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return error || !data?.signedUrl ? null : data.signedUrl;
}

// The live DB has no notifications table: the inbox is derived from the real application rows; read state is kept on the device.
export type Notification = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; application_id: string | null };
const READ_KEY = "ezvisa.notifications.read.v1";
async function readSet() { try { return new Set<string>(JSON.parse((await AsyncStorage.getItem(READ_KEY)) ?? "[]")); } catch { return new Set<string>(); } }
/** Pass `loaded` when the caller already has the applications (saves a second query, audit M12). */
export async function listNotifications(loaded?: Application[]): Promise<Notification[]> {
  const [apps, read] = await Promise.all([loaded ? Promise.resolve(loaded) : listApplications(), readSet()]);
  const out: Notification[] = [];
  for (const a of apps) {
    const where = a.countries?.name ?? "your trip";
    if (a.status === "draft") continue;
    out.push({ id: `${a.id}-submitted`, title: `${where} application submitted`, body: `${a.reference} · We'll review your details.`, created_at: a.created_at ?? "", read_at: null, application_id: a.id });
    if (a.payment_status === "paid" || a.payment_status === "completed") out.push({ id: `${a.id}-paid`, title: "Payment received", body: `${a.reference} · Thank you.`, created_at: a.updated_at ?? "", read_at: null, application_id: a.id });
    if (a.status === "reviewing") out.push({ id: `${a.id}-reviewing`, title: "Your file is in review", body: a.reference, created_at: a.updated_at ?? "", read_at: null, application_id: a.id });
    if (a.status === "ready") out.push({ id: `${a.id}-ready`, title: "Your file is ready", body: `${a.reference} · Open it to download.`, created_at: a.updated_at ?? "", read_at: null, application_id: a.id });
  }
  return out.map((n) => ({ ...n, read_at: read.has(n.id) ? n.created_at : null })).sort((x, y) => y.created_at.localeCompare(x.created_at));
}
export async function markRead(ids: string[]) {
  if (!ids.length) return;
  const s = await readSet(); ids.forEach((i) => s.add(i));
  await AsyncStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

const PUSH_TOKEN_KEY = "ezvisa.push.token";
/** Stores this phone's Expo push token in device_tokens for the signed-in user (RLS: own rows only; user_id/email come from the session server-side).
 * claim_device_token (migration 0012) also takes the token off any other account that last used this phone. Until it is applied,
 * a plain insert is used and an existing row gets a fresh updated_at (notify-status sends a shared token only to its latest owner). */
export async function registerPushToken(token: string) {
  const prev = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const platform = Platform.OS === "android" ? "android" : "ios";
  if (prev && prev !== token) await supabase.from("device_tokens" as any).delete().eq("token", prev).then(() => {}, () => {}); // rotated token
  const claim: { error: { code?: string } | null } = await (supabase as any).rpc("claim_device_token", { p_token: token, p_platform: platform });
  if (!claim.error) return;
  if (claim.error.code !== "PGRST202") throw claim.error; // PGRST202 = function not in the database yet
  const { error } = await supabase.from("device_tokens" as any).insert({ token, platform } as any);
  if (error?.code === "23505") { await supabase.from("device_tokens" as any).update({ updated_at: new Date().toISOString() } as any).eq("token", token); return; }
  if (error) throw error;
}
/** Removes this phone's token from the signed-in account. false = the server could not be reached, so pushes would continue. */
export async function unregisterPushToken(): Promise<boolean> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  if (!token || !supabase) return true;
  try {
    const { error } = await supabase.from("device_tokens" as any).delete().eq("token", token);
    return !error;
  } catch { return false; }
}

export const STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Submitted", reviewing: "In review", awaiting_documents: "Documents needed", approved: "Approved", ready: "File ready", appointment_booked: "Appointment booked", completed: "Completed", rejected: "Refused", cancelled: "Cancelled", pending: "Unpaid", processing: "Processing", paid: "Paid", failed: "Payment failed", expired: "Payment expired", refunded: "Refunded", partially_refunded: "Part refunded", uploaded: "Uploaded", under_review: "Under review", generated: "Prepared by EZvisa", superseded: "Replaced" };

/** Discard an unpaid draft/submitted case (migration 0007: the guard trigger only allows this one change, never on paid rows). */
export async function cancelApplication(id: string): Promise<boolean> {
  const sb = need(); const u = await me();
  const { data, error } = await sb.from("visa_applications").update({ application_status: "cancelled" }).eq("id", id).eq("email", u.email)
    .in("application_status", ["draft", "submitted"]).not("payment_status", "in", "(paid,completed)").select("id, application_status");
  if (error) throw error;
  return !!data?.some((r: any) => r.application_status === "cancelled");
}
