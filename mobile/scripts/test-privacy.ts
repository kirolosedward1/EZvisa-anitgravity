// Privacy tests for analytics + crash reporting (chat 14). Run: node scripts/run-test-privacy.mjs
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scrubText, scrubDeep, registerSecrets } from "../lib/scrub";
import { safeProps, track, events, pendingEvents, flush } from "../lib/analytics";
import { recordError, lastCrash, setCrashSink, type CrashReport } from "../lib/crash";
import { setUsageSharing } from "../lib/privacy";

let fails = 0; let n = 0;
const ok = (cond: boolean, name: string, detail?: unknown) => { n++; if (!cond) { fails++; console.log("FAIL", name, detail ?? ""); } else console.log("ok  ", name); };
const PII = ["Aisha", "Khan", "aisha.khan@example.com", "N1234567", "+971 50 123 4567", "1990-04-12", "784-1990-1234567-1", "passport_scan.pdf"];
const leaks = (s: string) => PII.filter((p) => s.toLowerCase().includes(p.toLowerCase()));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1. pattern scrubbing (no secrets registered)
const raw = "TypeError: cannot read 'x' for aisha.khan@example.com passport N1234567 phone +971 50 123 4567 dob 1990-04-12 eid 784-1990-1234567-1 file:///var/mobile/Containers/Data/passport_scan.pdf url https://www.ezvisa.net/api/check-payment?id=abc123&email=a@b.co token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk app 3f2b1c4d-1a2b-4c3d-9e8f-0123456789ab";
const s1 = scrubText(raw);
ok(leaks(s1).filter((x) => x !== "Aisha" && x !== "Khan").length === 0, "patterns remove email, passport, phone, dob, Emirates ID, file name", leaks(s1));
ok(!/eyJ|3f2b1c4d|abc123/.test(s1), "patterns remove tokens, ids and URL query values", s1);
ok(s1.startsWith("TypeError: cannot read 'x'"), "keeps the useful part of the message", s1);
// 2. exact-match secrets (names typed in the wizard)
registerSecrets(["Aisha", "Khan", "aisha.khan@example.com", "N1234567"]);
const s2 = scrubText("Render error in ReviewRow for Aisha Khan");
ok(leaks(s2).length === 0 && s2.includes("ReviewRow"), "registered names are removed", s2);
ok(JSON.stringify(scrubDeep({ email: "x@y.z", firstName: "Aisha", ctx: { note: "hi aisha.khan@example.com" }, step: "personal" })) === '{"ctx":{"note":"hi [redacted]"},"step":"personal"}', "scrubDeep drops personal keys and scrubs values");

// 3. event properties: allowlist only
ok(JSON.stringify(safeProps("wizard_page", { page: "passportNumber", destination: "France", signedIn: true, email: "aisha.khan@example.com", value: "N1234567" })) === '{"page":"passportNumber","destination":"France","signedIn":true}', "wizard_page keeps only page/destination/signedIn");
ok(JSON.stringify(safeProps("wizard_page", { page: "N1234567", destination: "Aisha" })) === "{}", "free text in page/destination is rejected");
ok(JSON.stringify(safeProps("upload_done", { docType: "passport_scan.pdf", ok: true })) === '{"docType":"other","ok":true}', "upload_done never carries a file name");
ok(JSON.stringify(safeProps("payment_finished", { outcome: "paid", amount: 249, paymentId: "z_123" })) === '{"outcome":"paid"}', "payment_finished keeps only the outcome");

// 4. a test session records each funnel event, with no personal data
await setUsageSharing(true);
track("wizard_open"); track("wizard_step_viewed", { step: "personal" }); track("wizard_page", { page: "firstName", destination: "France", signedIn: false });
track("wizard_step_completed", { step: "personal" }); track("wizard_step_viewed", { step: "trip-details" }); track("wizard_step_completed", { step: "trip-details" });
track("wizard_step_viewed", { step: "review" }); track("wizard_step_completed", { step: "review" }); track("wizard_submit", { guest: true });
track("payment_started"); track("payment_finished", { outcome: "paid" }); track("upload_done", { docType: "passportCopy", ok: true }); track("app_start", { ms: 812.4 });
await sleep(700);
const ev = await events(); const names = ev.map((e) => e.e);
for (const e of ["wizard_step_viewed", "wizard_step_completed", "wizard_submit", "payment_started", "payment_finished", "upload_done", "app_start"]) ok(names.includes(e), `session has ${e}`);
ok(leaks(JSON.stringify(ev)).length === 0, "no personal data in recorded events");
console.log("     session:", ev.map((e) => `${e.e}${e.p ? JSON.stringify(e.p) : ""}`).join(" → "));
// 5. offline: server events wait in the outbox (no Supabase in this test = offline) and survive in storage
await flush();
ok((await pendingEvents()) === 3, "offline: the 3 server events (open, page, submit) wait in the outbox", await pendingEvents());
ok(!!(await AsyncStorage.getItem("ezvisa.outbox.v1")), "outbox is persisted");

// 6. forced crash: the stored report and the crash-service payload have no personal data
const sent: CrashReport[] = []; setCrashSink((r) => sent.push(r));
try { throw new Error(`Forced test crash for Aisha Khan <aisha.khan@example.com> passport N1234567 phone +971 50 123 4567`); } catch (e) { recordError(e, true); }
await sleep(10);
const c = await lastCrash();
ok(!!c && c.fatal && c.message.startsWith("Forced test crash"), "forced crash stored", c?.message);
ok(!!c && leaks(c.message + c.stack).length === 0, "stored crash has no personal data", c && leaks(c.message + c.stack));
ok(sent.length === 1 && leaks(JSON.stringify(sent[0])).length === 0, "crash sink payload has no personal data");
console.log("     crash:", c?.message);

// 7. opt-out: nothing recorded or sent, queued data deleted
await setUsageSharing(false); await sleep(10);
const before = (await events()).length; track("wizard_open"); recordError(new Error("after opt-out")); await sleep(700);
ok((await events()).length === before, "opted out: no new events");
ok(sent.length === 1, "opted out: crash not sent to the service");

console.log(`\n${n - fails}/${n} passed`); if (fails) process.exit(1);
