// The v1.1 wizard end to end on the app's web build against scripts/mock-supabase.mjs (no live data):
//   node scripts/mock-supabase.mjs &
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo start --web --port 8081 &
//   node scripts/e2e-wizard-web.mjs [screenshot dir]     (APP_URL, MOCK_URL, PLAYWRIGHT, CHROMIUM if needed)
// Signed in: destination, nationality, name, contact (phone only), travelling with, then Review → insurance → price with
// the contract's 249 AED. Guest: the contact screen asks the email too (pay first, account after payment), and the
// payment result offers "Create your account" with that email. The payment gateway itself is not opened here.
import fs from "node:fs";
const pw = await import(process.env.PLAYWRIGHT || "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const OUT = process.argv[2] || "/tmp/e2e-wizard"; fs.mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL || "http://localhost:8081"; const MOCK = process.env.MOCK_URL || "http://localhost:54321";
let fails = 0; const log = (ok, s, i = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${s}${i ? "  · " + i : ""}`); if (!ok) fails++; };
await fetch(`${MOCK}/__db/reset`, { method: "POST" });
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const title = async (p) => (await p.getByTestId("question-title").first().textContent({ timeout: 8000 }).catch(() => ""))?.trim();
const cont = async (p) => { await p.getByText("Continue", { exact: true }).last().click(); await p.waitForTimeout(900); };
const REST = { dateOfBirth: "1990-04-12", cityOfResidence: "Dubai" };

// ---- Signed in ----
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${APP}/auth?mode=signin`, { waitUntil: "networkidle", timeout: 180000 }); await p.waitForTimeout(1500);
  await p.getByTestId("auth-email").first().fill("e2e-wizard@example.com"); await p.getByTestId("auth-password").first().fill("test-pass");
  await p.getByText("Sign in", { exact: true }).first().click(); await p.waitForTimeout(4000);
  await p.evaluate(() => { localStorage.removeItem("ezvisa.wizard.v1"); localStorage.removeItem("ezvisa.drafts.v2"); });
  await p.goto(`${APP}/apply`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  log((await title(p)) === "Where are you travelling?", "first question: destination", await title(p));
  await p.getByTestId("country-France").first().click(); await p.waitForTimeout(1200);
  log((await title(p)) === "What passport do you hold?", "then nationality", await title(p));
  await p.getByTestId("nationality-India").first().click(); await p.waitForTimeout(1200);
  log((await title(p)) === "What's your name?", "then name", await title(p));
  await p.getByTestId("question-input").fill("Aisha"); await p.getByTestId("question-input-2").fill("Khan"); await cont(p);
  log((await title(p)) === "Best number to reach you?", "signed in: contact asks the phone only", await title(p));
  log(await p.getByTestId("contact-email").count() === 0, "signed in: no email field");
  await p.locator("input").last().fill("501234567"); await p.waitForTimeout(400); await cont(p);
  log(/travelling/i.test(await title(p)), "then travelling with", await title(p));
  await p.getByTestId("choice-no").first().click(); await p.waitForTimeout(1500);
  const now = await p.evaluate(() => JSON.parse(localStorage.getItem("ezvisa.wizard.v1") || "{}").form || {});
  log(now.destination === "France" && now.nationality === "India" && now.firstName === "Aisha" && /501234567/.test(now.phone || ""), "answers saved on the phone", JSON.stringify({ d: now.destination, n: now.nationality }));
  // Date of birth and emirate (native wheels) go into the same draft, keeping its server id, then Review opens.
  await p.evaluate((rest) => { const d = JSON.parse(localStorage.getItem("ezvisa.wizard.v1")); d.form = { ...d.form, ...rest }; d.page = "review"; d.promptDismissed = true; localStorage.setItem("ezvisa.wizard.v1", JSON.stringify(d)); }, REST);
  await p.goto(`${APP}/apply?resume=1`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  log((await title(p)) === "That's everything for now.", "Review", await title(p));
  await p.screenshot({ path: `${OUT}/review.png` });
  await p.getByTestId("continue-to-payment").click(); await p.waitForTimeout(1500);
  log(await p.getByTestId("insurance").count() > 0, "signed in: Review → insurance (no account step)");
  await p.getByTestId("insurance-continue").click(); await p.waitForTimeout(1500);
  const due = (await p.getByTestId("due-now").textContent().catch(() => ""))?.trim();
  log(due === "249 AED", "price: 249 AED due now (contract price, one traveller)", due);
  log(await p.getByTestId("pay-now").count() > 0, "Pay securely button");
  log(errs.length === 0, "no page errors (signed in)", errs.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---- Guest ----
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${APP}/welcome`, { waitUntil: "networkidle", timeout: 180000 }); await p.waitForTimeout(2000);
  // A guest draft parked on Contact (guest mode lives in memory, so it is seeded before "Start my application").
  await p.evaluate(() => { const key = "e2e-g"; const f = { destination: "France", nationality: "India", firstName: "Omar", lastName: "Ali", countryOfResidence: "United Arab Emirates", phoneCountry: "AE", whatsappOptIn: true };
    localStorage.setItem("ezvisa.wizard.v1", JSON.stringify({ v: 1, key, form: f, page: "q:contact", savedAt: Date.now(), promptDismissed: true })); });
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await p.getByTestId("start-application").click(); await p.waitForTimeout(3000);
  log(await p.getByTestId("contact-email").count() > 0, "guest: contact asks the email (pay first, account after payment)", await title(p));
  await p.screenshot({ path: `${OUT}/guest-contact.png` });
  await p.goto(`${APP}/payment/7a21c9f0-0000-4000-8000-000000000001?preview=failure&email=omar%40example.com`, { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
  const mail = await p.getByTestId("guest-account").locator("input").first().inputValue().catch(() => "");
  log(mail === "omar@example.com", "guest: after a failed payment, Create your account with the same email", mail);
  await p.screenshot({ path: `${OUT}/guest-account.png` });
  log(errs.length === 0, "no page errors (guest)", errs.slice(0, 2).join(" | "));
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
