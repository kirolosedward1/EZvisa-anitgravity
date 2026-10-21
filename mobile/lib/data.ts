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
import { siteUrl, PRICE_AED } from "./config";
import type { Database } from "./database.types";
import { emptyForm, type WizardForm } from "./wizard";

export type VisaRow = Database["public"]["Tables"]["visa_applications"]["Row"];
type VisaUpdate = Database["public"]["Tables"]["visa_applications"]["Update"];

/** Website application_status values (admin: submitted -> reviewing -> ready | cancelled) plus the app's "draft". */
export type AppStatus = "draft" | "submitted" | "reviewing" | "ready" | "cancelled" | string;
export type Doc = { id: string; document_type: string; requirement_id: string | null; status: string; source: string; storage_path: string; file_name: string | null; rejection_reason: string | null; created_at: string };
export type Applicant = { id: string; is_primary: boolean; first_name: string; last_name: string; passport_number: string | null; passport_expiry_date: string | null };
export type Notes = {
  maritalStatus?: string; employmentStatus?: string; jobTitle?: string; companyName?: string; monthlySalary?: string; spouseAccompanying?: string;
  source?: string; platform?: string; wizardStep?: string; wizardQuestion?: string; itinerary?: unknown; contactEmail?: string; wizard?: Partial<WizardForm>;
  uploads?: { type: string; path: string; name: string; at: string }[];
};
export type Application = VisaRow & {
  status: AppStatus; reference: string; country_id: string | null;
  countries: { name: string; slug: string; flag_emoji: string | null } | null;
  applicants: Applicant[]; documents: Doc[];
  payments: { id: string; status: string; amount: number; currency: string; created_at: string }[];
  application_status_history: { to_status: string; created_at: string; note?: string | null }[];
  total_amount: number; currency: string; notes: Notes;
};

const need = () => { if (!supabase) throw new Error("Backend not configured"); return supabase; };
async function me() {
  const { data } = await need().auth.getUser();
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
/** The website has no requirements table; this is the website's upload checklist. */
/** NOC applies only to employees (the wizard asks it only for "employed"); self-employed / other statuses never get it. */
export async function listRequirements(_countryId?: string | null, employmentStatus?: string | null): Promise<Requirement[]> {
  return employmentStatus && employmentStatus !== "employed" ? REQS.filter((r) => r.document_type !== "nocCertificate") : REQS;
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
    out.push({ id: `flag-${col}`, document_type: type, requirement_id: REQS.find((q) => q.document_type === type)?.id ?? null, status: "uploaded", source: "customer", storage_path: "", file_name: null, rejection_reason: null, created_at: r.updated_at ?? r.created_at ?? "" });
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
  if (r.application_status === "ready")
    out.push({ id: "final", document_type: "final_package", requirement_id: "req-dossier", status: "generated", source: "generated", storage_path: `${r.id}/final_package.pdf`, file_name: "Your EZvisa dossier", rejection_reason: null, created_at: r.updated_at ?? "" });
  return out;
}

export function toApplication(r: VisaRow): Application {
  const n = parseNotes(r.additional_notes);
  const spouse = n.spouseAccompanying === "yes" || n.wizard?.spouseAccompanying === "yes";
  const status = r.application_status ?? "submitted";
  const name = r.destination_country || "";
  const w = n.wizard ?? {};
  const applicants: Applicant[] = [{ id: `${r.id}-p`, is_primary: true, first_name: w.firstName ?? r.full_name.split(" ")[0] ?? "", last_name: w.lastName ?? r.full_name.split(" ").slice(1).join(" "), passport_number: r.passport_number, passport_expiry_date: null }];
  if (spouse && w.spouseFirstName) applicants.push({ id: `${r.id}-s`, is_primary: false, first_name: w.spouseFirstName, last_name: w.spouseLastName ?? "", passport_number: null, passport_expiry_date: null });
  const total = r.payment_amount != null ? Number(r.payment_amount) : PRICE_AED * (spouse ? 2 : 1);
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
      source: "mobile-app", platform: Platform.OS, wizardStep: step, ...(question ? { wizardQuestion: question.replace(/^q:/, "") } : {}),
      ...(t(f.email).toLowerCase() !== email ? { contactEmail: t(f.email).toLowerCase() } : {}),
      wizard: { ...f },
    } satisfies Notes),
  };
}

