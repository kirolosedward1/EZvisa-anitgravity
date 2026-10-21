// NOT DEPLOYED. Needs [DB] approval (new edge function + service role secret on the server side only).
// In-app account deletion (Apple guideline 5.1.1(v)). Called by the signed-in user with their own JWT.
import { createClient } from "jsr:@supabase/supabase-js@2";
Deno.serve(async (req) => {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return new Response("Unauthorized", { status: 401 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user }, error } = await admin.auth.getUser(jwt);
  if (error || !user?.email) return new Response("Unauthorized", { status: 401 });
  const email = user.email.toLowerCase();
  // Remove uploaded files, anonymise application rows (payments are kept for accounting), then delete the auth user.
  const { data: apps } = await admin.from("visa_applications").select("id").ilike("email", email);
  for (const a of apps ?? []) {
    const { data: files } = await admin.storage.from("visa_documents").list(a.id);
    if (files?.length) await admin.storage.from("visa_documents").remove(files.map((f) => `${a.id}/${f.name}`));
  }
  await admin.from("visa_applications").update({ full_name: "Deleted user", email: `deleted+${user.id}@ezvisa.net`, phone: null, passport_number: null, date_of_birth: null, additional_notes: null }).ilike("email", email);
  await admin.auth.admin.deleteUser(user.id);
  return Response.json({ deleted: true });
});
