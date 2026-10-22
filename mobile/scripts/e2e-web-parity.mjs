// The website's /apply follows the app's wizard rules and draft rules. Runs against scripts/mock-supabase.mjs and the
// website dev server (setup: see e2e-drafts-cross.mjs). Never the live database.
//   node scripts/e2e-web-parity.mjs [screenshot dir]
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
// The app's own lists (mobile/lib/wizard.ts), so the website is compared with the app, not with a copy.
const appWizard = fs.readFileSync(new URL("../lib/wizard.ts", import.meta.url), "utf8");
const APP_REQUIRED = JSON.parse(appWizard.match(/SCHENGEN_VISA_REQUIRED: string\[\] = (\[[^\]]*\])/)[1]);
const isoIn = (days) => { const d = new Date(Date.now() + days * 864e5); return d.toISOString().slice(0, 10); };

await fetch(`${DB}/__db/reset`, { method: "POST" });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const web = await ctx.newPage();
await web.goto(`${WEB}/login`); await web.fill("#email", EMAIL); await web.fill("#password", "test-pass");
await web.press("#password", "Enter"); await web.waitForURL(/dashboard/, { timeout: 60000 }).catch(() => {});

// 1. A link pre-fill alone creates no draft (the app also waits for a real answer).
await web.goto(`${WEB}/apply?step=personal&to=France&from=India`, { timeout: 120000 }); await web.waitForTimeout(3500);
log((await db()).length === 0, "link pre-fill alone creates no draft row", `${(await db()).length} row(s)`);
// Same steps as the app before payment: no Employment step, no passport number (both asked after payment).
const sidebar = await web.locator("body").innerText();
log(!/\bEmployment\b\s*\n?\s*Work & income details/.test(sidebar) && (await web.locator("#passportNumber").count()) === 0, "before payment: no Employment step and no passport number (asked after payment, like the app)");

// 2. Nationality list = the app's: visa-required only (UAE absent), every visa-required country reachable.
await web.getByRole("combobox").filter({ hasText: "India" }).click(); await web.waitForTimeout(400);
const listed = (await web.locator("[cmdk-item]").allInnerTexts()).map((t) => t.trim());
const same = listed.length === APP_REQUIRED.length && APP_REQUIRED.every((n) => listed.includes(n));
log(same && !listed.includes("United Arab Emirates"), "nationality list = the app's visa-required list (UAE absent)", `${listed.length} listed, app ${APP_REQUIRED.length}`);
await web.screenshot({ path: `${OUT}/web-03-nationality-390.png` });
await web.keyboard.press("Escape");

// 3. A visa-exempt nationality from a link is cleared (the app clears it too).
await web.goto(`${WEB}/apply?step=personal&to=France&from=United%20Arab%20Emirates`, { timeout: 120000 }); await web.waitForTimeout(3000);
if (await web.getByText("Continue Application?").isVisible().catch(() => false)) { await web.getByRole("button", { name: "Start Fresh" }).click(); await web.waitForTimeout(800); }
log((await web.getByRole("combobox").filter({ hasText: "United Arab Emirates" }).count()) === 0, "visa-exempt nationality from a link is not accepted");

// 4. Passport expiry is asked after "valid passport: yes" and must cover the return date + 3 months.
await web.getByRole("button", { name: "Yes", exact: true }).nth(1).click(); // [0] = Emirates ID, [1] = valid passport
const expiry = web.locator("#passportExpiry");
log(await expiry.isVisible().catch(() => false), "passport expiry date is asked after a valid passport");
await expiry.fill(isoIn(30)); await web.waitForTimeout(300);
log(await web.getByText("Passport must be valid at least 3 months after your return date").isVisible(), "expiry inside 3 months is refused (same message as the app)");
await web.screenshot({ path: `${OUT}/web-04-passport-expiry-390.png` });
await expiry.fill(isoIn(900)); await web.waitForTimeout(300);
log(!(await web.getByText("Passport must be valid at least 3 months after your return date").isVisible()), "expiry 2+ years ahead is accepted");

// 5. A real answer creates the draft, with the app's keys.
// The LAST answer must reach the row (an earlier save may land first, so wait for the final value, bounded).
const row = await until(async () => { const r = (await db())[0]; return r && notes(r).wizard?.passportExpiry === isoIn(900) ? r : null; }, 12000) ?? (await db())[0];
const n = notes(row);
log(!!row && row.application_status === "draft" && n.wizard?.passportExpiry === isoIn(900) && n.lastEditedOn === "website" && !!n.wizardStep, "a real answer creates the draft; answers stored as the app stores them", row ? `step=${n.wizardStep}, passportExpiry=${n.wizard?.passportExpiry}` : "no row");

