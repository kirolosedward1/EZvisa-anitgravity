// End-to-end check of Continue application (after payment) on the app's web build against scripts/mock-supabase.mjs:
// a "No" to a document never blocks, shows an "add it later" note, the application page lists "To get later",
// additional_notes.missingDocuments is saved, and a second account cannot open the first account's application.
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --clear --platform web --output-dir /tmp/web-dist
//   STATIC_DIR=/tmp/web-dist node scripts/mock-supabase.mjs &
//   node scripts/e2e-continue-web.mjs [screenshot dir] [en|ar]       (needs `playwright`; nothing here talks to the live database)
import { chromium } from "playwright";
import fs from "node:fs";

const APP = process.env.APP_URL || "http://localhost:8081";
const DB = process.env.MOCK_URL || "http://localhost:54321";
const OUT = process.argv[2] || "/tmp/continue-shots"; fs.mkdirSync(OUT, { recursive: true });
const LANG = process.argv[3] === "ar" ? "ar" : "en";
const A = "owner+ezvisa-app-test@example.com", B = "other+ezvisa-app-test@example.com";
let failures = 0;
const log = (ok, step, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  · " + info : ""}`); if (!ok) failures++; };
const AR = { No: "لا", Yes: "نعم", Continue: "متابعة", "Sign in": "تسجيل الدخول" };
const L = (s) => (LANG === "ar" ? AR[s] ?? s : s);

await fetch(`${DB}/__db/reset`, { method: "POST" });
// A paid application made in the app, with only the pre-payment answers (what the wizard asks before paying).
const wizard = { destination: "France", nationality: "India", countryOfResidence: "United Arab Emirates", cityOfResidence: "Dubai", firstName: "Test", lastName: "Owner",
  email: A, phone: "+971501234567", phoneCountry: "AE", phoneLocal: "501234567", maritalStatus: "single", spouseAccompanying: "" };
const ins = await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" },
  body: JSON.stringify({ email: A, full_name: "Test Owner", destination_country: "France", nationality: "India", application_status: "submitted", payment_status: "paid", payment_amount: 249,
    additional_notes: JSON.stringify({ source: "mobile-app", wizardStep: "payment", wizard }) }) });
const id = (await (await fetch(`${DB}/__db`)).json())[0]?.id;
log(ins.status === 201 && !!id, "seed: one paid application for account A", id);

const browser = await chromium.launch();
async function device(email) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((lang) => { localStorage.setItem("ezvisa.welcomed.v1", "1"); localStorage.setItem("ezvisa.lang.v1", lang); }, LANG);
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await page.goto(`${APP}/auth`); await page.waitForTimeout(1200);
  await page.locator("input").nth(0).fill(email); await page.locator("input").nth(1).fill("test-pass");
  await page.getByRole("button", { name: L("Sign in"), exact: true }).first().click(); await page.waitForTimeout(1800);
  return { ctx, page, errors };
}
const title = async (p) => (await p.getByTestId("question-title").first().textContent({ timeout: 4000 }).catch(() => null))?.trim() ?? null;
const cont = async (p) => { await p.getByRole("button", { name: L("Continue"), exact: true }).last().click({ timeout: 3000 }); await p.waitForTimeout(700); };
const tap = async (p, name) => { await p.getByRole("radio", { name, exact: true }).first().click({ timeout: 3000 }).catch(async () => { await p.getByText(name, { exact: true }).last().click({ timeout: 3000 }); }); await p.waitForTimeout(800); };
const date = async (p, v) => { await p.locator("input[type=date]").first().fill(v); await p.waitForTimeout(500); };

