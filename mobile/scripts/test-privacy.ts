// Privacy tests for analytics + crash reporting (chat 14). Run: node scripts/run-test-privacy.mjs
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scrubText, scrubDeep, registerSecrets } from "../lib/scrub";
import { safeProps, track, events, pendingEvents, flush } from "../lib/analytics";
import { recordError, lastCrash, setCrashSink, type CrashReport } from "../lib/crash";
import { setUsageSharing } from "../lib/privacy";
import { scrubCrashEvent } from "../lib/scrub";
import { initSentry, parseStack, flushCrashes, sendTestError, SENTRY_ENABLED } from "../lib/sentry";

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
ok((await pendingEvents()) === 13, "offline: all 13 events of the session wait in the outbox", await pendingEvents());
ok(!!(await AsyncStorage.getItem("ezvisa.outbox.v1")), "outbox is persisted");

// 5b. back online, table WITH migration 0008: every event is sent, in one insert, with no personal data
const stored: any[] = []; let inserts = 0;
const LEG = new Set(["wizard_open", "wizard_page", "wizard_submit", "wizard_close"]);
(globalThis as any).__insert = async (_t: string, rows: any[]) => { inserts++; stored.push(...rows); return { error: null, status: 201 }; };
await flush(); await sleep(50);
ok(stored.length === 13 && inserts === 1 && (await pendingEvents()) === 0, "online + 0008: 13 rows sent in one insert, outbox empty", { stored: stored.length, inserts });
ok(stored.some((r) => r.event === "payment_finished" && r.outcome === "paid") && stored.some((r) => r.event === "app_start" && r.ms === 812) && stored.some((r) => r.event === "wizard_step_completed" && r.page === "trip-details"), "funnel rows carry step / outcome / ms");
ok(leaks(JSON.stringify(stored)).length === 0 && stored.every((r) => Object.keys(r).every((k) => ["session_id", "event", "page", "destination", "platform", "app_version", "signed_in", "outcome", "ms"].includes(k))), "rows only have the allowed columns, no personal data");
console.log("     sent:", stored.map((r) => r.event + (r.page ? `:${r.page}` : "") + (r.outcome ? `:${r.outcome}` : "") + (r.ms != null ? `:${r.ms}ms` : "")).join(", "));

// 5c. table WITHOUT 0008: the server rejects funnel rows; original events are re-sent alone, funnel paused for 24 h
const old: any[] = [];
(globalThis as any).__insert = async (_t: string, rows: any[]) => (rows.some((r) => !LEG.has(r.event)) ? { error: { code: "23514", message: "violates check constraint" }, status: 400 } : (old.push(...rows), { error: null, status: 201 }));
track("wizard_open"); track("wizard_step_viewed", { step: "personal" }); track("wizard_page", { page: "destination" }); track("payment_started");
await sleep(50); await flush(); await sleep(800);
ok(old.length === 2 && old.every((r) => LEG.has(r.event) && !("outcome" in r) && !("ms" in r)), "no 0008: wizard_open + wizard_page still arrive, without the new columns", old.map((r) => r.event));
ok(!!(await AsyncStorage.getItem("ezvisa.funnel.v1")), "no 0008: funnel paused (retried after 24 h)");
track("payment_finished", { outcome: "paid" }); await sleep(50);
ok((await pendingEvents()) === 0, "no 0008: new funnel events stay on the phone while paused");
(globalThis as any).__insert = undefined;

// 6. forced crash: the stored report and the crash-service payload have no personal data
const sent: CrashReport[] = []; setCrashSink((r) => sent.push(r));
try { throw new Error(`Forced test crash for Aisha Khan <aisha.khan@example.com> passport N1234567 phone +971 50 123 4567`); } catch (e) { recordError(e, true); }
await sleep(10);
const c = await lastCrash();
ok(!!c && c.fatal && c.message.startsWith("Forced test crash"), "forced crash stored", c?.message);
ok(!!c && leaks(c.message + c.stack).length === 0, "stored crash has no personal data", c && leaks(c.message + c.stack));
ok(sent.length === 1 && leaks(JSON.stringify(sent[0])).length === 0, "crash sink payload has no personal data");
console.log("     crash:", c?.message);