// 6. The app reads the website's passport expiry (same field).
const appCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await appCtx.addInitScript(() => localStorage.setItem("ezvisa.welcomed.v1", "1"));
const app = await appCtx.newPage();
await app.goto(`${APP}/auth`); await app.getByPlaceholder("Email").fill(EMAIL); await app.getByPlaceholder("Password").fill("test-pass");
await app.getByRole("button", { name: "Sign in" }).click(); await app.waitForTimeout(1500);
await app.goto(`${APP}/apply`); await app.waitForTimeout(2500);
const appForm = await app.evaluate(() => JSON.parse(localStorage.getItem("ezvisa.wizard.v1") || "{}"));
log(appForm.draftId === row?.id && appForm.form?.passportExpiry === isoIn(900) && appForm.form?.nationality === "", "app opens the same draft with the website's passport expiry", `nationality="${appForm.form?.nationality}" (cleared visa-exempt)`);

// 7. Submit stores what the app's timeline and Continue screen read.
const token = (await (await fetch(`${DB}/auth/v1/token?grant_type=password`, { method: "POST", body: JSON.stringify({ email: EMAIL, password: "test-pass" }) })).json()).access_token;
const cur = (await db())[0];
const res = await (await fetch(`${WEB}/api/submit-application`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  body: JSON.stringify({ ...notes(cur).wizard, nationality: "India", email: EMAIL, purposeOfTrip: "tourism", travelStartDate: isoIn(20), travelEndDate: isoIn(30), employmentStatus: "employed", passportNumber: "A1234567", draftId: cur.id, draftVersion: cur.updated_at }) })).json();
const done = (await db())[0]; const dn = notes(done);
log(res.applicationId === cur.id && done.application_status === "submitted" && !!dn.submittedAt && dn.wizard?.passportExpiry === isoIn(900) && dn.wizard?.passportNumber === "A1234567",
  "submit keeps the row and stores submittedAt + wizard answers (app timeline / Continue screen)", `submittedAt=${dn.submittedAt?.slice(0, 19)}`);

// 7b. After payment: the dashboard offers Continue application; the answers land where the app reads them.
await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id: cur.id, patch: { payment_status: "paid" } }) });
await web.goto(`${WEB}/dashboard?id=${cur.id}`, { timeout: 120000 }); await web.waitForTimeout(1500);
const cont = web.getByRole("link", { name: "Continue application" });
log(await cont.isVisible().catch(() => false), "paid without employment: dashboard shows Continue application (same next action as the app)");
await web.screenshot({ path: `${OUT}/web-05-dashboard-continue-390.png` });
await cont.click(); await web.waitForURL(/apply\/continue\//, { timeout: 60000 }).catch(() => {});
await web.locator("#passportNumber").waitFor({ timeout: 60000 }).catch(async () => { await web.screenshot({ path: `${OUT}/web-06-continue-failed.png` }); console.log("continue page:", web.url(), (await web.locator("body").innerText()).slice(0, 300)); });
await web.locator("#passportNumber").fill("b7654321");
await web.selectOption("#employmentStatus", "business");
await web.locator("#companyName").fill("Acme Trading LLC");
await web.getByPlaceholder("e.g., 15,000 AED").fill("20,000 AED");
await web.screenshot({ path: `${OUT}/web-06-continue-390.png` });
await web.getByRole("button", { name: "Necessary Only" }).click({ timeout: 3000 }).catch(() => {}); // the site's cookie banner covers the bottom bar
await web.getByRole("button", { name: "Save" }).click();
await web.waitForURL(/dashboard/, { timeout: 60000 }).catch(() => {}); await web.waitForTimeout(800);
const paidRow = (await db())[0]; const pn = notes(paidRow);
log(paidRow.passport_number === "B7654321" && pn.wizard?.passportNumber === "B7654321" && pn.employmentStatus === "business" && pn.wizard?.companyName === "Acme Trading LLC" && pn.wizard?.averageMonthlyIncome === "20,000 AED" && pn.wizard?.jobTitle === "",
  "Continue application saves passport number + employment to the column and notes keys the app uses", `passport_number=${paidRow.passport_number}`);
log(!(await web.getByRole("link", { name: "Continue application" }).isVisible().catch(() => false)), "after saving, the dashboard no longer asks");

// 8. Sign-out clears this browser's wizard answers (the app wipes the phone).
await web.goto(`${WEB}/apply?step=personal`, { timeout: 120000 }); await web.waitForTimeout(1500);
const hadData = await web.evaluate(() => !!localStorage.getItem("visa_wizard_data"));
await web.evaluate(async () => { const f = document.createElement("form"); f.method = "POST"; f.action = "/api/auth/signout"; document.body.appendChild(f); f.submit(); });
await web.waitForURL(/login/, { timeout: 60000 }).catch(() => {}); await web.waitForTimeout(1500);
const after = await web.evaluate(() => [localStorage.getItem("visa_wizard_data"), localStorage.getItem("visa_wizard_draft_meta")]);
log(hadData && after.every((v) => v === null), "sign-out clears the wizard answers and draft link in this browser", web.url().replace(WEB, ""));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
await browser.close();
process.exit(failures ? 1 : 0);