/** Creates or updates the signed-in user's draft row (application_status "draft"). Returns the row id.
 *  If the row was already submitted (e.g. a second tap, or a retry after a lost response) it is returned unchanged:
 *  we never insert a second row for the same case. */
export async function saveDraft(f: WizardForm, step: string, id?: string | null, question?: string): Promise<string> {
  const sb = need(); const u = await me();
  if (id) {
    const { data: cur, error: ce } = await sb.from("visa_applications").select("id, application_status, additional_notes").eq("id", id).eq("email", u.email).maybeSingle();
    if (ce) throw ce;
    if (cur && cur.application_status === "draft") {
      const { error } = await sb.from("visa_applications").update(columns(f, u.email, step, parseNotes(cur.additional_notes), question)).eq("id", id).eq("application_status", "draft");
      if (error) throw error;
      return id;
    }
    if (cur) return id; // already submitted / in review: keep the same row
  }
  const { data, error } = await sb.from("visa_applications").insert({ ...(columns(f, u.email, step, {}, question) as any), application_status: "draft", payment_status: "pending", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false }).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Guest checkout (no account yet): RLS "Allow public submissions" lets anon INSERT, but anon cannot SELECT the row back,
 *  so the id is made on the phone and nothing is returned. Payment then goes through /api/create-payment (links payment_id
 *  server-side) and the Ziina webhook marks it paid. Signing in later with the same email makes the row visible (SELECT by email). */
export async function guestSubmit(f: WizardForm): Promise<{ id: string; reference: string; email: string }> {
  const sb = need(); const email = f.email.trim().toLowerCase();
  const id = Crypto.randomUUID();
  const { error } = await sb.from("visa_applications").insert({ id, ...(columns(f, email, "payment", {}) as any), application_status: "submitted", payment_status: "pending", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false });
  if (error) throw error;
  return { id, reference: referenceOf(id), email };
}

/** Latest unsubmitted draft for this account (started on any device), for resume at the exact question. */
export async function latestDraft(): Promise<{ id: string; form: WizardForm; step: string; question: string | null; updatedAt: string | null } | null> {
  const u = await me();
  const { data, error } = await need().from("visa_applications").select("id, additional_notes, updated_at").eq("email", u.email).eq("application_status", "draft").order("updated_at", { ascending: false }).limit(1);
  if (error) throw error;
  const r = data?.[0]; if (!r) return null;
  const n = parseNotes(r.additional_notes);
  return { id: r.id, form: { ...emptyForm, ...(n.wizard ?? {}) }, step: n.wizardStep ?? "personal", question: n.wizardQuestion ?? null, updatedAt: r.updated_at };
}

/** Submits: the draft row becomes application_status "submitted", payment_status "pending", like the website.
 *  Idempotent: the same row is updated, and if it is already submitted it is simply returned. */
export async function submitApplication(f: WizardForm, draftId?: string | null): Promise<Application> {
  const sb = need(); const u = await me();
  const id = await saveDraft(f, "payment", draftId);
  const { data: cur, error: ce } = await sb.from("visa_applications").select("*").eq("id", id).eq("email", u.email).single();
  if (ce) throw ce;
  if (cur.application_status !== "draft") return toApplication(cur);
  const { data, error } = await sb.from("visa_applications").update({ ...columns(f, u.email, "payment", parseNotes(cur.additional_notes ?? null)), application_status: "submitted", payment_status: "pending" }).eq("id", id).eq("application_status", "draft").select("*");
  if (error) throw error;
  if (data?.[0]) return toApplication(data[0]);
  const { data: again, error: ae } = await sb.from("visa_applications").select("*").eq("id", id).single(); // a parallel call won the race
  if (ae) throw ae;
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

export class UploadError extends Error { constructor(message: string, public network: boolean) { super(message); } }
const isNetwork = (e: any) => { const m = String(e?.message ?? e).toLowerCase(); return m.includes("network") || m.includes("timeout") || m.includes("offline") || m.includes("failed to fetch"); };

/** Same bucket + path scheme as the website's /api/upload-document: visa_documents/<applicationId>/<type>_<rand8>.<ext>. */
export const DOC_BUCKET = "visa_documents";
const rand8 = () => Math.random().toString(16).slice(2, 10).padEnd(8, "0");

/** 1) Upload through the website (POST /api/upload-document, multipart: file, applicationId, documentType), exactly like
 *     web app/dashboard/upload; the server stores the file and flips the matching has_* flag.
 *  2) If the website route is not configured (it currently answers 500 "Storage not configured"), upload directly to the
 *     same bucket/path with the user's own session and set the has_* flag ourselves. This needs the storage policy in
 *     db/proposed-live-changes.sql; until it is approved the direct upload is refused and the error is shown. */
export async function uploadDocument(applicationId: string, file: { uri: string; name: string; mimeType?: string | null; size?: number | null }, documentType: string, _requirementId?: string | null) {
  const sb = need();
  try {
    const u = await me();
    const type = file.mimeType || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    let path: string | null = null; let viaSite = "";
    try {
      const fd = new FormData();
      if (Platform.OS === "web") { const blob = await (await fetch(file.uri)).blob(); fd.append("file", new File([blob], file.name, { type })); }
      else fd.append("file", { uri: file.uri, name: file.name, type } as any);
      fd.append("applicationId", applicationId); fd.append("documentType", documentType);
      const res = await fetch(siteUrl("/api/upload-document"), { method: "POST", body: fd });
      const j: any = await res.json().catch(() => ({}));
      if (res.ok && j.success) path = String(j.path ?? "");
      else if (res.status === 400 || res.status === 403) throw new UploadError(j.error || `Upload refused (${res.status})`, false);
      else viaSite = j.error || `HTTP ${res.status}`;
    } catch (e: any) { if (e instanceof UploadError) throw e; viaSite = e?.message ?? "network"; }
    if (path === null) {
      const ext = (file.name.split(".").pop() || (type === "application/pdf" ? "pdf" : "jpg")).toLowerCase();
      const p = `${applicationId}/${documentType}_${rand8()}.${ext}`;
      const body = await (await fetch(file.uri)).arrayBuffer();
      const { error: ue } = await sb.storage.from(DOC_BUCKET).upload(p, body, { contentType: type, upsert: true });
      if (ue) throw new UploadError(/row-level security|not found|unauthorized|403|bucket/i.test(ue.message) ? `Uploads aren't enabled on the server yet (${viaSite || "website upload unavailable"}). Please send the file on WhatsApp for now.` : ue.message, isNetwork(ue));
      path = p;
      const col = DOC_FLAG[documentType];
      if (col) await sb.from("visa_applications").update({ [col]: true } as VisaUpdate).eq("id", applicationId).eq("email", u.email);
    }
    const { data: cur } = await sb.from("visa_applications").select("additional_notes").eq("id", applicationId).eq("email", u.email).single();
    const n = parseNotes(cur?.additional_notes ?? null);
    n.uploads = [...(n.uploads ?? []), { type: documentType, path, name: file.name, at: new Date().toISOString() }];
    await sb.from("visa_applications").update({ additional_notes: JSON.stringify(n) }).eq("id", applicationId);
  } catch (e: any) {
    if (e instanceof UploadError) throw e;
    throw new UploadError(e?.message ?? String(e), isNetwork(e));
  }
}

/** Customer files are private (storage is service-role only on the live DB), so only the finished dossier can be opened,
 *  through the website's download route. Returns null when there is nothing the customer can open. */
export async function openDocumentUrl(_path: string): Promise<string | null> { return null; }

// The live DB has no notifications table: the inbox is derived from the real application rows; read state is kept on the device.
export type Notification = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; application_id: string | null };
const READ_KEY = "ezvisa.notifications.read.v1";
async function readSet() { try { return new Set<string>(JSON.parse((await AsyncStorage.getItem(READ_KEY)) ?? "[]")); } catch { return new Set<string>(); } }
export async function listNotifications(): Promise<Notification[]> {
  const apps = await listApplications(); const read = await readSet();
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

/** The live DB has no push_tokens table yet (see db/proposed-live-changes.sql); the token is kept on the device only. */
/** Stores the Expo push token in device_tokens (RLS: own rows only; user_id/email come from the session server-side). */
export async function registerPushToken(token: string) {
  await AsyncStorage.setItem("ezvisa.push.token", token).catch(() => {});
  if (!supabase) return;
  const { error } = await supabase.from("device_tokens" as any).insert({ token, platform: Platform.OS === "android" ? "android" : "ios" } as any);
  if (error && error.code !== "23505") throw error; // already registered is fine
}
export async function unregisterPushToken() {
  const token = await AsyncStorage.getItem("ezvisa.push.token").catch(() => null);
  if (token && supabase) await supabase.from("device_tokens" as any).delete().eq("token", token).then(() => {}, () => {});
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
