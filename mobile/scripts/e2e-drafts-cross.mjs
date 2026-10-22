// Website <-> app on ONE draft row, against scripts/mock-supabase.mjs (never the live database):
//   mock:    STATIC_DIR=<app web export> node scripts/mock-supabase.mjs &
//   website: NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-mock SUPABASE_URL=http://localhost:54321 \
//            SUPABASE_SERVICE_ROLE_KEY=mock-service-role npx next dev -p 3000      (website repo, branch with lib/draft-sync.ts)
//   run:     node scripts/e2e-drafts-cross.mjs [screenshot dir]
import { chromium } from "playwright";
import fs from "node:fs";

const APP = process.env.APP_URL || "http://localhost:8081";
const WEB = process.env.WEB_URL || "http://localhost:3000";
const DB = process.env.MOCK_URL || "http://localhost:54321";
const OUT = process.argv[2] || "/tmp/e2e-drafts";
fs.mkdirSync(OUT, { recursive: true });
const EMAIL = "kirolos+ezvisa-app-test@example.com";
let failures = 0;
const log = (ok, step, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  · " + info : ""}`); if (!ok) failures++; };
const db = async () => (await fetch(`${DB}/__db`)).json();
const notes = (r) => JSON.parse(r?.additional_notes || "{}");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(200); } return null; }

await fetch(`${DB}/__db/reset`, { method: "POST" });
const browser = await chromium.launch();

// ---------------- 1. Start on the website ----------------
const web = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
web.on("pageerror", (e) => console.log("[web] pageerror", e.message.slice(0, 160)));
await web.goto(`${WEB}/login`); await web.fill("#email", EMAIL); await web.fill("#password", "test-pass");
await web.press("#password", "Enter"); await web.waitForURL(/dashboard/, { timeout: 60000 }).catch(() => {});
await web.goto(`${WEB}/apply?step=personal&to=France&from=India`, { timeout: 120000 }); await web.waitForTimeout(3000);
await web.fill("#firstName", "Kirolos"); await web.fill("#lastName", "Test");
const webSaved = await until(async () => (await web.locator("[role=status]:visible").filter({ hasText: /^Saved$/ }).count()) > 0 && notes((await db())[0]).wizard?.firstName === "Kirolos", 15000);
let rows = await db();
log(!!webSaved && rows.length === 1 && rows[0].application_status === "draft", "website: answers autosave to one draft row; indicator says Saved", `${rows.length} row(s), source=${notes(rows[0]).source}`);
await web.screenshot({ path: `${OUT}/web-01-saved-1280.png` });
const id = rows[0]?.id;

// ---------------- 2. Continue in the app (same account) ----------------
const appCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
await appCtx.addInitScript(() => localStorage.setItem("ezvisa.welcomed.v1", "1"));
const app = await appCtx.newPage();
await app.goto(`${APP}/auth`); await app.getByPlaceholder("Email").fill(EMAIL); await app.getByPlaceholder("Password").fill("test-pass");
await app.getByRole("button", { name: "Sign in" }).click(); await app.waitForTimeout(1500);
await app.goto(`${APP}/apply`); await app.waitForTimeout(2500);
if (await app.getByText("Continue Application?").isVisible().catch(() => false)) await app.getByRole("button", { name: "Continue", exact: true }).last().click();
const appForm = await app.evaluate(() => JSON.parse(localStorage.getItem("ezvisa.wizard.v1") || "{}"));
log(appForm.draftId === id && appForm.form?.firstName === "Kirolos", "app: resumes the website's draft (same row, same answers)", `draftId=${appForm.draftId?.slice(0, 8)}`);
const v1 = (await db())[0].updated_at;
await app.getByRole("radio", { name: "France", exact: true }).first().click(); await app.waitForTimeout(800);
await until(async () => (await db())[0].updated_at !== v1);
rows = await db();
log(rows.length === 1 && notes(rows[0]).lastEditedOn === "app" && notes(rows[0]).wizard?.firstName === "Kirolos", "app: saves into the same row, website answers kept", `${rows.length} row(s), question=${notes(rows[0]).wizardQuestion}`);

