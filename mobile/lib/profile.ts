// The signed-in user's saved details, used to prefill a NEW application (never over answers already in a draft).
// The live website DB (ezvisa-uae) has no profiles table, so the profile is read from two places, both scoped to the
// current user and nothing else:
//  1. Supabase Auth user_metadata (first/last/full name, phone, nationality, date of birth). This is what the website
//     already prefills from (web app/apply/page.tsx). Only the signed-in user can read or change their own metadata.
//  2. The user's own latest application (visa_applications .eq("email", me), like listApplications) for anything the
//     metadata lacks, incl. passport number and expiry. Passport details are never written to user_metadata: that is
//     copied into every access token. A real profile table for them is proposed in migrations/0013_customer_profiles.sql (not applied).
// Nothing here is cached: the profile is fetched when needed and kept in component state only. The only thing stored
// on the phone is a per-draft flag (no personal data) so the "update your profile?" question is asked once.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { WORLD } from "./world";
import { parseNotes } from "./data";
import { emptyForm, needsSchengenVisa, visibleSteps, type WizardForm } from "./wizard";
import { QUESTIONS } from "./questions";

export type ProfileKey = "firstName" | "lastName" | "email" | "phone" | "phoneCountry" | "phoneLocal" | "nationality" | "dateOfBirth" | "hasValidPassport" | "passportNumber" | "passportExpiry";
export type Profile = Partial<Pick<WizardForm, ProfileKey>>;
/** Answers the wizard asks before payment. Only these are prefilled: anything else would sit in the draft unseen, and
 *  Continue application (after payment) skips questions that already have a valid answer. */
export const PRE_PAYMENT_KEYS = new Set<string>(QUESTIONS.filter((q) => visibleSteps(emptyForm).includes(q.step)).flatMap((q) => q.keys as string[]));
const prePayment = <T extends string>(keys: T[]) => keys.filter((k) => PRE_PAYMENT_KEYS.has(k));
/** Wizard fields that are prefilled from the profile (the rest of the application is never copied automatically).
 *  Date of birth and passport are loaded but asked only after payment, so today they are not prefilled. */
export const PROFILE_KEYS: ProfileKey[] = prePayment<ProfileKey>(["firstName", "lastName", "email", "phone", "phoneCountry", "phoneLocal", "nationality", "dateOfBirth", "hasValidPassport", "passportExpiry"]);
/** Other stable answers offered from the last application ("Use details from your last application?"), same rule. */
export const OFFER_KEYS = prePayment<keyof WizardForm & string>(["cityOfResidence", "hasEmiratesId", "maritalStatus",
  "spouseFirstName", "spouseLastName", "employmentStatus", "jobTitle", "companyName", "employmentStartDate", "monthlySalary", "averageMonthlyIncome"]);
/** Fields the user may save back to their profile (user_metadata) after confirming on Review (only ones shown there). */
export const SAVABLE: { key: keyof WizardForm; label: string }[] = [
  { key: "firstName" as const, label: "First Name" }, { key: "lastName" as const, label: "Last Name" }, { key: "phone" as const, label: "Phone Number" },
  { key: "nationality" as const, label: "Nationality" }, { key: "dateOfBirth" as const, label: "Date of Birth" },
].filter((x) => PRE_PAYMENT_KEYS.has(x.key));
export type ProfileChange = { key: keyof WizardForm; label: string; from: string; to: string };

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isoDay = (v: unknown) => { const x = s(v).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(Date.parse(x)) ? x : ""; };
/** "+971 50 123 4567" -> AE / "50 123 4567" (longest matching calling code; `prefer` breaks ties such as +1 or +7). */
export function splitPhone(full: string, prefer?: string): { phoneCountry: string; phoneLocal: string } | null {
  const m = s(full).replace(/^00/, "+").match(/^\+(\d{1,4})[\s-]*(.*)$/);
  if (!m) return null;
  const digits = m[1] + m[2].replace(/[^\d]/g, "");
  for (const len of [3, 2, 1]) {
    const code = Number(digits.slice(0, len));
    const hits = WORLD.filter((w) => w.dial === code && w.dial > 0);
    if (!hits.length) continue;
    const w = hits.find((x) => x.iso2 === prefer) ?? hits.find((x) => x.iso2 === "AE") ?? hits[0];
    const rest = full.replace(/^\s*(\+|00)/, "").replace(/[^\d\s-]/g, "").trim();
    const local = rest.startsWith(String(code)) ? rest.slice(String(code).length).trim() : digits.slice(len);
    return local ? { phoneCountry: w.iso2, phoneLocal: local } : null;
  }
  return null;
}

