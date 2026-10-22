// Regression checks for draft-sync bugs found in QA (each one failed before its fix). App web build + mock DB only:
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --platform web --output-dir /tmp/web-dist
//   STATIC_DIR=/tmp/web-dist node scripts/mock-supabase.mjs &
//   node scripts/e2e-drafts-qa.mjs [screenshot dir]
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
const notes = (r) => JSON.parse(r?.additional_notes || "{}");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(200); } return null; }
const reset = () => fetch(`${DB}/__db/reset`, { method: "POST" });

const browser = await chromium.launch();
async function device({ signedIn = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => localStorage.setItem("ezvisa.welcomed.v1", "1"));
  const page = await ctx.newPage();
  if (signedIn) {
    await page.goto(`${APP}/auth`); await page.getByPlaceholder("Email").fill(EMAIL); await page.getByPlaceholder("Password").fill("test-pass");
    await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForTimeout(1500);
  }
  return { ctx, page };
}
const title = async (p) => (await p.getByTestId("question-title").first().textContent({ timeout: 4000 }).catch(() => null))?.trim() ?? "";
const indicator = async (p) => (await p.getByTestId("saved-indicator").first().textContent({ timeout: 2000 }).catch(() => null))?.trim() ?? null;
async function pick(p, name) { await p.getByRole("radio", { name, exact: true }).first().click(); await p.waitForTimeout(700); }
async function dismissResume(p) { if (await p.getByText("Continue Application?").isVisible().catch(() => false)) { await p.getByRole("button", { name: "Continue", exact: true }).last().click(); await p.waitForTimeout(500); } }
/** Answers whatever question is showing until `stop` matches the title (or Review shows). */
async function walk(p, stop, guestEmail) {
  for (let i = 0; i < 20; i++) {
    const tt = await title(p);
    if ((stop && stop.test(tt)) || (await p.getByText("Review", { exact: true }).first().isVisible().catch(() => false) && !tt)) return tt;
    const inputs = p.getByTestId("question-input");
    if (await inputs.count()) {
      const ph = (await inputs.first().getAttribute("placeholder")) ?? "";
      await inputs.first().fill(ph.includes("@") ? guestEmail ?? EMAIL : "Kirolos");
      if (await p.getByTestId("question-input-2").count()) await p.getByTestId("question-input-2").fill("Test");
    }
    const phone = p.getByPlaceholder("50 123 4567");
    if (await phone.count()) await phone.fill("501234567");
    if (!(await inputs.count()) && !(await phone.count())) {
      const named = ["France", "India", "Dubai", "Single", "No"];
      let done = false;
      for (const n of named) { const r = p.getByRole("radio", { name: n, exact: true }); if (await r.count()) { await r.first().click(); done = true; break; } }
      if (!done) await p.getByRole("radio").first().click().catch(() => {});
      await p.waitForTimeout(700);
      if ((await title(p)) !== tt) continue;
    }
    await p.getByRole("button", { name: "Continue", exact: true }).first().click().catch(() => {});
    await p.waitForTimeout(700);
  }
  return await title(p);
}

// ---- A1: "Keep this version" writes the phone's answers over the newer copy (it used to only say "Saved") ----
await reset();
{
  const { page } = await device();
  await page.goto(`${APP}/apply`); await page.waitForTimeout(1500);
  await pick(page, "France");
  const row = await until(async () => (await db())[0]);
  await until(async () => (await indicator(page)) === "Saved");
  const n = notes(row);
  await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id: row.id, patch: { additional_notes: JSON.stringify({ ...n, lastEditedOn: "website", wizard: { ...n.wizard, destination: "Germany" } }) } }) });
  const vWeb = (await db())[0].updated_at;
  await page.goto(`${APP}/apply?resume=1`); await page.waitForTimeout(2500); // relaunch: the newer copy is detected with nothing unsaved
  await dismissResume(page);
  const sheet = await until(async () => page.getByTestId("draft-conflict").isVisible().catch(() => false), 8000);
  log(!!sheet, "A1 relaunch with a newer server copy shows the prompt");
  await page.getByRole("button", { name: "Keep this version" }).click().catch(() => {});
  const kept = await until(async () => { const r = (await db())[0]; return r.updated_at !== vWeb && notes(r).wizard?.destination === "France" ? r : null; }, 10000);
  log(!!kept && (await indicator(page)) === "Saved", "A1 Keep this version writes the phone's copy, then Saved", kept ? `destination=${notes(kept).wizard.destination}` : `server still ${notes((await db())[0]).wizard?.destination}`);
}