// 6b. Sentry-shaped event: user, request, device name, messages, frames, breadcrumbs, extras are all cleaned
const sev: any = scrubCrashEvent<any>({ message: "boom for aisha.khan@example.com", user: { email: "aisha.khan@example.com", ip_address: "1.2.3.4" }, request: { url: "https://x?email=a@b.co" },
  exception: { values: [{ type: "Error", value: "Cannot submit for Aisha Khan, passport N1234567", stacktrace: { frames: [{ filename: "app:///index.bundle", abs_path: "file:///var/mobile/passport_scan.pdf", vars: { name: "Aisha" } }] } }] },
  breadcrumbs: [{ category: "console", message: "draft saved for aisha.khan@example.com", data: { phone: "+971 50 123 4567", step: "personal" } }],
  contexts: { device: { name: "Aisha's iPhone", model: "iPhone16,2" }, os: { name: "iOS" } }, extra: { firstName: "Aisha", note: "+971 50 123 4567" }, tags: { screen: "review" } });
ok(leaks(JSON.stringify(sev)).length === 0 && !("user" in sev) && !("request" in sev) && sev.contexts.device.model === "iPhone16,2" && sev.tags.screen === "review", "Sentry event scrubbed (keeps device model, screen tag)", leaks(JSON.stringify(sev)));
console.log("     sentry:", sev.exception.values[0].value);

// 6c. Sentry client: stack parsing, envelope, offline queue, test error (fake DSN + fake fetch; nothing leaves the machine)
const hermes = "TypeError: undefined is not a function\n    at submit (address at index.android.bundle:1:123456)\n    at anonymous (address at index.android.bundle:1:2345)\n    at ?anon_0_ (node_modules/react-native/x.js:10:5)";
const fr = parseStack(hermes);
ok(fr.length === 3 && fr[2].function === "submit" && fr[2].lineno === 1 && fr[2].colno === 123456 && fr[0].in_app === false, "Hermes stack -> Sentry frames (oldest first)", fr);
ok(parseStack("Error: x\n    at Foo (http://localhost/entry.js:12:34)")[0]?.filename === "http://localhost/entry.js", "V8 stack -> frames");
const posts: { url: string; body: string }[] = []; let netDown = true;
(globalThis as any).fetch = async (url: string, init: any) => { if (netDown) throw new TypeError("Network request failed"); posts.push({ url, body: init.body }); return { ok: true, status: 200 }; };
await setUsageSharing(true);
ok(SENTRY_ENABLED, "Sentry on when EXPO_PUBLIC_SENTRY_DSN is set");
initSentry(); await sleep(20);
try { throw new TypeError("Cannot read property 'passportNumber' of undefined for aisha.khan@example.com"); } catch (e) { recordError(e, true); }
await sleep(50);
ok(posts.length === 0 && JSON.parse((await AsyncStorage.getItem("ezvisa.crashq.v1")) ?? "[]").length === 1, "offline: crash waits in the queue");
netDown = false; await flushCrashes(); await sleep(20);
ok(posts.length === 1 && posts[0].url === "https://o1.ingest.sentry.io/api/42/envelope/?sentry_key=0123456789abcdef0123456789abcdef&sentry_version=7&sentry_client=ezvisa-app%2F1", "online: sent to the Sentry envelope endpoint", posts[0]?.url);
const [hdr, item, evt] = posts[0].body.trim().split("\n").map((l) => JSON.parse(l));
ok(hdr.event_id === evt.event_id && /^[0-9a-f]{32}$/.test(evt.event_id) && item.type === "event", "envelope: header, item, event");
ok(evt.level === "fatal" && evt.exception.values[0].type === "TypeError" && evt.platform === "javascript" && !evt.user, "event: fatal TypeError, no user");
ok(leaks(posts[0].body).length === 0, "Sentry payload has no personal data", leaks(posts[0].body));
console.log("     sentry event:", evt.exception.values[0].type + ": " + evt.exception.values[0].value);
ok(JSON.parse((await AsyncStorage.getItem("ezvisa.crashq.v1")) ?? "[]").length === 0, "queue emptied after sending");
registerSecrets(["Aisha Khan", "aisha.khan@example.com"], "account");
sendTestError(["Aisha Khan", "aisha.khan@example.com"]); await sleep(50);
ok(posts.length === 2 && leaks(posts[1].body).length === 0 && /EZvisa test error \(diagnostics\) for \[redacted\]/.test(posts[1].body), "diagnostics test error arrives scrubbed");

// 7. opt-out: nothing recorded or sent, queued data deleted
await setUsageSharing(false); await sleep(10);
const before = (await events()).length; track("wizard_open"); recordError(new Error("after opt-out")); await sleep(700);
ok((await events()).length === before, "opted out: no new events");
ok(sent.length === 1 && posts.length === 2, "opted out: crash not sent to Sentry");

console.log(`\n${n - fails}/${n} passed`); if (fails) process.exit(1);