/** Loads the profile of the signed-in user `uid`. Returns null if the session is not (or no longer) that user. */
export async function loadProfile(uid: string): Promise<{ profile: Profile; last: Partial<WizardForm> | null; hasDraft: boolean } | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.id !== uid) return null;
  const email = user.email.toLowerCase();
  const { data, error } = await supabase.from("visa_applications")
    .select("application_status, additional_notes, full_name, phone, nationality, date_of_birth, passport_number, updated_at")
    .eq("email", email).order("updated_at", { ascending: false }).limit(20);
  if (error) throw error;
  const rows = data ?? [];
  // A cancelled (discarded) case may hold half-typed answers; prefer real cases, newest first.
  const best = rows.find((r) => r.application_status !== "draft" && r.application_status !== "cancelled") ?? rows.find((r) => r.application_status !== "cancelled") ?? null;
  // Rows can be inserted by anyone for any email (guest checkout), so notes are untrusted: keep text values only.
  const raw = best ? (parseNotes(best.additional_notes).wizard ?? {}) : {};
  const w = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")) as Partial<WizardForm>;
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const full = s(md.full_name);
  const fromRow = best ? s(best.full_name).replace(/^Draft$/, "") : "";
  const p: Profile = { email };
  p.firstName = s(md.first_name) || full.split(/\s+/)[0] || s(w.firstName) || fromRow.split(/\s+/)[0] || "";
  p.lastName = s(md.last_name) || full.split(/\s+/).slice(1).join(" ") || s(w.lastName) || fromRow.split(/\s+/).slice(1).join(" ") || "";
  const nat = s(md.nationality) || s(w.nationality) || s(best?.nationality);
  if (needsSchengenVisa(nat)) p.nationality = nat; // the wizard only accepts visa-required nationalities
  p.dateOfBirth = isoDay(md.date_of_birth) || isoDay(w.dateOfBirth) || isoDay(best?.date_of_birth);
  const phone = s(md.phone) || s(w.phone) || s(best?.phone);
  const split = phone ? splitPhone(phone, s(md.phone_country) || s(w.phoneCountry)) : null;
  if (split) Object.assign(p, { phone, ...split });
  const passport = (s(w.passportNumber) || s(best?.passport_number)).toUpperCase();
  if (passport) {
    // Prefilled even when expired: the wizard's validation flags it (lib/wizard.ts passportExpiry rules).
    Object.assign(p, { hasValidPassport: "yes", passportNumber: passport, passportExpiry: isoDay(w.passportExpiry) });
  }
  for (const k of Object.keys(p) as ProfileKey[]) if (!p[k]) delete p[k];
  return { profile: p, last: best ? w : null, hasDraft: rows.some((r) => r.application_status === "draft") };
}

/** A draft is "new" for prefill while none of the identity answers has been given. */
export const isFreshDraft = (f: WizardForm) => !["firstName", "lastName", "dateOfBirth", "passportNumber", "passportExpiry", "phoneLocal"].some((k) => s((f as any)[k]));

