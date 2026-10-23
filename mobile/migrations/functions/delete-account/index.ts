// DEPLOYED 2026-10-21 (owner approved). In-app account deletion (Apple guideline 5.1.1(v)).
// The caller's own JWT is verified; only that user's data is touched. Service role is used inside the function only.
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: { user }, error } = await admin.auth.getUser(jwt); // rejects anon/publishable keys and expired tokens
  if (error || !user?.id || !user.email) return json({ error: "Unauthorized" }, 401);
  // Applications are matched by email. An unconfirmed address is not proof of ownership: without this check, signing
  // up with someone's email (if confirmation is ever off) would let you wipe their guest applications.
  const confirmed = !!(user.email_confirmed_at || (user as { confirmed_at?: string }).confirmed_at);
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "Confirmation required" }, 400);
  const email = user.email.toLowerCase();
  const { data: apps, error: le } = await admin.from("visa_applications").select("id, email").ilike("email", email);
  if (le) return json({ error: "Could not load your data" }, 500);
  const mine = confirmed ? (apps ?? []).filter((a) => (a.email ?? "").toLowerCase() === email) : []; // exact match only (ilike treats _ and % as wildcards)
  for (const a of mine) {
    const { data: files } = await admin.storage.from("visa_documents").list(a.id, { limit: 1000 });
    if (files?.length) await admin.storage.from("visa_documents").remove(files.map((f: { name: string }) => `${a.id}/${f.name}`));
  }
  // Payment fields are kept (accounting); personal data is removed.
  if (mine.length) {
    const ids = mine.map((a) => a.id);
    const { error: ue } = await admin.from("visa_applications").update({ full_name: "Deleted user", email: `deleted+${user.id}@deleted.ezvisa.net`, phone: "", passport_number: null, date_of_birth: null, additional_notes: "{}", appointment_reference: null }).in("id", ids);
    if (ue) return json({ error: "Could not remove your data" }, 500);
    // More personal data (separate update so a column missing on an older schema can't block the deletion above).
    // A new tracking token makes old emailed /track links stop working.
    const { error: ue2 } = await admin.from("visa_applications").update({ rejection_details: null, submission_ip: null, user_agent: null, appointment_address: null, appointment_centre: null, appointment_at: null, appointment_lat: null, appointment_lng: null, document_reviews: {}, tracking_token: crypto.randomUUID() }).in("id", ids);
    if (ue2) console.error("delete-account: extra anonymisation failed", ue2.code);
  }
  // Profile photo (avatars/<uid>/...).
  const { data: avatars } = await admin.storage.from("avatars").list(user.id, { limit: 100 });
  if (avatars?.length) await admin.storage.from("avatars").remove(avatars.map((f: { name: string }) => `${user.id}/${f.name}`));
  const { error: de } = await admin.auth.admin.deleteUser(user.id);
  if (de) return json({ error: "Could not delete the account" }, 500);
  return json({ deleted: true, applications: mine.length });
});
