// DEPLOYED 2026-10-21. Called only by the visa_applications_notify trigger (shared secret in Vault).
// Sends an Expo push to the application owner's devices. No passport or personal data in the text.
// Optional [KEY]: EXPO_ACCESS_TOKEN (only if "enhanced push security" is turned on for the Expo project).
import { createClient } from "jsr:@supabase/supabase-js@2";
const LABEL: Record<string, string> = { submitted: "Submitted", reviewing: "In review", approved: "Approved", ready: "Your file is ready", rejected: "Refused", cancelled: "Cancelled", completed: "Completed" };
const DOC: Record<string, string> = { passportCopy: "Passport bio page", residencyCopy: "Residence visa / Emirates ID", photo: "Photo", bankStatement: "Bank statement", nocCertificate: "NOC / employment proof", salaryCertificate: "Salary certificate" };
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const hook = req.headers.get("x-ezvisa-hook") ?? "";
  const { data: ok } = hook ? await admin.rpc("ezvisa_notify_hook_ok", { s: hook }) : { data: false };
  if (ok !== true) return new Response("Unauthorized", { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b?.application_id) return new Response("Bad request", { status: 400 });
  const { data: app } = await admin.from("visa_applications").select("id, email, destination_country").eq("id", b.application_id).maybeSingle();
  if (!app?.email) return Response.json({ sent: 0 });
  const { data: toks } = await admin.from("device_tokens").select("token").eq("email", app.email.toLowerCase());
  if (!toks?.length) return Response.json({ sent: 0 });
  const ref = `EZ-${app.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`; const where = app.destination_country ? `${app.destination_country} visa` : "Your visa application";
  const msgs: { title: string; body: string }[] = [];
  if (b.new_status && b.new_status !== b.old_status && LABEL[b.new_status]) msgs.push({ title: where, body: `${LABEL[b.new_status]} · ${ref}` });
  for (const d of (b.rejected ?? []) as string[]) msgs.push({ title: `${where}: please re-upload`, body: `${DOC[d] ?? "A document"} needs a new copy · ${ref}` });
  if (!msgs.length) return Response.json({ sent: 0 });
  const payload = msgs.flatMap((m) => toks.map((t) => ({ to: t.token, title: m.title, body: m.body, sound: "default", data: { url: `/applications/${app.id}` } })));
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const token = Deno.env.get("EXPO_ACCESS_TOKEN"); if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  // Drop tokens Expo reports as no longer registered.
  const dead = ((j?.data ?? []) as any[]).map((x, i) => (x?.details?.error === "DeviceNotRegistered" ? payload[i].to : null)).filter(Boolean);
  if (dead.length) await admin.from("device_tokens").delete().in("token", dead as string[]);
  return Response.json({ sent: payload.length, status: r.status });
});