// ---- A2: a save whose reply is lost, then Back to the last saved screen: the server must end up with the screen ----
await reset();
{
  const { page } = await device();
  await page.goto(`${APP}/apply`); await page.waitForTimeout(1500);
  const nameTitle = await walk(page, /name/i);
  await page.getByTestId("question-input").first().fill("Kirolos"); await page.getByTestId("question-input-2").fill("Test");
  await until(async () => notes((await db())[0]).wizard?.lastName === "Test" && (await indicator(page)) === "Saved", 10000);
  const q0 = notes((await db())[0]).wizardQuestion;
  let dropped = 0; let blocked = false;
  await page.route("**/rest/v1/visa_applications**", async (route) => {
    if (route.request().method() === "PATCH" && dropped === 0) { dropped++; blocked = true; await route.fetch(); return route.abort("failed"); }
    if (route.request().method() === "PATCH" && blocked) return route.abort("failed"); // nothing reaches the server
    return route.continue();
  });
  await page.getByRole("button", { name: "Continue", exact: true }).first().click(); // next question: saved, reply lost
  await until(async () => dropped === 1, 8000); await page.waitForTimeout(800);
  const lostQ = notes((await db())[0]).wizardQuestion;
  await page.getByRole("button", { name: "Back" }).first().click(); // back to the answers the phone last confirmed
  // While no save can land the server still holds the lost screen, so "Saved" would be untrue.
  let early = null;
  for (let i = 0; i < 15 && !early; i++) { const s = await indicator(page); if (s === "Saved") early = s; await sleep(200); }
  blocked = false;
  const fixed = await until(async () => notes((await db())[0]).wizardQuestion === q0 && (await indicator(page)) === "Saved", 20000);
  log(dropped === 1 && lostQ !== q0 && !early && !!fixed, "A2 after a lost reply and Back, Saved shows only once the server holds the screen again",
    `${nameTitle}: ${q0} -> ${lostQ} -> ${notes((await db())[0]).wizardQuestion}${early ? " · Saved shown while the server held " + lostQ : ""}`);
  await page.unroute("**/rest/v1/visa_applications**");
}

// ---- A5: guest submit whose reply is lost, then Submit again: still one application ----
await reset();
{
  const { page } = await device({ signedIn: false });
  const guest = "guest+ezvisa-app-test@example.com";
  await page.goto(`${APP}/`); await page.waitForTimeout(1500);
  await page.getByText("Continue without an account").click().catch(() => {}); await page.waitForTimeout(1500); // guest checkout
  await page.getByRole("button", { name: "New application" }).first().click(); await page.waitForTimeout(1500); // in-app: a reload drops guest mode
  await walk(page, /^$/, guest); // to Review
  let dropped = 0;
  await page.route("**/rest/v1/visa_applications**", async (route) => {
    if (route.request().method() === "POST" && dropped === 0) { dropped++; await route.fetch(); return route.abort("failed"); }
    return route.continue();
  });
  const submit = page.getByRole("button", { name: "Submit application" });
  const onReview = await submit.isVisible().catch(() => false);
  await submit.click().catch(() => {}); await page.waitForTimeout(1500);
  await submit.click().catch(() => {}); await page.waitForTimeout(2000);
  const rows = (await db()).filter((r) => r.email === guest);
  log(onReview && dropped === 1 && rows.length === 1 && rows[0].application_status === "submitted" && (await page.getByText("Submitted", { exact: true }).isVisible().catch(() => false)),
    "A5 guest submit retried after a lost reply: one application, confirmed", `${rows.length} row(s)`);
  await page.screenshot({ path: `${OUT}/qa-a5-guest.png` });
}

// ---- A10: discarding a local draft also discards its server draft (it used to come back on resume) ----
await reset();
{
  const { page } = await device();
  await page.goto(`${APP}/apply`); await page.waitForTimeout(1500);
  await pick(page, "France"); await until(async () => (await db()).length === 1);
  await page.goto(`${APP}/apply?to=Germany`); await page.waitForTimeout(2000); await dismissResume(page);
  await pick(page, "India"); await until(async () => (await db()).length === 2, 10000);
  await page.goto(`${APP}/`); await page.waitForTimeout(2500);
  page.once("dialog", (d) => d.accept());
  const removeBtn = page.getByTestId("draft-remove").first();
  const hadRemove = await removeBtn.isVisible().catch(() => false);
  await removeBtn.click().catch(() => {}); await page.waitForTimeout(1500);
  const after = await db();
  const cancelled = after.filter((r) => r.application_status === "cancelled");
  log(hadRemove && cancelled.length === 1 && after.filter((r) => r.application_status === "draft").length === 1, "A10 discarding a local draft cancels its server draft", after.map((r) => `${r.destination_country}:${r.application_status}`).join(", "));
}

// ---- A4 (web build): sign-out with unsaved answers asks first ----
await reset();
{
  const { ctx, page } = await device();
  await page.goto(`${APP}/apply`); await page.waitForTimeout(1500);
  await pick(page, "France"); await until(async () => (await db()).length === 1);
  // The database is unreachable (only the backend, so the app itself still loads): the next answer can't be saved.
  await page.route("**/rest/v1/**", (route) => route.abort("failed"));
  await pick(page, "India"); await page.waitForTimeout(1200);
  await page.goto(`${APP}/account`).catch(() => {}); await page.waitForTimeout(2000);
  let asked = ""; let askedAt = 0;
  page.once("dialog", async (d) => { asked = d.message(); askedAt = Date.now(); await d.dismiss(); });
  const t0 = Date.now();
  await page.getByText("Sign out", { exact: true }).last().click().catch(() => {});
  await until(async () => !!asked, 15000);
  const ms = askedAt - t0;
  log(/aren't saved/.test(asked) && ms < 6000, "A4 sign-out with unsaved answers warns within a few seconds", `${ms} ms · ${asked.split("\n")[2]?.slice(0, 60) ?? "(no dialog)"}`);
  log(page.url().includes("account"), "A4 dismissing the warning keeps the user signed in");
  await page.unroute("**/rest/v1/**");
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close();
process.exit(failures ? 1 : 0);
