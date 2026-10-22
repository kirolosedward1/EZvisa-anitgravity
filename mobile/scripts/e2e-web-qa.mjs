// Regression checks for website draft/submit bugs found in QA (each failed before its fix). Website dev server + mock DB:
//   STATIC_DIR=<app web export> node scripts/mock-supabase.mjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-mock SUPABASE_URL=http://localhost:54321 \
//     SUPABASE_SERVICE_ROLE_KEY=mock-service-role npx next dev -p 3000
//   node scripts/e2e-web-qa.mjs [screenshot dir]
import { chromium } from "playwright";
import fs from "node:fs";

const WEB = process.env.WEB_URL || "http://localhost:3000";
const DB = process.env.MOCK_URL || "http://localhost:54321";
const OUT = process.argv[2] || "/tmp/e2e-drafts";
fs.mkdirSync(OUT, { recursive: true });
const A = "kirolos+ezvisa-app-test@example.com";
const B = "other+ezvisa-app-test@example.com";
let failures = 0;
const log = (ok, step, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  · " + info : ""}`); if (!ok) failures++; };
const db = async () => (await fetch(`${DB}/__db`)).json();
const notes = (r) => JSON.parse(r?.additional_notes || "{}");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(200); } return null; }
const reset = () => fetch(`${DB}/__db/reset`, { method: "POST" });
const token = async (email) => (await (await fetch(`${DB}/auth/v1/token?grant_type=password`, { method: "POST", body: JSON.stringify({ email, password: "test-pass" }) })).json()).access_token;
const submit = (body, tok) => fetch(`${WEB}/api/submit-application`, { method: "POST", headers: { "content-type": "application/json", ...(tok && { authorization: `Bearer ${tok}` }) }, body: JSON.stringify(body) });
const base = { firstName: "Kirolos", lastName: "Test", email: A, phone: "+971 50 123 4567", nationality: "India", destination: "France", purposeOfTrip: "tourism", travelStartDate: "2026-12-01", travelEndDate: "2026-12-10" };
/** A server draft as the app would write it. */
async function seedDraft(email, wizard, status = "draft") {
  const tok = await token(email);
  const id = crypto.randomUUID();
  await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: JSON.stringify({ id, email, full_name: "Kirolos Test", phone: "1", nationality: wizard.nationality ?? "", destination_country: wizard.destination ?? "", travel_purpose: "", application_status: status, payment_status: "pending",
      additional_notes: JSON.stringify({ source: "mobile-app", lastEditedOn: "app", wizardStep: "personal", wizard }) }) });
  return id;
}