// ---------------- 3. Back on the website: the newer app copy is offered, not overwritten ----------------
const vApp = rows[0].updated_at;
await web.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await web.fill("#lastName", "Changed");
const dlg = await until(async () => web.getByRole("dialog").isVisible().catch(() => false), 10000);
log(!!dlg && (await db())[0].updated_at === vApp, "website: asks to load the app's newer copy; nothing overwritten", dlg ? (await web.getByRole("dialog").innerText()).replace(/\s+/g, " ").slice(0, 90) : "");
await web.screenshot({ path: `${OUT}/web-02-conflict-1280.png` });
await web.setViewportSize({ width: 390, height: 844 }); await web.screenshot({ path: `${OUT}/web-02-conflict-390.png` }); await web.setViewportSize({ width: 1280, height: 900 });
await web.getByRole("button", { name: "Load newer version" }).click(); await web.waitForTimeout(1500);
log((await web.inputValue("#lastName")) === "Test" && (await db())[0].updated_at === vApp, "website: Load newer version shows the app's copy");

// ---------------- 4. Website edits, then the app restarts: it is told, not overwritten ----------------
await web.fill("#lastName", "FromWeb");
await until(async () => notes((await db())[0]).wizard?.lastName === "FromWeb", 10000);
const vWeb = (await db())[0].updated_at;
await app.close(); const app2 = await appCtx.newPage(); // app killed and reopened
await app2.goto(`${APP}/apply?resume=1`); await app2.waitForTimeout(2500);
let sheet = await until(async () => app2.getByTestId("draft-conflict").isVisible().catch(() => false), 6000);
if (!sheet) { await app2.getByRole("radio").nth(2).click().catch(() => {}); sheet = await until(async () => app2.getByTestId("draft-conflict").isVisible().catch(() => false), 6000); }
log(!!sheet && (await db())[0].updated_at === vWeb, "app: website's newer copy is offered, not overwritten", sheet ? (await app2.getByTestId("draft-conflict").innerText()).replace(/\s+/g, " ").slice(0, 80) : "");
await app2.screenshot({ path: `${OUT}/app-07-conflict-from-website-390.png` });
await app2.getByRole("button", { name: "Load newer version" }).click().catch(() => {}); await app2.waitForTimeout(800);
const local = await app2.evaluate(() => JSON.parse(localStorage.getItem("ezvisa.wizard.v1") || "{}"));
log(local.form?.lastName === "FromWeb", "app: Load newer version shows the website's answers");

// ---------------- 5. Submitting turns the draft into the application (no second row) ----------------
const token = (await (await fetch(`${DB}/auth/v1/token?grant_type=password`, { method: "POST", body: JSON.stringify({ email: EMAIL, password: "test-pass" }) })).json()).access_token;
const draftRow = (await db())[0];
const submit = (body) => fetch(`${WEB}/api/submit-application`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
const base = { ...notes(draftRow).wizard, email: EMAIL, purposeOfTrip: "Tourism", travelStartDate: "2026-12-01", travelEndDate: "2026-12-10", draftId: draftRow.id };
const stale = await submit({ ...base, draftVersion: "2026-01-01T00:00:00.000000+00:00" });
log(stale.status === 409 && (await db())[0].application_status === "draft", "submit with an outdated version is refused (409), draft unchanged", String(stale.status));
const ok = await (await submit({ ...base, draftVersion: draftRow.updated_at })).json();
rows = await db();
log(ok.success && ok.applicationId === draftRow.id && rows.length === 1 && rows[0].application_status === "submitted", "submit converts the draft row (same id, one row)", `${rows.length} row(s), ${rows[0].application_status}`);
const again = await (await submit({ ...base, draftVersion: draftRow.updated_at })).json();
log(again.applicationId === draftRow.id && (await db()).length === 1, "submitting twice returns the same application", again.message);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close();
process.exit(failures ? 1 : 0);
