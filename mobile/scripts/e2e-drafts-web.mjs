// End-to-end check of draft autosave / resume / conflicts on the app's web build against scripts/mock-supabase.mjs.
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --platform web --output-dir /tmp/web-dist
//   STATIC_DIR=/tmp/web-dist node scripts/mock-supabase.mjs &
//   node scripts/e2e-drafts-web.mjs [screenshot dir]        (needs `playwright`; Chromium from PLAYWRIGHT_BROWSERS_PATH)
// Each device is a separate browser context (own storage = own phone). Nothing here talks to the live database.
import { chromium } from "playwright";
import fs from "node:fs";

const APP = process.env.APP_URL || "http://localhost:8081";
const DB = process.env.MOCK_URL || "http://localhost:54321";
const OUT = process.argv[2] || "/tmp/e2e-drafts";
fs.mkdirSync(OUT, { recursive: true });
const EMAIL = "kirolos+ezvisa-app-test@example.com";
let failures = 0;
const log = (ok, step, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  · " + info : ""}`); if (!ok) failures++; };
const db = async () => (await fetch(`${DB}/__db`)).json();
const drafts = async () => (await db()).filter((r) => r.application_status === "draft");
const notes = (r) => JSON.parse(r.additional_notes || "{}");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(150); } return null; }

