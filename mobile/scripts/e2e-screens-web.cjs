// Usage: start scripts/mock-supabase.mjs and the web build against it (EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo start --web --port 8081), then
//   node scripts/e2e-screens-web.cjs <screenshot dir>     (needs `playwright`; nothing here talks to the live database)
// Opens every route of the web build against the mock, signed in and signed out, in English light, English dark and
// Arabic. Fails on page errors, console errors, a blank screen or the error boundary.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const APP = "http://localhost:8081", DB = "http://localhost:54321", OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const EMAIL = "kirolos+ezvisa-app-test@example.com";
const SVC = { apikey: "mock-service-role", authorization: "Bearer mock-service-role", "content-type": "application/json" };
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const results = []; let fails = 0;
async function seed() {
  await fetch(`${DB}/__db/reset`, { method: "POST" });
  const at = new Date().toISOString(); const mk = async (status, pay, extra = {}, notes = {}) => {
    const id = crypto.randomUUID();
    const n = { source: "mobile-app", wizard: { firstName: "Sara", lastName: "Khan", nationality: "India", travelStartDate: inDays(40), travelEndDate: inDays(50), employmentStatus: "employed" }, uploads: [{ type: "passportCopy", path: `${id}/passportCopy_a1.png`, name: "passport.png", at }], ...notes };
    const r = await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: SVC, body: JSON.stringify({ id, email: EMAIL, full_name: "Sara Khan", phone: "+971501234567", destination_country: "France", nationality: "India", application_status: status, payment_status: pay, payment_amount: 249, travel_start_date: inDays(40), travel_end_date: inDays(50), additional_notes: JSON.stringify(n), has_passport: true, has_photos: false, has_bank_statements: false, has_employment_proof: false, ...extra }) });
    if (r.status !== 201) throw new Error("seed " + r.status); return id;
  };
  return { paid: await mk("reviewing", "paid"), unpaid: await mk("submitted", "pending"), approved: await mk("completed", "paid", { visa_decision: "approved" }), refused: await mk("rejected", "paid") };
}
const routes = (ids) => [
  "/", "/countries", "/country/france", "/destination/italy", "/applications", `/applications/${ids.paid}`, `/applications/${ids.unpaid}`, `/applications/${ids.approved}`, `/applications/${ids.refused}`,
  `/continue/${ids.paid}`, `/appointment/${ids.paid}`, `/trip/${ids.paid}`, `/receipt/${ids.paid}`, `/countdown/${ids.paid}`,
  `/payment/${ids.unpaid}?preview=checking`, `/payment/${ids.unpaid}?preview=slow`, `/payment/${ids.unpaid}?preview=stalled`, `/payment/${ids.paid}?preview=success`, `/payment/${ids.unpaid}?preview=failure`,
  "/account", "/account/details", "/account/settings", "/account/help", "/account/notifications", "/account/travellers", "/account/storage", "/apply",
];
const guestRoutes = ["/welcome", "/auth?mode=signin", "/auth?mode=signup", "/auth/forgot", "/auth/magic-link", "/countries", "/country/spain", "/account/help"];
async function visit(ctx, path, tag) {
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|DevTools|Failed to load resource|net::ERR|ws:\/\//i.test(m.text())) errs.push("console: " + m.text().slice(0, 160)); });
  try { await p.goto(APP + path, { waitUntil: "networkidle", timeout: 60000 }); } catch (e) { errs.push("goto: " + e.message.slice(0, 100)); }
  await p.waitForTimeout(2500);
  const text = (await p.evaluate(() => document.body.innerText).catch(() => "")).trim();
  if (text.length < 15) errs.push("blank screen");
  if (/Something went wrong|Unexpected error|Render Error/i.test(text)) errs.push("error screen: " + text.slice(0, 80));
  const name = `${tag}-${path.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)}`;
  await p.screenshot({ path: `${OUT}/${name}.png` });
  const ok = errs.length === 0; if (!ok) fails++;
  results.push({ tag, path, ok, errs, first: text.split("\n").slice(0, 2).join(" / ").slice(0, 70) });
  console.log(`${ok ? "PASS" : "FAIL"}  [${tag}] ${path}${ok ? "  · " + text.split("\n")[0].slice(0, 50) : "\n      " + errs.join("\n      ")}`);
  await p.close();
}
(async () => {
  const ids = await seed(); const b = await chromium.launch();
  for (const [tag, lang, look] of [["en", "en", "light"], ["dark", "en", "dark"], ["ar", "ar", "light"]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: look });
    await ctx.addInitScript(([lang, look]) => { localStorage.setItem("ezvisa.welcomed.v1", "1"); localStorage.setItem("ezvisa.lang.v1", lang); localStorage.setItem("ezvisa.lang.v1.dirfix", String(Date.now())); localStorage.setItem("ezvisa.appearance.v1", look); }, [lang, look]);
    // sign in once per context
    const p = await ctx.newPage(); await p.goto(`${APP}/auth?mode=signin`, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.getByTestId("auth-email").fill(EMAIL); await p.getByTestId("auth-password").fill("test-pass"); await p.keyboard.press("Enter"); await p.waitForTimeout(3000); await p.close();
    for (const r of routes(ids)) await visit(ctx, r, tag);
    await ctx.close();
    const g = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: look });
    await g.addInitScript(([lang, look]) => { localStorage.setItem("ezvisa.welcomed.v1", "1"); localStorage.setItem("ezvisa.lang.v1", lang); localStorage.setItem("ezvisa.lang.v1.dirfix", String(Date.now())); localStorage.setItem("ezvisa.appearance.v1", look); }, [lang, look]);
    for (const r of guestRoutes) await visit(g, r, `${tag}-out`);
    await g.close();
  }
  await b.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  console.log(`\n${results.length - fails}/${results.length} screens opened cleanly`); process.exit(fails ? 1 : 0);
})();
