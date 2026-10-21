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
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") return json({ error: "Confirmation required" }, 400);
  const email = user.email.toLowerCase();
  const { data: apps, error: le } = await admin.from("visa_applications").select("id, email").ilike("email", email);
  if (le) return json({ error: "Could not load your data" }, 500);
  const mine = (apps ?? []).filter((a) => (a.email ?? "").toLowerCase() === email); // exact match only (ilike has no wildcards here, double-check)
  for (const a of mine) {
    const { data: files } = await admin.storage.from("visa_documents").list(a.id, { limit: 1000 });
    if (files?.length) await admin.storage.from("visa_documents").remove(files.map((f: { name: string }) => `${a.id}/${f.name}`));
  }
  // Payment fields are kept (accounting); personal data is removed.
  if (mine.length) {
    const { error: ue } = await admin.from("visa_applications").update({ full_name: "Deleted user", email: `deleted+${user.id}@deleted.ezvisa.net`, phone: "", passport_number: null, date_of_birth: null, additional_notes: "{}", appointment_reference: null }).in("id", mine.map((a) => a.id));
    if (ue) return json({ error: "Could not remove your data" }, 500);
  }
  const { error: de } = await admin.auth.admin.deleteUser(user.id);
  if (de) return json({ error: "Could not delete the account" }, 500);
  return json({ deleted: true, applications: mine.length });
});
