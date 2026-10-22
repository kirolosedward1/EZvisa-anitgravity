// Prefill + profile-confirm + account-switch check in the real app UI (Expo web), two accounts on one "device"
// (one browser profile). Supabase is mocked at the network layer, so no real data is read or written.
// Run: start `npx expo start --web` with EXPO_PUBLIC_SUPABASE_URL=https://dravvaykssrbktztmrlj.supabase.co and any
// EXPO_PUBLIC_SUPABASE_ANON_KEY, then: PW=<playwright-core path> node scripts/e2e-prefill-web.mjs [outDir]
import fs from "fs";
const { chromium } = await import(process.env.PW || "playwright-core");
const BASE = process.env.BASE || "http://localhost:8081";
const SB = "https://dravvaykssrbktztmrlj.supabase.co";
const OUT = process.argv[2] || "/tmp/prefill-shots"; fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, l) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function world() {
  const users = {
    "a+ezvisa-app-test@example.com": { id: "11111111-1111-4111-8111-111111111111", email: "a+ezvisa-app-test@example.com", user_metadata: { full_name: "Amira Hassan", phone: "+20 100 123 4567" } },
    "b+ezvisa-app-test@example.com": { id: "22222222-2222-4222-8222-222222222222", email: "b+ezvisa-app-test@example.com", user_metadata: {} },
  };
  const rows = [{ id: "aaaaaaaa-0000-4000-8000-000000000001", email: "a+ezvisa-app-test@example.com", application_status: "submitted", payment_status: "paid", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z",
    full_name: "Amira Hassan", phone: "+20 100 123 4567", nationality: "Egypt", destination_country: "Italy", date_of_birth: "1991-04-02", passport_number: "A1234567",
    additional_notes: JSON.stringify({ source: "mobile-app", wizard: { firstName: "Amira", lastName: "Hassan", nationality: "Egypt", dateOfBirth: "1991-04-02", passportNumber: "A1234567", passportExpiry: "2025-01-31", phoneCountry: "EG", cityOfResidence: "Dubai", maritalStatus: "single" } }) }];
  return { users, rows, tokens: {}, log: [] };
}
const tokenFor = (w, u) => { const t = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`; w.tokens[t] = u.email; return t; };
const userOf = (w, req) => { const t = (req.headers()["authorization"] || "").replace(/^Bearer /, ""); const e = w.tokens[t]; return e ? w.users[e] : null; };
const userJson = (u) => ({ ...u, aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, created_at: "2026-01-01T00:00:00Z" });

async function mock(ctx, w) {
  await ctx.route((url) => !url.href.startsWith(BASE) && !url.href.startsWith("data:") && !url.href.startsWith("blob:"), async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (!url.href.startsWith(SB)) return route.fulfill({ status: 404, body: "" });
    const p = url.pathname; const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    w.log.push({ method: req.method(), path: p, search: url.search, as: userOf(w, req)?.email ?? null, body: req.postData() });
    if (p === "/auth/v1/settings") return json(200, { external: { email: true, google: false, apple: false } });
    if (p === "/auth/v1/token") {
      const { email } = JSON.parse(req.postData() || "{}"); const u = w.users[email];
      if (!u) return json(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return json(200, { access_token: tokenFor(w, u), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r-" + u.id, user: userJson(u) });
    }
    if (p === "/auth/v1/user") {
      const u = userOf(w, req); if (!u) return json(401, { msg: "no session" });
      if (req.method() === "PUT") { const { data } = JSON.parse(req.postData() || "{}"); u.user_metadata = { ...u.user_metadata, ...(data || {}) }; }
      return json(200, userJson(u));
    }
    if (p === "/auth/v1/logout") return route.fulfill({ status: 204, body: "" });
    if (p === "/rest/v1/visa_applications") {
      if (!userOf(w, req)) return json(401, { message: "JWT required" });
      const eqs = [...url.searchParams].filter(([, v]) => v.startsWith("eq.")).map(([k, v]) => [k, v.slice(3)]);
      let rows = w.rows.filter((r) => eqs.every(([k, v]) => String(r[k]) === v));
      if (req.method() === "GET") {
        const [col, dir] = (url.searchParams.get("order") || "created_at.desc").split(".");
        rows = [...rows].sort((a, b) => (dir === "asc" ? 1 : -1) * String(a[col]).localeCompare(String(b[col])));
        const lim = Number(url.searchParams.get("limit") || 0); if (lim) rows = rows.slice(0, lim);
        const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
        return single ? (rows[0] ? json(200, rows[0]) : json(406, { code: "PGRST116" })) : json(200, rows);
      }
      if (req.method() === "POST") { const b = JSON.parse(req.postData()); const r = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(Array.isArray(b) ? b[0] : b) }; w.rows.push(r); return json(201, (req.headers()["accept"] || "").includes("vnd.pgrst.object") ? r : [r]); }
      if (req.method() === "PATCH") { // like PostgREST: the body's own updated_at is kept; rows come back when select= is asked
        const b = JSON.parse(req.postData()); rows.forEach((r) => Object.assign(r, { updated_at: new Date().toISOString() }, b));
        return url.searchParams.has("select") ? json(200, rows) : route.fulfill({ status: 204, body: "" });
      }
    }
    return json(404, {});
  });
}

const title = (page) => page.getByTestId("question-title").first().innerText().catch(() => "");
async function signIn(page, email) {
  await page.goto(`${BASE}/auth?mode=signin`); await page.getByPlaceholder("Email").fill(email); await page.getByPlaceholder("Password").fill("test-password-1");
  await page.getByText("Sign in", { exact: true }).last().click(); await page.waitForTimeout(1500);
}
async function cont(page) { await page.getByText("Continue", { exact: true }).last().click(); await page.waitForTimeout(500); }
/** Walks the personal questions until `stop`, screenshotting the ones in `shots`; `act` can edit an answer. */
async function walk(page, w, stop, shots, act = {}) {
  const seen = {};
  for (let i = 0; i < 25; i++) {
    const tt = await title(page); if (!tt) { await page.waitForTimeout(400); continue; }
    if (seen[tt]) { await page.waitForTimeout(400); } seen[tt] = true;
    const chip = await page.getByTestId("from-profile").count();
    if (shots[tt]) await page.screenshot({ path: `${OUT}/${shots[tt]}-${w}.png` });
    if (act[tt]) await act[tt](chip);
    if (tt === stop) return seen;
    if (tt === "Nationality" && !(await page.locator('[aria-checked="true"]').count())) { await page.getByText("India", { exact: true }).first().click(); await page.waitForTimeout(700); continue; }
    if (tt === "City of Residence" && !(await page.locator('[aria-checked="true"]').count())) { await page.getByText("Dubai", { exact: true }).click(); await page.waitForTimeout(700); continue; }
    if (tt === "Do you have an Emirates ID?") { await page.getByText("Yes", { exact: true }).first().click(); await page.waitForTimeout(700); continue; }
    if (tt === "Do you have a valid passport?" && !(await page.locator('[aria-checked="true"]').count())) { await page.getByText("Yes", { exact: true }).first().click(); await page.waitForTimeout(700); continue; }
    await cont(page);
  }
  return seen;
}
const localData = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));

for (const width of [390, 430]) {
  console.log(`\n== ${width} px ==`);
  const w = world();
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => localStorage.setItem("ezvisa.welcomed.v1", "1"));
  await mock(ctx, w); const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror:", e.message));

  // ---- Account A (returning user) ----
  await signIn(page, "a+ezvisa-app-test@example.com");
  await page.goto(`${BASE}/apply?to=France`); await page.waitForTimeout(2500);
  const vals = {};
  await walk(page, width, "Passport Expiry Date",
    { "Nationality": "01-nationality-prefilled", "First Name": "02-first-name-prefilled", "Phone Number": "03-phone-prefilled", "Date of Birth": "04-dob-prefilled", "Passport Number": "05-passport-prefilled", "Passport Expiry Date": "06-passport-expired-flagged" },
    {
      "First Name": async (chip) => { vals.first = await page.getByTestId("question-input").inputValue(); vals.firstChip = chip; },
      "Phone Number": async (chip) => { vals.phone = await page.getByLabel("Phone number").inputValue(); vals.phoneChip = chip; await page.getByLabel("Phone number").fill("100 999 0000"); },
      "Passport Number": async (chip) => { vals.pass = await page.getByTestId("question-input").inputValue(); },
      "Passport Expiry Date": async () => { await page.waitForTimeout(900); vals.expErr = await page.getByTestId("question-error").innerText().catch(() => ""); },
    });
  ok(vals.first === "Amira" && vals.firstChip > 0, `A: first name prefilled with "From your profile" (${vals.first})`);
  ok(vals.phone === "100 123 4567" && vals.phoneChip > 0, `A: phone prefilled (${vals.phone})`);
  ok(vals.pass === "A1234567", `A: passport number prefilled (${vals.pass})`);
  ok(/expired/i.test(vals.expErr), `A: expired passport is prefilled and flagged ("${vals.expErr}")`);
  await page.screenshot({ path: `${OUT}/06-passport-expired-flagged-${width}.png` });
  ok(!w.log.some((l) => l.method === "PUT" && l.path === "/auth/v1/user"), "A: profile not touched before confirmation");

  await page.goto(`${BASE}/apply?step=payment`); await page.getByTestId("profile-ask").waitFor({ timeout: 8000 }).catch(() => {});
  const ask = await page.getByTestId("profile-ask").innerText().catch(() => "");
  ok(/Phone Number/.test(ask) && /100 999 0000/.test(ask) && !/First Name|Passport/.test(ask), "A: review asks once, listing only the edited profile field");
  await page.screenshot({ path: `${OUT}/07-review-confirm-prompt-${width}.png` });
  await page.getByTestId("profile-ask").scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/07b-review-confirm-prompt-card-${width}.png` });
  ok(!w.log.some((l) => l.method === "PUT" && l.path === "/auth/v1/user"), "A: still no profile write while the prompt is open");
  await page.getByText("Update profile", { exact: true }).click(); await page.waitForTimeout(1200);
  const put = w.log.filter((l) => l.method === "PUT" && l.path === "/auth/v1/user");
  const data = put[0] ? JSON.parse(put[0].body).data : {};
  ok(put.length === 1 && put[0].as === "a+ezvisa-app-test@example.com" && data.phone === "+20 100 999 0000" && Object.keys(data).sort().join() === "phone,phone_country", `A: one confirmed write, own account, phone only (${JSON.stringify(data)})`);
  await page.screenshot({ path: `${OUT}/08-profile-updated-${width}.png` });
  await page.reload(); await page.waitForTimeout(2500);
  ok(!(await page.getByTestId("profile-ask").count()), "A: not asked again after answering");

  // ---- Sign out: nothing of A stays on the device ----
  await page.goto(`${BASE}/account`); await page.waitForTimeout(1500);
  await page.getByText("Sign out", { exact: true }).click(); await page.waitForTimeout(2000);
  const after = JSON.stringify(await localData(page));
  ok(!/Amira|Hassan|A1234567|100 999|100 123|1991-04-02/.test(after), "after sign-out: no A data left in device storage");
  ok(!after.includes("ezvisa.prefill.v1") && !after.includes("ezvisa.owner.v1"), "after sign-out: prefill flags and owner marker cleared");

  // ---- Account B (new user) on the same device ----
  const mark = w.log.length;
  await signIn(page, "b+ezvisa-app-test@example.com");
  await page.goto(`${BASE}/apply?to=Italy`); await page.waitForTimeout(2500);
  const seenB = {}; await walk(page, width, "First Name", { "Nationality": "09-new-user-nationality-empty", "First Name": "10-new-user-first-name-empty" }, { "First Name": async (chip) => { seenB.first = await page.getByTestId("question-input").inputValue(); seenB.chip = chip; } });
  ok(seenB.first === "" && seenB.chip === 0, `B (new user): empty fields, no profile chip (first name "${seenB.first}")`);
  const html = await page.content(); const store = JSON.stringify(await localData(page));
  ok(!/Amira|Hassan|A1234567/.test(html + store), "B: no trace of A on screen or in storage");
  const bReads = w.log.slice(mark).filter((l) => l.path === "/rest/v1/visa_applications");
  // Reads/updates must filter by B's email; inserts (chat 06 creates the draft row early) must write B's email.
  const mine = (l) => l.as === "b+ezvisa-app-test@example.com" && (l.method === "POST" ? JSON.parse(l.body || "{}").email === "b+ezvisa-app-test@example.com" : decodeURIComponent(l.search).includes("email=eq.b+ezvisa-app-test@example.com"));
  for (const l of bReads) if (!mine(l)) console.log("   not B's own:", l.method, l.as, decodeURIComponent(l.search).slice(0, 160));
  ok(bReads.length > 0 && bReads.every(mine), `B: all ${bReads.length} application requests are B's own (reads filtered by B's email, inserts write B's email)`);

  // ---- A again: a new draft is prefilled from the updated profile ----
  await page.goto(`${BASE}/account`); await page.waitForTimeout(1200); await page.getByText("Sign out", { exact: true }).click(); await page.waitForTimeout(1500);
  await signIn(page, "a+ezvisa-app-test@example.com"); await page.goto(`${BASE}/apply?to=Spain`); await page.waitForTimeout(2500);
  const again = {}; await walk(page, width, "Phone Number", {}, { "Phone Number": async () => { again.phone = await page.getByLabel("Phone number").inputValue(); } });
  ok(again.phone === "100 999 0000", `A again: new draft uses the confirmed profile phone (${again.phone})`);
  await browser.close();
}
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