// ---------- account A answers every question after payment, saying No to every document ----------
const a = await device(A);
await a.page.goto(`${APP}/continue/${id}`); await a.page.waitForTimeout(2000);
const NO_DOCS = /residence visa|valid passport|No Objection|تأشيرة إقامتك|جواز سفر ساري|عدم ممانعة/i;
const notes = {}; const seen = [];
for (let n = 0; n < 40; n++) {
  const t = await title(a.page); if (!t) break;
  if (seen.at(-1) === t) { log(false, `stuck on "${t}"`); break; } seen.push(t);
  try {
    if (NO_DOCS.test(t)) {
      await tap(a.page, L("No"));
      const body = await a.page.locator("body").innerText();
      notes[t] = /add it later|before your visa appointment|Renew it before|أضف|لاحقًا|قبل موعد/i.test(body);
      await a.page.screenshot({ path: `${OUT}/no-${seen.length}.png` });
      if ((await title(a.page)) === t) await cont(a.page); // amber note: no auto-advance, Continue must work
      log((await title(a.page)) !== t, `"${t}" = No does not block`);
    } else if (await a.page.locator("input[type=date]").count()) {
      const v = /Return|العودة/i.test(t) ? "2026-12-20" : /Departure|المغادرة/i.test(t) ? "2026-12-10" : /Birth|الميلاد/i.test(t) ? "1990-01-15" : "2020-01-01";
      await date(a.page, v); if ((await title(a.page)) === t) await cont(a.page);
    } else if (await a.page.getByRole("radio").count()) {
      const yesNo = await a.page.getByRole("radio", { name: L("No"), exact: true }).count();
      if (yesNo) await tap(a.page, /first Schengen|أول تأشيرة/i.test(t) ? L("Yes") : L("No"));
      else if (/Employment Status|الوضع الوظيفي/i.test(t)) await tap(a.page, LANG === "ar" ? "موظف" : "Employed");
      else await a.page.getByRole("radio").first().click();
      await a.page.waitForTimeout(800); if ((await title(a.page)) === t) await cont(a.page);
    } else if (await a.page.getByTestId("question-input").count()) {
      await a.page.getByTestId("question-input").first().fill("Tester");
      if (await a.page.getByTestId("question-input-2").count()) await a.page.getByTestId("question-input-2").first().fill("EZvisa QA");
      await a.page.waitForTimeout(400); await cont(a.page);
    } else { await cont(a.page); }
  } catch (e) { log(false, `answer "${t}"`, e.message.split("\n")[0]); break; }
}
for (const [t, ok] of Object.entries(notes)) log(ok, `"${t}" = No shows a get-it-later note`);
log(Object.keys(notes).length >= 3, "asked residence visa, valid passport and NOC", Object.keys(notes).join(" | "));
await a.page.waitForTimeout(1500);
log(new URL(a.page.url()).pathname === `/applications/${id}`, "finished on the application page", a.page.url());
const page = await a.page.locator("body").innerText();
const later = LANG === "ar" ? ["للحصول عليه لاحقًا", "جواز سفر ساري", "تأشيرة إقامة إماراتية مجددة", "عدم ممانعة"] : ["To get later", "Valid passport", "Renewed UAE residence visa", "NOC from your employer"];
for (const s of later) log(page.includes(s), `application page shows "${s}"`);
await a.page.screenshot({ path: `${OUT}/application-to-get-later.png`, fullPage: true });
const row = (await (await fetch(`${DB}/__db`)).json()).find((r) => r.id === id);
const md = JSON.parse(row?.additional_notes || "{}").missingDocuments ?? [];
log(md.includes("Valid passport") && md.includes("NOC from your employer") && md.some((x) => /residence visa/i.test(x)), "row saved additional_notes.missingDocuments", JSON.stringify(md));
log(!row?.passport_number, "no passport number stored after valid passport = No");
log(a.errors.length === 0, "no page errors (A)", a.errors.join(" ; "));

// ---------- account B cannot open A's application ----------
const b = await device(B);
await b.page.goto(`${APP}/applications/${id}`); await b.page.waitForTimeout(2500);
const bText = await b.page.locator("body").innerText();
log(!bText.includes("Test Owner") && !bText.includes("Valid passport") && !bText.includes(A), "account B sees none of A's data on A's application URL");
await b.page.screenshot({ path: `${OUT}/account-b-on-a-url.png` });
const bRows = await (await fetch(`${DB}/rest/v1/visa_applications?select=*`, { headers: { authorization: `Bearer ${await b.page.evaluate(() => { for (const k of Object.keys(localStorage)) { try { const v = JSON.parse(localStorage.getItem(k)); if (v?.access_token) return v.access_token; } catch {} } return ""; })}` } })).json().catch(() => []);
log(Array.isArray(bRows) && bRows.length === 0, "REST with B's token returns 0 rows", `${Array.isArray(bRows) ? bRows.length : "?"} row(s)`);

await browser.close();
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