const browser = await chromium.launch();
async function device(name, { width = 390, scheme = "light", lang } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 3, colorScheme: scheme });
  await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] pageerror`, e.message.slice(0, 200)));
  return { ctx, page, name, lang };
}
async function signIn(d) {
  await d.page.goto(`${APP}/auth`); await d.page.getByPlaceholder("Email").fill(EMAIL); await d.page.getByPlaceholder("Password").fill("test-pass");
  await d.page.getByRole("button", { name: "Sign in" }).click(); await d.page.waitForTimeout(1500);
  if (d.lang) await d.page.evaluate((l) => localStorage.setItem("ezvisa.lang.v1", l), d.lang); // language after sign-in (the form is translated)
}
const indicator = async (d) => (await d.page.getByTestId("saved-indicator").first().textContent({ timeout: 3000 }).catch(() => null))?.trim() ?? null;
const title = async (d) => (await d.page.getByTestId("question-title").first().textContent({ timeout: 4000 }).catch(() => null))?.trim() ?? null;
const shot = (d, file) => d.page.screenshot({ path: `${OUT}/${file}.png` });
/** Changes the current answer: types into a text question, otherwise picks an option (works whatever the question order). */
async function answerCurrent(d) {
  const input = d.page.getByTestId("question-input");
  if (await input.count()) { await input.first().fill(`Edit${Date.now() % 1000}`); if (await d.page.getByTestId("question-input-2").count()) await d.page.getByTestId("question-input-2").fill("Test"); }
  else await d.page.getByRole("radio").nth(1).click().catch(() => {});
  await d.page.waitForTimeout(400);
}
async function pick(d, name) { await d.page.getByRole("radio", { name, exact: true }).first().click(); await d.page.waitForTimeout(700); }

await fetch(`${DB}/__db/reset`, { method: "POST" });

// ---------------- 1. Autosave after each answer, one row, step saved ----------------
const A = await device("A");
await signIn(A);
await A.page.goto(`${APP}/apply`); await A.page.waitForTimeout(1500);
log((await title(A)) !== null, "wizard opens", await title(A));
await pick(A, "France");
const firstSaved = await until(async () => (await indicator(A)) === "Saved");
log(!!firstSaved, "indicator shows Saved after the first answer is confirmed", String(await indicator(A)));
let rows = await drafts();
log(rows.length === 1 && rows[0].destination_country === "France", "one draft row created", `${rows.length} row(s)`);
const id = rows[0]?.id; const q1 = notes(rows[0] ?? {}).wizardQuestion;
log(!!q1, "current question saved on the row", `wizardQuestion=${q1}`);
await pick(A, "India");
await until(async () => notes((await drafts())[0]).wizard?.nationality === "India");
rows = await drafts();
log(rows.length === 1 && rows[0].id === id && notes(rows[0]).wizard?.nationality === "India", "next answer updates the same row (no duplicate)", `question=${notes(rows[0]).wizardQuestion}`);
await until(async () => (await indicator(A)) === "Saved");
await shot(A, "01-saved-390-light");

// ---------------- 2. App killed -> resumes on the same question ----------------
const before = await title(A); const savedQ = notes((await drafts())[0]).wizardQuestion;
await A.page.close(); A.page = await A.ctx.newPage(); // the "app" restarts with the same phone storage
await A.page.goto(`${APP}/apply?resume=1`); await A.page.waitForTimeout(2500);
log((await title(A)) === before, "after restart the wizard is on the same question", `${await title(A)} (row: ${savedQ})`);
log((await db()).length === 1, "restart created no row", `${(await db()).length} row(s)`);

// ---------------- 3. Offline: not saved, kept on the phone, saved when back ----------------
await A.ctx.setOffline(true); await A.page.waitForTimeout(500);
const offTitle = await title(A);
await A.page.getByRole("radio").first().click().catch(() => {}); await A.page.waitForTimeout(1800);
const offText = await indicator(A);
log(offText?.startsWith("Not saved"), "offline: indicator says Not saved", String(offText));
await shot(A, "02-offline-390-light");
const offlineQ = notes((await drafts())[0]).wizardQuestion;
await A.ctx.setOffline(false);
const back = await until(async () => (await indicator(A)) === "Saved", 15000);
const afterQ = notes((await drafts())[0]).wizardQuestion;
log(!!back && afterQ !== offlineQ, "back online: the offline answer is saved", `${offlineQ} -> ${afterQ}`);

// ---------------- 4. Another device (or the website) saves a newer copy -> prompt, no overwrite ----------------
const cur = (await drafts())[0]; const n = notes(cur);
await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id, patch: { additional_notes: JSON.stringify({ ...n, lastEditedOn: "website", wizardStep: "personal", wizardQuestion: undefined, wizard: { ...n.wizard, firstName: "WebEdit" } }) } }) });
const webVersion = (await drafts())[0].updated_at;
await answerCurrent(A); // a real change on whatever question is showing
await A.page.getByRole("button", { name: "Continue" }).click().catch(() => {});
const sheet = await until(async () => A.page.getByTestId("draft-conflict").isVisible().catch(() => false), 8000);
log(!!sheet, "newer server copy: the app asks instead of saving");
await shot(A, "03-conflict-390-light");
const untouched = (await drafts())[0];
log(untouched.updated_at === webVersion && notes(untouched).wizard?.firstName === "WebEdit", "newer server copy was not overwritten");
await A.page.getByRole("button", { name: "Load newer version" }).click({ timeout: 5000 }).catch(() => {}); await A.page.waitForTimeout(1200);
log((await indicator(A)) === "Saved" && (await drafts())[0].updated_at === webVersion, "Load newer version: shows the server copy, writes nothing", String(await indicator(A)));

// ---------------- 5. Second device resumes the same draft (start on one, continue on the other) ----------------
const B = await device("B", { width: 430 });
await signIn(B);
await B.page.goto(`${APP}/apply`); await B.page.waitForTimeout(2500);
const bTitle = await title(B);
log(!!bTitle, "device B opens the account's draft", `${bTitle} · ${await indicator(B)}`);
await shot(B, "04-resumed-430-light");
const vBefore = (await drafts())[0].updated_at;
if (await B.page.getByText("Continue Application?").isVisible().catch(() => false)) await B.page.getByRole("button", { name: "Continue", exact: true }).last().click();
await pick(B, "France"); // answers the question it resumed on and moves on
const bSaved = await until(async () => (await indicator(B)) === "Saved" && (await drafts())[0].updated_at !== vBefore);
log(!!bSaved && (await db()).length === 1, "device B saves into the same row", `${(await db()).length} row(s), question=${notes((await drafts())[0]).wizardQuestion}`);
// A (still showing the older copy) comes back and answers: it must ask, not overwrite B's save.
const vB = (await drafts())[0].updated_at;
await A.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await A.page.getByRole("radio").nth(1).click().catch(() => {}); await A.page.waitForTimeout(400);
await A.page.getByRole("button", { name: "Continue" }).click({ timeout: 2000 }).catch(() => {});
const aSheet = await until(async () => A.page.getByTestId("draft-conflict").isVisible().catch(() => false), 8000);
log(!!aSheet && (await drafts())[0].updated_at === vB, "device A is told about B's newer copy and B's save is kept");
await shot(A, "03b-conflict-from-other-device-390-light");
await A.page.getByRole("button", { name: "Load newer version" }).click({ timeout: 5000 }).catch(() => {}); await A.page.waitForTimeout(800);

// ---------------- 6. Dark mode + Arabic (RTL) screenshots of the indicator ----------------
for (const [w, scheme, lang] of [[390, "dark"], [430, "dark"], [430, "light"], [390, "light", "ar"], [430, "dark", "ar"]]) {
  const D = await device(`shot-${w}-${scheme}-${lang ?? "en"}`, { width: w, scheme, lang });
  await signIn(D); await D.page.goto(`${APP}/apply`); await D.page.waitForTimeout(2500);
  const resume = D.page.getByTestId("question-title"); // the resume prompt ("Continue Application?") is answered with Continue
  if ((await D.page.getByRole("button").filter({ hasText: /^(Continue|متابعة)$/ }).count()) > 1) await D.page.getByRole("button").filter({ hasText: /^(Continue|متابعة)$/ }).last().click();
  await resume.first().waitFor({ timeout: 4000 }).catch(() => {}); await D.page.waitForTimeout(600);
  await until(async () => (await D.page.getByTestId("saved-indicator").count()) > 0, 4000);
  await shot(D, `05-question-${w}-${scheme}${lang ? "-" + lang : ""}`);
  if (w === 430 && scheme === "dark" && !lang) {
    await D.ctx.setOffline(true); await D.page.getByRole("button", { name: "Back" }).click().catch(() => {}); await D.page.waitForTimeout(1500);
    await shot(D, "06-offline-430-dark");
    await D.ctx.setOffline(false);
  }
  await D.ctx.close();
}

log((await db()).length === 1, "whole run: still exactly one application row", `${(await db()).length} row(s)`);

// ---------------- 7. Save reaches the server but the answer is lost (= app killed mid-save) ----------------
await fetch(`${DB}/__db/reset`, { method: "POST" });
const E = await device("E");
let dropped = 0;
await E.page.route("**/rest/v1/visa_applications**", async (route) => {
  if (route.request().method() === "POST" && dropped === 0) { dropped++; await route.fetch(); return route.abort("failed"); } // the insert lands, the reply never arrives
  return route.continue();
});
await signIn(E); await E.page.goto(`${APP}/apply`); await E.page.waitForTimeout(1500);
await pick(E, "Germany");
const eSaved = await until(async () => (await indicator(E)) === "Saved", 15000);
const eSheet = await E.page.getByTestId("draft-conflict").isVisible().catch(() => false);
log(dropped === 1 && !!eSaved && !eSheet && (await db()).length === 1, "lost reply after insert: retry adopts the row (no duplicate, no false conflict)", `${(await db()).length} row(s)`);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close();
process.exit(failures ? 1 : 0);
