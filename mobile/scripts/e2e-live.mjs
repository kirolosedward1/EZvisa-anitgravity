// End-to-end check against the LIVE website DB using only the publishable key, mirroring lib/data.ts + lib/api.ts.
// Usage: TEST_EMAIL=... TEST_PASSWORD=... node scripts/e2e-live.mjs
// Creates/reuses at most ONE row for TEST_EMAIL (full_name starts with "EZvisa App Test").
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const env = Object.fromEntries(fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n").filter((l) => /^\w+=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const SITE = env.EXPO_PUBLIC_SITE_URL;
const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const email = process.env.TEST_EMAIL, password = process.env.TEST_PASSWORD;
if (!/\+ezvisa-app-test@/.test(email ?? "")) throw new Error("TEST_EMAIL must contain +ezvisa-app-test");
const log = (step, ok, info = "") => console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  " + info : ""}`);
const form = { destination: "France", nationality: "Egypt", countryOfResidence: "United Arab Emirates", cityOfResidence: "Dubai", hasEmiratesId: "yes", firstName: "EZvisa App Test", lastName: "(delete me)", email, phone: "+971500000000", whatsappOptIn: false, dateOfBirth: "1990-01-01", passportNumber: "TEST0000", hasValidPassport: "yes", maritalStatus: "single", spouseAccompanying: "no" };
const notes = (f, step, extra = {}) => JSON.stringify({ maritalStatus: f.maritalStatus, employmentStatus: f.employmentStatus ?? "", jobTitle: f.jobTitle ?? "", companyName: f.companyName ?? "", monthlySalary: f.monthlySalary ?? "", spouseAccompanying: f.spouseAccompanying, source: "mobile-app", platform: "node-e2e", wizardStep: step, wizard: f, ...extra });
const cols = (f, step, extra) => ({ full_name: `${f.firstName} ${f.lastName}`, email: email.toLowerCase(), phone: f.phone, nationality: f.nationality, destination_country: f.destination, date_of_birth: f.dateOfBirth, entry_date: f.travelStartDate ?? null, exit_date: f.travelEndDate ?? null, travel_purpose: f.purposeOfTrip ?? "", passport_number: f.passportNumber, user_agent: "EZvisa app (node-e2e)", referrer: "ezvisa-mobile-app", additional_notes: notes(f, step, extra) });

// 1. sign in
const { data: si, error: se } = await sb.auth.signInWithPassword({ email, password });
log("sign in (email+password, live auth)", !se, se?.message ?? `user ${si.user?.id}`);
if (se) process.exit(1);

// 2. draft (reuse the single test row if it already exists)
let { data: mine } = await sb.from("visa_applications").select("id, application_status").eq("email", email.toLowerCase()).order("created_at");
let id = mine?.[0]?.id;
if (!id) {
  const { data, error } = await sb.from("visa_applications").insert({ ...cols(form, "employment"), application_status: "draft", payment_status: "pending" }).select("id").single();
  log("create draft row (application_status=draft)", !error, error?.message ?? data.id); if (error) process.exit(1); id = data.id;
} else log("reuse existing test row", true, `${id} (${mine[0].application_status})`);

// 3. autosave: employment + trip details
const f2 = { ...form, employmentStatus: "employed", jobTitle: "Tester", companyName: "EZvisa QA", employmentStartDate: "2020-01-01", monthlySalary: "10000-15000", hasNOC: "yes", purposeOfTrip: "tourism", travelStartDate: "2026-12-10", travelEndDate: "2026-12-20", datesFlexible: "no", travelingWith: "alone", hotelCategory: "4-star", fundingSource: "self", balanceRange: "25000-50000", isFirstSchengenVisa: "no", previousRefusals: "no" };
{ const { error } = await sb.from("visa_applications").update(cols(f2, "trip-details")).eq("id", id); log("autosave update", !error, error?.message); }

// 4. resume (what a second device does)
{ const { data, error } = await sb.from("visa_applications").select("id, additional_notes, updated_at").eq("email", email.toLowerCase()).order("updated_at", { ascending: false }).limit(1);
  const w = JSON.parse(data?.[0]?.additional_notes ?? "{}");
  log("resume draft from DB", !error && data?.[0]?.id === id && w.wizard?.companyName === "EZvisa QA" && w.wizardStep === "trip-details", `step=${w.wizardStep}`); }

// 5. upload via the website route (same as web dashboard upload)
let uploadPath = null;
{ const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  const fd = new FormData(); fd.append("file", new Blob([pdf], { type: "application/pdf" }), "ezvisa-app-test.pdf"); fd.append("applicationId", id); fd.append("documentType", "passportCopy");
  const r = await fetch(`${SITE}/api/upload-document`, { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
  uploadPath = j.path ?? null;
  log("upload document via " + SITE + "/api/upload-document", r.ok && j.success, `HTTP ${r.status} ${JSON.stringify(j)}`); }

// 5b. app fallback: direct upload with the user's session (needs the storage policy in db/proposed-live-changes.sql)
if (!uploadPath) for (const bucket of ["visa_documents", "visa-documents"]) {
  const p = `${id}/passportCopy_e2etest0.pdf`;
  const { data, error } = await sb.storage.from(bucket).upload(p, Buffer.from("%PDF-1.4\n%%EOF\n"), { contentType: "application/pdf", upsert: true });
  log(`direct storage upload to ${bucket}`, !error, error?.message ?? data?.path);
  if (!error) { uploadPath = data.path; await sb.from("visa_applications").update({ has_passport: true }).eq("id", id); break; }
}

// 6. submit
{ const { data, error } = await sb.from("visa_applications").update({ ...cols(f2, "payment", uploadPath ? { uploads: [{ type: "passportCopy", path: uploadPath, name: "ezvisa-app-test.pdf", at: new Date().toISOString() }] } : {}), duration_days: 10, application_status: "submitted", payment_status: "pending" }).eq("id", id).select("id, application_status, payment_status, has_passport").single();
  log("submit (draft -> submitted)", !error && data?.application_status === "submitted", error?.message ?? JSON.stringify(data)); }

// 7. payment via the website route (Ziina, TEST mode so no real charge)
let payId = null;
{ const success = new URL("/payment-success", SITE); success.searchParams.set("appId", id); success.searchParams.set("dest", "France");
  const r = await fetch(`${SITE}/api/create-payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: id, amount: 249, currency: "AED", success_url: success.toString(), cancel_url: `${SITE}/payment-failed`, test: true }) });
  const j = await r.json().catch(() => ({})); payId = j.id ?? null;
  log("create Ziina payment via " + SITE + "/api/create-payment", r.ok && !!j.redirect_url, `HTTP ${r.status} id=${j.id ?? "-"} redirect=${j.redirect_url ? new URL(j.redirect_url).host : "-"} ${j.error ? JSON.stringify(j).slice(0, 300) : ""}`); }

// 8. the row as the app lists it (proves the website's server wrote payment_id into THIS database)
{ const { data, error } = await sb.from("visa_applications").select("id, application_status, payment_status, payment_id, has_passport, created_at, updated_at").eq("email", email.toLowerCase());
  const row = data?.find((x) => x.id === id);
  log("list my applications (by email, like web dashboard)", !error && !!row, JSON.stringify(row));
  log("website server wrote payment_id to this DB", !!payId && row?.payment_id === payId, `payment_id=${row?.payment_id ?? "null"}`);
  if (payId) { const r = await fetch(`${SITE}/api/check-payment?id=${payId}`); const j = await r.json().catch(() => ({})); log("check payment status via website", r.ok, `status=${j.status ?? JSON.stringify(j).slice(0, 200)}`); } }
await sb.auth.signOut();
