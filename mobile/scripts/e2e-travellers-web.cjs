// Saved travellers in the wizard, opened the way a country page opens it (/apply?to=France): the first
// screen is "Who is travelling?" and picking someone fills their details. Needs the mock (scripts/mock-supabase.mjs)
// and the web build against it on :8081. Run: node scripts/e2e-travellers-web.cjs
const { chromium } = require("playwright");
const APP = "http://localhost:8081", DB = "http://localhost:54321", EMAIL = "kirolos+ezvisa-app-test@example.com";
const SVC = { apikey: "mock-service-role", authorization: "Bearer mock-service-role", "content-type": "application/json", prefer: "return=representation" };
(async () => {
  await fetch(`${DB}/__db/reset`, { method: "POST" }); const now = new Date().toISOString();
  await fetch(`${DB}/rest/v1/travellers`, { method: "POST", headers: SVC, body: JSON.stringify({ id: "t1", email: EMAIL, relationship: "self", first_name: "Sara", last_name: "Khan", nationality: "India", date_of_birth: "1990-02-03", passport_number: "N1234567", passport_expiry: "2031-01-01", phone: "+971501234567", phone_country: "AE", city_of_residence: "Dubai", dedupe_key: "p:N1234567", source: "app", last_used_at: now, created_at: now, updated_at: now }) });
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); localStorage.setItem("ezvisa.lang.v1", "en"); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/WebSocket|ERR_TUNNEL|Failed to load/.test(m.text())) console.log("CONSOLE:", m.text().slice(0, 400)); });
  await p.goto(`${APP}/auth?mode=signin`, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await p.getByTestId("auth-email").fill(EMAIL); await p.getByTestId("auth-password").fill("test-pass"); await p.keyboard.press("Enter"); await p.waitForTimeout(3500);
  // Same as the country page's "Start application": /apply?to=France
  await p.goto(`${APP}/apply?to=France`, { waitUntil: "networkidle" }); await p.waitForTimeout(5000);
  const h = await p.getByRole("heading").first().innerText(); console.log(/Who is travelling/.test(h) ? `PASS  opens on: ${h}` : `FAIL  opens on: ${h}`);
  await p.getByText("Sara Khan").first().click(); await p.waitForTimeout(2500);
  const next = await p.getByRole("heading").first().innerText(); console.log(`after picking Sara: ${next}`);
  const f = await p.evaluate(() => JSON.parse(localStorage.getItem("ezvisa.wizard.v1") || "{}").form || {});
  console.log("filled:", ["firstName", "lastName", "nationality", "dateOfBirth", "phoneLocal", "cityOfResidence"].map((k) => `${k}=${f[k] ? "yes" : "no"}`).join(" "));
  console.log(errs.length ? errs : "no page errors"); await b.close(); })();
