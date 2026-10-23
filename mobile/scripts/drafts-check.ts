// Node-only checks for the draft autosave helpers in lib/data.ts (no device, no network, no DB rows).
// Run: EXPO_PUBLIC_SUPABASE_URL=http://localhost:1 EXPO_PUBLIC_SUPABASE_ANON_KEY=x bun scripts/run-check.ts scripts/drafts-check.ts
import { supabase } from "../lib/supabase";
import { saveDraft, fingerprint, sameVersion } from "../lib/data";
import { emptyForm } from "../lib/wizard";

let failed = 0;
const check = (ok: boolean, name: string, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  · " + info : ""}`); if (!ok) failed++; };
// Same rule lib/form.tsx uses to decide "retry forever" vs "stop after 5 failures".
const isNetworkError = (e: any) => /network|fetch|timeout|timed out|offline|abort/i.test(String(e?.message ?? e));

(async () => {
  const sb = supabase!;
  const f = { ...emptyForm, destination: "France" };

  // 1. The session check reads the stored session (lib/data.ts me() uses getSession, no network round trip). With a
  //    session, a network failure on the query itself is a retryable network error, not "Please sign in first".
  (sb.auth as any).getSession = async () => ({ data: { session: { user: { id: "u1", email: "a@b.c" } } }, error: null });
  const realFetch = globalThis.fetch;
  (globalThis as any).fetch = async () => { throw new TypeError("Network request failed"); }; // what React Native throws offline
  const e1 = await saveDraft(f, "personal", "00000000-0000-4000-8000-000000000001", null, "q:nationality", [], false).then(() => null, (e) => e);
  (globalThis as any).fetch = realFetch;
  check(!!e1 && e1.message !== "Please sign in first" && isNetworkError(e1), "network failure while saving is retried (network error)", String(e1?.message));

  // 2. Really signed out: still "Please sign in first" (not retried forever).
  (sb.auth as any).getSession = async () => ({ data: { session: null }, error: null });
  const e2 = await saveDraft(f, "personal", "00000000-0000-4000-8000-000000000001", null, "q:nationality", [], false).then(() => null, (e) => e);
  check(!!e2 && e2.message === "Please sign in first" && !isNetworkError(e2), "signed out is not treated as a network error", String(e2?.message));

  // 3. Fingerprint: same content in any key order and with undefined keys = same value; any answer change = different.
  const a = fingerprint({ destination: "France", nationality: "India" }, "personal", "q:city");
  const b = fingerprint({ nationality: "India", destination: "France", firstName: undefined } as any, "personal", "city");
  const c = fingerprint({ destination: "France", nationality: "Egypt" }, "personal", "q:city");
  const d = fingerprint({ destination: "France", nationality: "India" }, "personal", "q:name");
  check(a === b, "fingerprint ignores key order, undefined keys and the q: prefix");
  check(a !== c && a !== d, "fingerprint changes with an answer or the question");

  // 4. Versions: the same instant in Postgres and JS formats is equal; microseconds or null are not.
  check(sameVersion("2026-10-22T10:00:00.123+00:00", "2026-10-22T10:00:00.123Z"), "same instant in two formats is the same version");
  check(!sameVersion("2026-10-22T10:00:00.123+00:00", "2026-10-22T10:00:00.124+00:00") && !sameVersion(null, null), "different instant or missing version is not the same");

  console.log(failed ? `\n${failed} check(s) failed` : "\nALL PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL ", e?.message ?? e); process.exit(1); });
