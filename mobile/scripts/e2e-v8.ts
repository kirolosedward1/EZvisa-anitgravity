// Live DB check of the REAL app data layer (lib/data.ts, bundled for node with react-native stubbed), using only the
// publishable key and the test account. It reuses the account's existing row and creates NO new rows.
// Usage: TEST_EMAIL=... TEST_PASSWORD=... node scripts/run-e2e-v8.mjs
import { supabase } from "../lib/supabase";
import { saveDraft, submitApplication, patchNotes, getApplication, parseNotes, listApplications } from "../lib/data";
import { emptyForm } from "../lib/wizard";

const log = (ok: boolean, step: string, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  " + info : ""}`); if (!ok) process.exitCode = 1; };
(async () => {
  const email = process.env.TEST_EMAIL!, password = process.env.TEST_PASSWORD!;
  if (!/\+ezvisa-app-test@/.test(email)) throw new Error("TEST_EMAIL must be the +ezvisa-app-test account");
  const sb = supabase!;
  const { error: se } = await sb.auth.signInWithPassword({ email, password }); log(!se, "sign in", se?.message);
  const before = await listApplications(); log(before.length === 1, "account has exactly one row", `${before.length} row(s)`);
  const row = before[0]; const id = row.id;
  const f = { ...emptyForm, ...(row.notes.wizard ?? {}) };
  // 1. autosave with the id of an already-submitted case must NOT insert a second row (and must not write)
  const sr = await saveDraft(f, "trip-details", id, row.updated_at, "q:hotelCategory", [], false); log(!sr.ok && sr.reason === "closed", "saveDraft on a submitted row reports closed (no insert, no write)");
  // 2. double submit (two taps at once) -> same row, still one row
  const [a1, a2] = await Promise.all([submitApplication(f, id, row.updated_at), submitApplication(f, id, row.updated_at)]);
  log(a1.id === id && a2.id === id && a1.status === "submitted", "double submit is idempotent", `${a1.reference} ${a1.status}`);
  // 3. itinerary into additional_notes (RLS: own row while draft/submitted; guard trigger ignores additional_notes)
  const plan = { v: 1, generatedAt: new Date().toISOString(), label: "Ideas, not bookings", days: [{ day: 1, title: "e2e check", items: [{ id: "x", time: "Morning", text: "e2e" }] }] };
  const keep = parseNotes((await sb.from("visa_applications").select("additional_notes").eq("id", id).single()).data!.additional_notes);
  const r = await patchNotes(id, { itinerary: plan }); log(r.synced, "itinerary saved to additional_notes.itinerary");
  const back = (await getApplication(id)).notes as any;
  log(back.itinerary?.days?.[0]?.title === "e2e check", "itinerary reads back");
  log(JSON.stringify(back.wizard) === JSON.stringify(keep.wizard) && JSON.stringify(back.uploads ?? null) === JSON.stringify(keep.uploads ?? null) && back.source === keep.source, "other note keys untouched (wizard, uploads, source)");
  // 4. guard trigger: a customer can't change payment fields
  await sb.from("visa_applications").update({ payment_status: "paid" } as any).eq("id", id);
  const pay = (await getApplication(id)).payment_status; log(pay === row.payment_status, "guard trigger keeps payment_status", String(pay));
  const c = await patchNotes(id, { itinerary: keep.itinerary }); log(c.synced, "test plan removed again (restores the previous itinerary key)");
  const after = await listApplications(); log(after.length === before.length, "no new rows created", `${after.length} row(s)`);
  await sb.auth.signOut();
})().catch((e) => { console.error("FAIL ", e?.message ?? e); process.exit(1); });