const browser = await chromium.launch();
async function signedIn(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/login`); await page.fill("#email", email); await page.fill("#password", "test-pass");
  await page.press("#password", "Enter"); await page.waitForURL(/dashboard/, { timeout: 60000 }).catch(() => {});
  return { ctx, page };
}
async function cookies(page) { await page.getByRole("button", { name: "Necessary Only" }).click({ timeout: 3000 }).catch(() => {}); }

// ---- API: server-side rules (W7, W8) ----
await reset();
{
  const r1 = await submit({ ...base, nationality: "United Arab Emirates" });
  log(r1.status === 400 && (await db()).length === 0, "W7 a visa-exempt nationality is refused by the API", String(r1.status));
  const r2 = await submit({ ...base, passportExpiry: "2026-12-20" });
  log(r2.status === 400 && (await db()).length === 0, "W7 a passport that doesn't cover return + 3 months is refused by the API", String(r2.status));
  const draftA = await seedDraft(A, { destination: "France", nationality: "India" });
  const r3 = await submit({ ...base, draftId: draftA, draftVersion: "x" });
  log(r3.status === 403 && (await db()).length === 1, "W8 a draft submit without a token writes nothing (no guest insert)", String(r3.status));
  const r4 = await submit({ ...base, email: B, draftId: draftA, draftVersion: (await db())[0].updated_at }, await token(B));
  log(r4.status === 403 && (await db()).length === 1 && (await db())[0].application_status === "draft", "W8 another account's token can't submit or copy this draft", String(r4.status));
  const r5 = await submit({ ...base, draftId: draftA }, await token(A));
  log(r5.status === 403 && (await db())[0].application_status === "draft", "W8 a draft submit without the version writes nothing", String(r5.status));
  await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id: draftA, patch: { application_status: "cancelled" } }) });
  const r6 = await submit({ ...base, draftId: draftA, draftVersion: (await db())[0].updated_at }, await token(A));
  const j6 = await r6.json().catch(() => ({}));
  log(r6.status === 409 && (await db()).length === 1 && !j6.applicationId, "a discarded draft is not submitted (409), no new row", `${r6.status} ${j6.message ?? ""}`);
  const r7 = await submit({ ...base, nationality: "India" });
  const j7 = await r7.json().catch(() => ({}));
  log(r7.ok && !("error" in j7), "guest submit still works; responses carry no raw database error", String(r7.status));
}

// ---- W1: Pay clicked twice after a failed payment start: one application ----
await reset();
{
  const { page } = await signedIn(A);
  await page.goto(`${WEB}/apply?step=personal&to=France&from=India`, { timeout: 120000 }); await page.waitForTimeout(2500); await cookies(page);
  await page.fill("#firstName", "Kirolos"); await page.fill("#lastName", "Test");
  await until(async () => notes((await db())[0]).wizard?.lastName === "Test", 12000);
  await page.goto(`${WEB}/apply?step=payment`, { timeout: 120000 }); await page.waitForTimeout(2500);
  if (await page.getByText("Continue Application?").isVisible().catch(() => false)) { await page.getByRole("button", { name: "Restore Details" }).click(); await page.waitForTimeout(1500); }
  const pay = page.getByRole("button", { name: /Proceed to Payment/ });
  await pay.click(); await page.waitForTimeout(3000); // create-payment fails here (no Ziina key): the error is shown
  await pay.click().catch(() => {}); await page.waitForTimeout(3000);
  const rows = await db();
  log(rows.length === 1 && rows[0].application_status === "submitted", "W1 Pay twice after a failed payment start: still one application", rows.map((r) => r.application_status).join(","));
}

// ---- W2: a newer copy in the app blocks submit instead of creating a guest row ----
await reset();
{
  const { page } = await signedIn(A);
  await page.goto(`${WEB}/apply?step=personal&to=France&from=India`, { timeout: 120000 }); await page.waitForTimeout(2500); await cookies(page);
  await page.fill("#firstName", "Kirolos");
  const row = await until(async () => (await db())[0], 12000);
  await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id: row.id, patch: { additional_notes: JSON.stringify({ ...notes(row), lastEditedOn: "app", wizard: { ...notes(row).wizard, firstName: "FromApp" } }) } }) });
  await page.fill("#lastName", "Changed"); // the save finds the newer copy: conflict
  await until(async () => page.getByRole("dialog").isVisible().catch(() => false), 10000);
  await page.goto(`${WEB}/apply?step=payment`, { timeout: 120000 }).catch(() => {}); await page.waitForTimeout(2500);
  if (await page.getByText("Continue Application?").isVisible().catch(() => false)) { await page.getByRole("button", { name: "Restore Details" }).click(); await page.waitForTimeout(1500); }
  // The newer copy is detected again on this page; paying must not go around it.
  await page.getByRole("button", { name: /Proceed to Payment/ }).click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(3000);
  const rows = await db();
  log(rows.length === 1 && rows[0].application_status === "draft" && notes(rows[0]).wizard?.firstName === "FromApp", "W2 with a newer copy pending, Pay creates no second row and overwrites nothing", rows.map((r) => `${r.application_status}`).join(","));
  await page.screenshot({ path: `${OUT}/qa-w2-blocked.png` });
}

// ---- W3: another account in the same browser never receives the previous person's answers ----
await reset();
{
  const { page } = await signedIn(A);
  await page.goto(`${WEB}/apply?step=personal&to=France&from=India`, { timeout: 120000 }); await page.waitForTimeout(2500); await cookies(page);
  await page.fill("#firstName", "PersonA");
  await until(async () => notes((await db())[0]).wizard?.firstName === "PersonA", 12000);
  await page.goto(`${WEB}/login`); await page.fill("#email", B); await page.fill("#password", "test-pass"); // no sign-out in between
  await page.press("#password", "Enter"); await page.waitForURL(/dashboard/, { timeout: 60000 }).catch(() => {});
  await page.goto(`${WEB}/apply?step=personal`, { timeout: 120000 }); await page.waitForTimeout(3500);
  if (await page.getByText("Continue Application?").isVisible().catch(() => false)) { await page.getByRole("button", { name: "Restore Details" }).click(); await page.waitForTimeout(2500); }
  const bRows = (await db()).filter((r) => r.email === B);
  log(!bRows.some((r) => notes(r).wizard?.firstName === "PersonA") && (await page.inputValue("#firstName")) !== "PersonA", "W3 account B never gets account A's answers", `B rows: ${bRows.length}, field: "${await page.inputValue("#firstName")}"`);
}