/** Fills only the empty answers. Returns the new form and the keys that were filled. */
export function applyProfile(f: WizardForm, p: Profile): { form: WizardForm; filled: ProfileKey[] } {
  const out = { ...f }; const filled: ProfileKey[] = [];
  for (const k of PROFILE_KEYS) {
    const v = p[k]; if (!v) continue;
    const cur = f[k];
    // phoneCountry has a default ("AE"); it follows the phone number when the number itself is filled.
    const empty = k === "phoneCountry" ? !s(f.phoneLocal) && !!p.phoneLocal : !s(cur) || (k === "nationality" && !needsSchengenVisa(cur as string));
    if (empty && cur !== v) { (out as any)[k] = v; filled.push(k); }
  }
  return { form: out, filled };
}

/** Prefilled answers the user changed: only fields that were filled from the profile in this draft (`filled`), that the
 *  profile still has a value for, and that are savable. An answer that came from a link or the user is never listed. */
export function profileChanges(f: WizardForm, p: Profile, filled: string[]): ProfileChange[] {
  return SAVABLE.filter(({ key }) => filled.includes(key)).flatMap(({ key, label }) => {
    const from = s((p as any)[key]); const to = s((f as any)[key]);
    const same = key === "phone" ? from.replace(/[^\d]/g, "") === to.replace(/[^\d]/g, "") : from.toLowerCase() === to.toLowerCase();
    return from && to && !same ? [{ key, label, from, to }] : [];
  });
}

/** Writes exactly the confirmed changes (the values shown on the card) to the signed-in user's own profile
 *  (user_metadata); nothing the card did not list. Refuses if the account changed. `f` only supplies the phone's country. */
export async function saveProfile(uid: string, f: WizardForm, changes: ProfileChange[]): Promise<void> {
  if (!supabase) throw new Error("Backend not configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== uid) throw new Error("You're signed in to a different account now. Your profile was not changed.");
  const to = Object.fromEntries(changes.map((c) => [c.key, s(c.to)])) as Partial<Record<keyof WizardForm, string>>; const data: Record<string, string> = {};
  if (to.firstName) data.first_name = to.firstName;
  if (to.lastName) data.last_name = to.lastName;
  if (to.firstName || to.lastName) { // full_name too, but only when both parts are known without guessing from the form
    const md = user.user_metadata ?? {}; const full = s(md.full_name).split(/\s+/);
    const first = to.firstName || s(md.first_name) || (s(md.full_name) ? full[0] : ""); const last = to.lastName || s(md.last_name) || full.slice(1).join(" ");
    if (first && last) data.full_name = `${first} ${last}`;
  }
  if (to.phone) { data.phone = to.phone; const c = splitPhone(to.phone, f.phoneCountry); if (c) data.phone_country = c.phoneCountry; }
  if (to.nationality) data.nationality = to.nationality;
  if (to.dateOfBirth) data.date_of_birth = to.dateOfBirth;
  if (!Object.keys(data).length) return;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}

// ---- Per-draft flags (no personal data): was this draft prefilled, and was the profile question already answered ----
const FLAGS = "ezvisa.prefill.v1";
type Flag = { uid: string; asked: boolean; at: number; keys?: string[] };
async function readFlags(): Promise<Record<string, Flag>> { try { return JSON.parse((await AsyncStorage.getItem(FLAGS)) ?? "{}") ?? {}; } catch { return {}; } }
async function writeFlags(m: Record<string, Flag>) {
  const keep = Object.entries(m).sort((a, b) => b[1].at - a[1].at).slice(0, 20); // bounded
  await AsyncStorage.setItem(FLAGS, JSON.stringify(Object.fromEntries(keep))).catch(() => {});
}
export async function markPrefilled(draftKey: string, uid: string, keys: string[]) { const m = await readFlags(); m[draftKey] = { uid, asked: false, at: Date.now(), keys }; await writeFlags(m); }
export async function markAsked(draftKey: string) { const m = await readFlags(); if (m[draftKey]) { m[draftKey].asked = true; await writeFlags(m); } }
/** The keys prefilled in this draft for `uid` while the profile question is still unanswered; null otherwise. */
export async function shouldAsk(draftKey: string, uid: string): Promise<string[] | null> { const x = (await readFlags())[draftKey]; return x && x.uid === uid && !x.asked ? x.keys ?? [] : null; }
