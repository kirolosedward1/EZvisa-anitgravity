// v2 PROPOSED 2026-10-22, NOT DEPLOYED (v1 deployed 2026-10-21). Deploy only after owner approval:
//   supabase functions deploy notify-status --no-verify-jwt --project-ref dravvaykssrbktztmrlj
// (no JWT: it is called only by the visa_applications_notify trigger, which proves itself with the Vault shared secret.)
// Changes from v1: no destination, reference or status words in the lock-screen text; data = { type, applicationId, url } only;
// customer-made changes (draft, submit, discard) send nothing; a token shared by two accounts goes only to its latest owner;
// one push per event; batches of 100 (Expo's limit).
// Optional [KEY]: EXPO_ACCESS_TOKEN (only if "enhanced push security" is turned on for the Expo project). Never in the app repo.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildMessage, latestOwnerTokens, type TokenRow } from "./messages.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const hook = req.headers.get("x-ezvisa-hook") ?? "";
  const { data: ok } = hook ? await admin.rpc("ezvisa_notify_hook_ok", { s: hook }) : { data: false };
  if (ok !== true) return new Response("Unauthorized", { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b) return new Response("Bad request", { status: 400 });
  const msg = buildMessage(b);
  if (!msg) return Response.json({ sent: 0 });
  const { data: app } = await admin.from("visa_applications").select("id, email").eq("id", msg.data.applicationId).maybeSingle();
  if (!app?.email) return Response.json({ sent: 0 });
  const email = app.email.toLowerCase();
  const { data: own } = await admin.from("device_tokens").select("token").eq("email", email);
  if (!own?.length) return Response.json({ sent: 0 });
  const { data: rows } = await admin.from("device_tokens").select("token, email, updated_at, created_at").in("token", own.map((t: { token: string }) => t.token));
  const tokens = latestOwnerTokens((rows ?? []) as TokenRow[], email);
  if (!tokens.length) return Response.json({ sent: 0 });

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const access = Deno.env.get("EXPO_ACCESS_TOKEN"); if (access) headers.Authorization = `Bearer ${access}`;
  let sent = 0; const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((to) => ({ to, body: msg.body, data: msg.data, sound: "default", priority: "high" }));
    const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(batch) });
    const j = await r.json().catch(() => ({}));
    ((j?.data ?? []) as any[]).forEach((x, k) => {
      if (x?.status === "ok") sent++;
      else if (x?.details?.error === "DeviceNotRegistered") dead.push(batch[k].to);
    });
  }
  // Drop tokens Expo reports as no longer registered (app deleted, permission revoked).
  if (dead.length) await admin.from("device_tokens").delete().in("token", dead);
  return Response.json({ sent, dropped: dead.length });
});
