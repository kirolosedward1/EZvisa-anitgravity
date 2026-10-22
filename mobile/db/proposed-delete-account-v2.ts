// PROPOSED (chat 13), NOT DEPLOYED. Needs the owner's approval before it replaces migrations/functions/delete-account/index.ts.
// In-app account deletion (Apple guideline 5.1.1(v)). Changes against the deployed v1 (2026-10-21):
//  1. Refuses (409 payment_pending) while a Ziina payment may still complete, so a payment can't land on an anonymised row.
//     Ziina is asked live when ZIINA_API_KEY is set as a function secret; otherwise a payment link created in the last
//     2 hours counts as in flight. The app already checks this before calling (app/(tabs)/account/index.tsx).
//  2. Clears more personal fields: document_reviews (staff notes can describe documents), every appointment_* column,
//     nationality, travel dates and purpose, refusal details, submission IP / user agent and the website's file URLs
//     (v1 already cleared name, email, phone, passport number, date of birth, notes). Kept: id, destination_country, payment_*,
//     created_at/updated_at, application_status (accounting and refunds). See "WAITING FOR APPROVAL" for these choices.
//  3. Unpaid open applications are set to 'cancelled' so staff don't work on them. Paid ones keep their status for the
//     refund/accounting trail (owner to decide whether they should become 'cancelled' too).
//  4. Removes uploaded files from both bucket names seen in this project (visa_documents and visa-documents) and fails
//     loudly if a removal errors, instead of reporting success with files left behind.
//  5. Email match is exact and case-insensitive with LIKE wildcards escaped.
// The caller's own JWT is verified; only that user's data is touched. The service role is used inside the function only.
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const BUCKETS = ["visa_documents", "visa-documents"];
const IN_FLIGHT = ["pending", "requires_user_action", "processing", "completed"]; // completed + not marked paid = webhook not in yet
const PAID = ["paid", "completed"];

async function ziinaStatus(id: string): Promise<string | null> {
  const key = Deno.env.get("ZIINA_API_KEY"); if (!key) return null;
  try {
    const r = await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return null; const j = await r.json(); return typeof j?.status === "string" ? j.status : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: { user }, error } = await admin.auth.getUser(jwt); // rejects anon/publishable keys and expired tokens
  if (error || !user?.id || !user.email) return json({ error: "Unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "Confirmation required" }, 400);

  const email = user.email.toLowerCase();
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: apps, error: le } = await admin.from("visa_applications").select("id, email, payment_id, payment_status, application_status, updated_at, created_at").ilike("email", pattern);
  if (le) return json({ error: "Could not load your data" }, 500);
  const mine = (apps ?? []).filter((a) => (a.email ?? "").toLowerCase() === email);

  // 1. Payments that may still complete.
  for (const a of mine) {
    if (!a.payment_id || PAID.includes(a.payment_status ?? "") || a.application_status === "cancelled") continue;
    const live = await ziinaStatus(a.payment_id);
    const recent = Date.now() - new Date(a.updated_at ?? a.created_at ?? 0).getTime() < 2 * 3600_000;
    if (live ? IN_FLIGHT.includes(live) : recent) return json({ error: "payment_pending", application_id: a.id }, 409);
  }

  // 4. Files first: if this fails nothing else has changed and the user can retry.
  for (const a of mine) for (const bucket of BUCKETS) {
    const { data: files, error: fe } = await admin.storage.from(bucket).list(a.id, { limit: 1000 });
    if (fe) { if (/not found/i.test(fe.message)) continue; return json({ error: "Could not remove your documents" }, 500); }
    if (files?.length) {
      const { error: re } = await admin.storage.from(bucket).remove(files.map((f: { name: string }) => `${a.id}/${f.name}`));
      if (re) return json({ error: "Could not remove your documents" }, 500);
    }
  }

  // 2 + 3. Anonymise rows; payment fields stay for accounting.
  const anon = {
    full_name: "Deleted user", email: `deleted+${user.id}@deleted.ezvisa.net`, phone: "", passport_number: null, date_of_birth: null,
    nationality: "", travel_purpose: "", entry_date: null, exit_date: null, additional_notes: "{}", document_reviews: {}, // nationality / travel_purpose are NOT NULL
    rejection_details: null, submission_ip: null, user_agent: null, passport_url: null, photo_url: null, noc_url: null, residency_url: null,
    appointment_at: null, appointment_centre: null, appointment_address: null, appointment_lat: null, appointment_lng: null, appointment_reference: null,
  };
  for (const a of mine) {
    const unpaidOpen = !PAID.includes(a.payment_status ?? "") && a.application_status !== "cancelled";
    const { error: ue } = await admin.from("visa_applications").update(unpaidOpen ? { ...anon, application_status: "cancelled" } : anon).eq("id", a.id);
    if (ue) return json({ error: "Could not remove your data" }, 500);
  }

  // device_tokens rows go with the auth user (on delete cascade, migration 0006).
  const { error: de } = await admin.auth.admin.deleteUser(user.id);
  if (de) return json({ error: "Could not delete the account" }, 500);
  return json({ deleted: true, applications: mine.length });
});