// ---- W9: a saved draft resumes from a link for the same country, not for another country ----
await reset();
{
  await seedDraft(A, { destination: "France", nationality: "India", firstName: "Resumed" });
  const { page } = await signedIn(A);
  await page.goto(`${WEB}/apply?step=personal&to=France`, { timeout: 120000 }); await page.waitForTimeout(3500);
  log((await page.inputValue("#firstName")) === "Resumed", "W9 a link for the same country resumes the saved draft", `"${await page.inputValue("#firstName")}"`);
  const { page: p2 } = await signedIn(A);
  await p2.goto(`${WEB}/apply?step=personal&to=Germany`, { timeout: 120000 }); await p2.waitForTimeout(3500);
  log((await p2.inputValue("#firstName")) !== "Resumed", "W9 a link for another country starts that application", `"${await p2.inputValue("#firstName")}"`);
}

// ---- W10: "Load newer version" doesn't write the copy straight back (no ping-pong with the app) ----
await reset();
{
  const { page } = await signedIn(A);
  await page.goto(`${WEB}/apply?step=personal&to=France&from=India`, { timeout: 120000 }); await page.waitForTimeout(2500); await cookies(page);
  await page.fill("#firstName", "Kirolos");
  const row = await until(async () => { const r = (await db())[0]; return r && notes(r).wizard?.firstName === "Kirolos" ? r : null; }, 12000);
  // The app saves its own shape (app-only keys, no website keys).
  await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id: row.id, patch: { additional_notes: JSON.stringify({ source: "website", lastEditedOn: "app", wizardStep: "personal", wizardQuestion: "name", wizard: { destination: "France", nationality: "India", firstName: "FromApp", phoneLocal: "501234567", phoneCountry: "AE" } }) } }) });
  const vApp = (await db())[0].updated_at;
  await page.fill("#lastName", "Mine");
  await until(async () => page.getByRole("dialog").isVisible().catch(() => false), 10000);
  await page.getByRole("button", { name: "Load newer version" }).click();
  await page.waitForTimeout(4000);
  log((await db())[0].updated_at === vApp && (await page.inputValue("#firstName")) === "FromApp", "W10 the loaded app copy shows and is not written back", `${(await db())[0].updated_at === vApp ? "unchanged" : "rewritten"}`);
}

// ---- W4: no open redirect after sign-in ----
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${WEB}/login?next=${encodeURIComponent("/\\evil.example")}`); await page.fill("#email", A); await page.fill("#password", "test-pass");
  await page.press("#password", "Enter"); await page.waitForTimeout(4000);
  log(new URL(page.url()).host === new URL(WEB).host && !/evil/.test(page.url()), "W4 a backslash 'next' stays on this site", page.url().replace(WEB, ""));
}

// ---- payment success clears this browser's wizard (it used a key that never existed) ----
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${WEB}/login`);
  await page.evaluate(() => { localStorage.setItem("visa_wizard_data", "{\"firstName\":\"x\"}"); localStorage.setItem("visa_wizard_draft_meta", "{}"); });
  await page.goto(`${WEB}/payment-success?appId=00000000-0000-4000-8000-000000000001`, { timeout: 120000 }); await page.waitForTimeout(2000);
  const left = await page.evaluate(() => [localStorage.getItem("visa_wizard_data"), localStorage.getItem("visa_wizard_draft_meta")]);
  log(left.every((v) => v === null), "payment success clears the paid application's answers from this browser");
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close();
process.exit(failures ? 1 : 0);
