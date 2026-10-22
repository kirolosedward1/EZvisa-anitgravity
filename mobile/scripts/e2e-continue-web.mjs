// End-to-end check of the before/after payment split on the app's web build against scripts/mock-supabase.mjs.
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --platform web --output-dir /tmp/web-dist
//   STATIC_DIR=/tmp/web-dist node scripts/mock-supabase.mjs &
//   node scripts/e2e-continue-web.mjs [screenshot dir]     (needs `playwright`; PLAYWRIGHT=<path to playwright/index.mjs> if not installed here)
// Covers: signed-in wizard asks only the pre-payment questions (phone without email), submit, then Continue application
// asks the rest one per screen and saves them to the same row; a website row asks only passport number + employment and
// keeps its name/phone. Nothing here talks to the live database.
import fs from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");

const APP = process.env.APP_URL || "http://localhost:8081";
const DB = process.env.MOCK_URL || "http://localhost:54321";
const OUT = process.argv[2] || "/tmp/e2e-continue";
fs.mkdirSync(OUT, { recursive: true });
const EMAIL = "kirolos+ezvisa-app-test@example.com";
let failures = 0;
const log = (ok, step, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${step}${info ? "  · " + info : ""}`); if (!ok) failures++; };
const db = async () => (await fetch(`${DB}/__db`)).json();
const notes = (r) => JSON.parse(r?.additional_notes || "{}");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(150); } return null; }
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

await fetch(`${DB}/__db/reset`, { method: "POST" });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: Number(process.env.WIDTH || 390), height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
const title = async () => (await page.getByTestId("question-title").first().textContent({ timeout: 6000 }).catch(() => null))?.trim() ?? null;
const shot = (f) => page.screenshot({ path: `${OUT}/${f}.png` });
const pick = async (name) => { await page.getByRole("radio", { name, exact: true }).first().click(); await page.waitForTimeout(800); };
const cont = async () => { await page.getByRole("button", { name: "Continue", exact: true }).last().click(); await page.waitForTimeout(700); };
const date = async (v) => { await page.locator('input[type="date"]').first().fill(v); await page.waitForTimeout(300); await cont(); };

// ---- sign in ----
await page.goto(`${APP}/auth`); await page.getByPlaceholder("Email").fill(EMAIL); await page.getByPlaceholder("Password").fill("test-pass");
await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForTimeout(1800);

// ---- before payment ----
await page.goto(`${APP}/apply`); await page.waitForTimeout(2500);
log((await title())?.startsWith("Destination"), "wizard opens on Destination", await title());
await pick("France"); await pick("India");
log((await title()) === "City of Residence", "residence has no screen: Nationality -> City", await title());
await pick("Dubai");
log((await title()) === "Your Name", "first + last name on one screen", await title());
await page.getByTestId("question-input").fill("Aisha"); await page.getByTestId("question-input-2").fill("Khan"); await cont();
log((await title()) === "Phone Number", "signed in: contact screen asks only the phone", await title());
log(!(await page.locator('input[type="email"], input[autocomplete="email"]').count()), "signed in: no email field");
await shot("01-contact-signed-in");
await page.locator("input").last().fill("501234567"); await page.waitForTimeout(400); await cont();
log((await title()) === "Marital Status", "then Marital Status", await title());
await pick("Single"); await page.waitForTimeout(800);
const reviewIds = await page.locator('[data-testid^="review-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
log(JSON.stringify(reviewIds.filter((x) => !["review-gaps", "review-total"].includes(x))) === JSON.stringify(["review-destination", "review-nationality", "review-cityOfResidence", "review-name", "review-contact", "review-maritalStatus"]), "Review lists only the 6 pre-payment answers", reviewIds.join(","));
await shot("02-review");
await page.getByRole("button", { name: "Submit application" }).click();
const sub = await until(async () => (await db()).find((r) => r.application_status === "submitted"));
log(!!sub && sub.email === EMAIL && sub.full_name === "Aisha Khan" && notes(sub).wizard?.phone?.includes("501234567"), "submitted row has account email, name and phone", sub ? `${sub.email} · ${sub.full_name}` : "none");
log(!!sub && !sub.entry_date && !sub.date_of_birth && !sub.passport_number, "nothing from after payment was required to submit");

// ---- pay (the webhook's job; done on the mock) ----
await fetch(`${DB}/__db/edit`, { method: "POST", body: JSON.stringify({ id: sub.id, patch: { payment_status: "paid" } }) });

// ---- after payment: Continue application ----
await page.goto(`${APP}/continue/${sub.id}`); await page.waitForTimeout(2500);
log((await title()) === "Purpose of Trip", "Continue starts at Purpose of Trip", await title());
await shot("03-continue-first");
// Each trip question in order: [expected title (prefix), answer].
const trip = [
  ["Purpose of Trip", () => pick("Tourism")], ["Intended Departure Date", () => date(inDays(30))], ["Intended Return Date", () => date(inDays(40))],
  ["Are your travel dates flexible", () => pick("No")], ["Who are you traveling with", () => pick("Traveling Alone")],
  ["Accommodation Preferences", () => pick("3-Star Hotel / Mid-range")], ["Funding Source", () => pick("Self-funded (Personal savings)")],
  ["Approx. Bank Balance Range", () => pick("10,000 - 25,000 AED")], ["Is this your first Schengen Visa", () => pick("Yes")],
  ["Have you ever had a visa refusal", () => pick("No")], ["Will you be visiting other Schengen countries", () => pick("No")],
];
const seen = [];
for (const [want, answer] of trip) { const t = await title(); seen.push(t); if (!t?.startsWith(want)) { log(false, `trip question "${want}"`, `got "${t}"`); break; } await answer(); }
log(seen.length === trip.length, "every trip question asked in order, incl. the optional other-countries one", seen.join(" > "));
log((await title())?.startsWith("Is your UAE residence visa valid"), "residence visa question replaces Emirates ID", await title());
const mid = (await db()).find((r) => r.id === sub.id);
log(notes(mid).wizard?.purposeOfTrip === "tourism" && notes(mid).wizard?.hotelCategory === "3-star", "answers are saved to the row while going", `${notes(mid).wizard?.purposeOfTrip}/${notes(mid).wizard?.hotelCategory}`);
await pick("Yes");
await date("1992-02-02");
await pick("Yes"); // valid passport
log((await title()) === "Passport Number", "passport number after the validity answer", await title());
await page.getByTestId("question-input").fill("n1234567"); await cont();
await date(inDays(2000));
log((await title()) === "Employment Status", "then employment", await title());
await shot("04-continue-employment");
await pick("Student");
await page.waitForURL(/\/applications\//, { timeout: 8000 }).catch(() => {});
log(/\/applications\//.test(page.url()), "last answer returns to the application", page.url());
const done = (await db()).find((r) => r.id === sub.id);
const n = notes(done);
log(done.entry_date === inDays(30) && done.exit_date === inDays(40) && done.travel_purpose === "tourism", "trip columns written", `${done.entry_date}..${done.exit_date}`);
log(done.passport_number === "N1234567" && done.date_of_birth === "1992-02-02", "passport number (upper case) and date of birth columns written", `${done.passport_number} ${done.date_of_birth}`);
log(done.full_name === "Aisha Khan" && done.email === EMAIL && n.source === "mobile-app" && n.wizard?.firstName === "Aisha", "pre-payment data untouched");
log(n.employmentStatus === "student" && n.wizard?.residenceVisaValid === "yes" && n.wizard?.travelingWith === "alone", "after-payment answers in the notes");
log(!errors.length, "no page errors", errors.join(" | "));

// ---- married, spouse travels: "Who are you traveling with?" is shown (With Spouse preselected), not skipped ----
const mins = await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: { apikey: "mock-service-role", Authorization: "Bearer mock-service-role", "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ email: EMAIL, full_name: "Aisha Khan", phone: "+971501234567", nationality: "India", destination_country: "France", payment_status: "paid", application_status: "submitted", previous_rejections: false,
    additional_notes: JSON.stringify({ source: "mobile-app", maritalStatus: "married", spouseAccompanying: "yes", wizard: { destination: "France", nationality: "India", firstName: "Aisha", lastName: "Khan", maritalStatus: "married", spouseAccompanying: "yes" } }) }) });
const mar = (await mins.json())[0];
await page.goto(`${APP}/continue/${mar.id}`); await page.waitForTimeout(2500);
await pick("Tourism"); await date(inDays(30)); await date(inDays(40)); await pick("No");
log((await title()) === "Who are you traveling with?", "spouse travels: companions question is still asked", await title());
log((await page.getByRole("radio", { name: "With Spouse", exact: true }).first().getAttribute("aria-checked")) === "true", "With Spouse is preselected");
await pick("With Family");
log((await title()) === "Accommodation Preferences", "a different choice is accepted and the flow moves on", await title());
const marRow = await until(async () => (await db()).find((r) => r.id === mar.id && notes(r).wizard?.travelingWith));
log(notes(marRow).wizard?.travelingWith === "family", "the customer's choice is saved, not the preset", notes(marRow).wizard?.travelingWith);

// ---- website row: only passport (valid? + number) + employment, nothing else changes ----
const ins = await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: { apikey: "mock-service-role", Authorization: "Bearer mock-service-role", "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ email: EMAIL, full_name: "Omar Saleh", phone: "+971501112233", nationality: "Egypt", destination_country: "Italy", entry_date: "2026-12-01", exit_date: "2026-12-10", payment_status: "paid", application_status: "submitted", additional_notes: JSON.stringify({ maritalStatus: "single" }) }) });
const web = (await ins.json())[0];
await page.goto(`${APP}/continue/${web.id}`); await page.waitForTimeout(2500);
log((await title()) === "Do you have a valid passport?", "website row with no number starts at the passport question (no redirect loop)", await title());
await pick("Yes");
log((await title()) === "Passport Number", "website row: then Passport Number", await title());
await page.getByTestId("question-input").fill("b7654321"); await cont();
log((await title()) === "Employment Status", "website row: then employment, nothing else", await title());
await pick("Retired");
await page.waitForURL(/\/applications\//, { timeout: 8000 }).catch(() => {});
const w2 = (await db()).find((r) => r.id === web.id);
log(w2.full_name === "Omar Saleh" && w2.phone === "+971501112233" && w2.destination_country === "Italy" && w2.entry_date === "2026-12-01", "website row keeps name, phone, destination and dates");
log(w2.passport_number === "B7654321" && notes(w2).source === undefined && notes(w2).employmentStatus === "retired", "website row: number + employment saved, still a website row");

// ---- guest (signed out): the contact screen asks email + phone ----
const gctx = await browser.newContext({ viewport: { width: Number(process.env.WIDTH || 390), height: 844 }, deviceScaleFactor: 2 });
const gp = await gctx.newPage();
await gp.goto(`${APP}/`); await gp.waitForTimeout(2500);
await gp.getByText("Continue without an account").first().click().catch(() => {}); await gp.waitForTimeout(1500);
if (!/\/apply/.test(gp.url())) { await gp.getByRole("button", { name: /Start|New application/i }).first().click().catch(() => {}); await gp.waitForTimeout(1500); }
const gt = async () => (await gp.getByTestId("question-title").first().textContent({ timeout: 6000 }).catch(() => null))?.trim() ?? null;
const gpick = async (name) => { await gp.getByRole("radio", { name, exact: true }).first().click(); await gp.waitForTimeout(800); };
log((await gt())?.startsWith("Destination"), "guest: wizard opens on Destination", `${gp.url()} · ${await gt()}`);
await gpick("France"); await gpick("India"); await gpick("Dubai");
await gp.getByTestId("question-input").fill("Sam"); await gp.getByTestId("question-input-2").fill("Lee");
await gp.getByRole("button", { name: "Continue", exact: true }).last().click(); await gp.waitForTimeout(700);
log((await gt()) === "Email & Phone Number" && (await gp.locator('input[type="email"], input[autocomplete="email"]').count()) > 0, "guest: contact screen asks email + phone", await gt());
await gp.screenshot({ path: `${OUT}/05-contact-guest.png` });

await browser.close();
console.log(failures ? `${failures} FAILED` : "ALL PASS");
process.exit(failures ? 1 : 0);
