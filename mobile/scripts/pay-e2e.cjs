// Payment flow checks on the Expo web export (react-native-web) with www.ezvisa.net/api and Supabase mocked.
// Build: EXPO_PUBLIC_SUPABASE_URL=https://fake.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-test npx expo export --platform web --output-dir /tmp/web-dist
// Run:   NODE_PATH=$(npm root -g) node scripts/pay-e2e.cjs /tmp/web-dist docs/screenshots/chat08
const http = require("http"); const fs = require("fs"); const path = require("path");
const { chromium } = require("playwright");
const DIST = process.argv[2], SHOTS = process.argv[3]; fs.mkdirSync(SHOTS, { recursive: true });
const APP = "11111111-2222-4333-8444-555555555555";
const EMAIL = "kiro+ezvisa-app-test@gmail.com";

const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, "index.html");
  const ext = path.extname(p); res.setHeader("content-type", { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".json": "application/json" }[ext] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
});

const row = (o = {}) => ({ id: APP, email: EMAIL, full_name: "Test User", phone: "+971500000000", nationality: "India", destination_country: "France", date_of_birth: "1990-01-01", entry_date: "2026-12-10", exit_date: "2026-12-20", travel_purpose: "tourism", passport_number: "X1234567", duration_days: 10, has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false, payment_status: "pending", application_status: "submitted", payment_id: "pi_1", payment_amount: null, additional_notes: JSON.stringify({ source: "mobile-app", wizard: { firstName: "Test", lastName: "User", employmentStatus: "employed", jobTitle: "Engineer", companyName: "ACME", monthlySalary: "10000-15000" } }), created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-22T10:00:00Z", ...o });

/** One page per scenario. m = mock state the routes read (mutable during the test). */
async function open(browser, { vw = 390, dark = false, lang = "en", signedIn = false, stored = null, m }) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vw === 390 ? 844 : 932 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", isMobile: true, hasTouch: true });
  const calls = { create: 0, checkApp: 0, checkId: 0, rest: 0 };
  await ctx.addInitScript(({ signedIn, stored, lang, EMAIL }) => {
    localStorage.setItem("ezvisa.welcomed.v1", "1"); localStorage.setItem("ezvisa.lang.v1", lang);
    if (signedIn) localStorage.setItem("sb-fake-auth-token", JSON.stringify({ access_token: "at", refresh_token: "rt", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "u1", email: EMAIL, aud: "authenticated", role: "authenticated", user_metadata: { full_name: "Test User" }, app_metadata: {} } }));
    if (stored) localStorage.setItem("ezvisa.payments.v1", JSON.stringify(stored));
  }, { signedIn, stored, lang, EMAIL });
  const net = { off: false };
  const origSetOffline = ctx.setOffline.bind(ctx); ctx.setOffline = async (v) => { net.off = v; return origSetOffline(v); };
  await ctx.route("https://www.ezvisa.net/api/**", async (r) => {
    if (net.off) return r.abort("internetdisconnected"); // mocked routes still answer offline in Playwright; a device can't
    const u = new URL(r.request().url());
    if (u.pathname === "/api/create-payment") { calls.create++; m.lastCreateBody = r.request().postDataJSON(); await new Promise((x) => setTimeout(x, 300)); return r.fulfill({ json: { id: `pi_new${calls.create}`, redirect_url: `https://www.ezvisa.net/__checkout?pi=pi_new${calls.create}`, amount: 24900, currency_code: "AED", status: "requires_payment_instrument" } }); }
    if (u.pathname === "/api/check-payment" && u.searchParams.get("applicationId")) { calls.checkApp++; const s = typeof m.server === "function" ? m.server(calls) : m.server; return s ? r.fulfill({ json: s }) : r.fulfill({ status: 400, json: { error: "Payment intent ID is required" } }); } // today's production behaviour
    if (u.pathname === "/api/check-payment") { calls.checkId++; const id = u.searchParams.get("id"); const s = typeof m.intents === "function" ? m.intents(id, calls) : (m.intents ?? {})[id]; return s ? r.fulfill({ json: { id, status: s } }) : r.fulfill({ status: 404, json: { error: "not found" } }); }
    return r.fulfill({ status: 404, json: {} });
  });
  await ctx.route("https://www.ezvisa.net/__checkout**", (r) => r.fulfill({ contentType: "text/html", body: "<h1>Ziina checkout (mock)</h1>" }));
  await ctx.route("https://fake.supabase.co/**", async (r) => {
    if (net.off) return r.abort("internetdisconnected");
    const u = new URL(r.request().url()); calls.rest++;
    if (u.pathname === "/auth/v1/user") return signedIn ? r.fulfill({ json: { id: "u1", email: EMAIL, aud: "authenticated", role: "authenticated", user_metadata: { full_name: "Test User" }, app_metadata: {} } }) : r.fulfill({ status: 401, json: {} });
    if (u.pathname.startsWith("/auth/v1/settings")) return r.fulfill({ json: { external: { google: false, apple: false } } });
    if (u.pathname === "/rest/v1/visa_applications") {
      const one = (r.request().headers()["accept"] || "").includes("vnd.pgrst.object");
      const x = typeof m.db === "function" ? m.db(calls) : m.db; const rr = row(x);
      return one ? r.fulfill({ json: rr }) : r.fulfill({ json: [rr] });
    }
    return r.fulfill({ json: [] });
  });
  const page = await ctx.newPage(); page.calls = calls; page.ctx = ctx;
  page.on("pageerror", (e) => console.log("    pageerror:", e.message.slice(0, 160)));
  return page;
}
const stateText = (page) => page.getByTestId("payment-state").innerText().catch(() => "");
async function waitState(page, want, ms = 45000) {
  const end = Date.now() + ms; let s = "";
  while (Date.now() < end) { s = await stateText(page); if (want.includes(s)) return s; await page.waitForTimeout(250); }
  return s;
}
const results = []; const log = (ok, name, info = "") => { results.push({ ok, name, info }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`); };
const base = () => `http://localhost:${server.address().port}`;
const sp = (id) => ({ appId: APP, paymentId: id, redirectUrl: `https://www.ezvisa.net/__checkout?pi=${id}`, back: "x", amount: 249, currency: "AED", at: Date.now() });

(async () => {
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const scenarios = {
    // URL forgery: the old screen trusted ?pid=; the deep link and route params are now ignored for success.
    forgedPid: { opts: { m: { intents: { pi_someone_elses_paid: "completed" } } }, url: `/payment/${APP}?returned=success&pid=pi_someone_elses_paid`, want: ["Payment not confirmed yet"] },
    forgedDeepLink: { opts: { m: { intents: { pi_x: "completed" } } }, url: `/payment-return?appId=${APP}&r=success&pid=pi_x&status=paid`, want: ["Payment not confirmed yet"] },
    paidDb: { opts: { signedIn: true, m: { db: { payment_status: "paid", payment_amount: 249 } } }, url: `/payment/${APP}?returned=success`, want: ["Payment received"], shot: "paid" },
    webhookDelay: { opts: { signedIn: true, stored: { [APP]: sp("pi_1") }, m: { intents: (id, c) => (c.checkId >= 2 ? "completed" : "pending"), db: (c) => (c.checkId >= 5 ? { payment_status: "paid", payment_amount: 249 } : {}) } }, url: `/payment/${APP}?returned=success`, want: ["Payment received"] },
    confirming: { opts: { signedIn: true, stored: { [APP]: sp("pi_1") }, m: { intents: { pi_1: "completed" }, db: {} } }, url: `/payment/${APP}?returned=success`, want: ["Payment received"], shot: "confirming" },
    pendingTimeout: { opts: { signedIn: true, m: { db: {} } }, url: `/payment/${APP}?returned=success`, want: ["Payment not confirmed yet"], shot: "pending" },
    cancel: { opts: { signedIn: true, stored: { [APP]: sp("pi_1") }, m: { intents: { pi_1: "requires_payment_instrument" }, db: {} } }, url: `/payment/${APP}?returned=cancel`, want: ["Payment cancelled"], shot: "cancelled" },
    closedWithoutPaying: { opts: { m: {} }, url: `/payment/${APP}?returned=closed`, want: ["Payment cancelled"] },
    closedAfterPaying: { opts: { signedIn: true, stored: { [APP]: sp("pi_1") }, m: { intents: { pi_1: "pending" }, db: {} } }, url: `/payment/${APP}?returned=closed`, want: ["Payment not confirmed yet"] },
    failed: { opts: { signedIn: true, stored: { [APP]: sp("pi_1") }, m: { intents: { pi_1: "failed" }, db: {} } }, url: `/payment/${APP}?returned=success`, want: ["Payment didn't go through"], shot: "failed" },
    failedDb: { opts: { signedIn: true, m: { db: { payment_status: "failed" } } }, url: `/payment/${APP}?returned=success`, want: ["Payment didn't go through"] },
    serverEndpoint: { opts: { m: { server: { applicationId: APP, payment_status: "paid", open: false, amount: 249, currency: "AED" } } }, url: `/payment/${APP}?returned=cancel`, want: ["Payment received"] },
  };
  // Run the state scenarios in parallel (each has its own browser context).
  await Promise.all(Object.entries(scenarios).map(async ([name, s]) => {
    const page = await open(browser, s.opts); await page.goto(base() + s.url);
    const got = await waitState(page, s.want);
    log(s.want.includes(got), name, `shows "${got}" · create-payment calls ${page.calls.create}`);
    await page.ctx.close();
  }));

  // Offline on return, then back online.
  { const mm = { db: {} }; const page = await open(browser, { signedIn: true, m: mm });
    // Network drops right as the user comes back from checkout (screen code already loaded, as on a device).
    await page.goto(base() + `/payment/${APP}?returned=success`); await page.getByTestId("payment-state").waitFor(); await page.ctx.setOffline(true);
    let got = await waitState(page, ["You're offline"], 15000); log(got === "You're offline", "offline on return", `shows "${got}"`);
    mm.db = { payment_status: "paid", payment_amount: 249 }; // paid meanwhile (webhook); visible only after reconnect
    await page.ctx.setOffline(false); got = await waitState(page, ["Payment received"], 20000); log(got === "Payment received", "back online re-checks automatically", `shows "${got}"`);
    await page.ctx.close(); }

  // Double tap: two quick taps on "Try again" create ONE payment; a third tap later reuses it (no new payment).
  { const m = { intents: (id) => (id.startsWith("pi_new") ? "requires_payment_instrument" : undefined), db: {} };
    const page = await open(browser, { signedIn: true, m }); await page.goto(base() + `/payment/${APP}?returned=cancel`);
    await waitState(page, ["Payment cancelled"]);
    const btn = page.getByText("Try again", { exact: true });
    const popups = []; page.ctx.on("page", (p) => popups.push(p));
    await Promise.all([btn.click({ timeout: 3000 }).catch(() => {}), btn.click({ timeout: 3000, force: true }).catch(() => {}), btn.click({ timeout: 3000, force: true }).catch(() => {})]);
    await page.waitForTimeout(2500);
    log(page.calls.create === 1, "double/triple tap creates one payment", `create-payment calls: ${page.calls.create}, checkout windows: ${popups.length}`);
    log(m.lastCreateBody && !("amount" in m.lastCreateBody) && !("currency" in m.lastCreateBody), "create-payment request carries no client price", JSON.stringify(m.lastCreateBody ?? {}).slice(0, 140));
    for (const p of popups) await p.close().catch(() => {});
    await waitState(page, ["Payment cancelled", "Payment not confirmed yet"], 20000);
    await page.getByText("Try again", { exact: true }).click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2500);
    log(page.calls.create === 1, "retry within the hour reopens the same payment", `create-payment calls: ${page.calls.create}`);
    for (const p of page.ctx.pages()) if (p !== page) await p.close().catch(() => {});
    await page.ctx.close(); }

  // App killed after paying: next launch (Home) shows the result from the server.
  { const page = await open(browser, { signedIn: true, stored: { [APP]: sp("pi_1") }, m: { intents: { pi_1: "completed" }, db: (c) => (c.checkId >= 3 ? { payment_status: "paid", payment_amount: 249 } : {}) } });
    await page.goto(base() + "/"); const got = await waitState(page, ["Payment received"], 40000);
    log(got === "Payment received", "relaunch after paying shows the result", `url ${new URL(page.url()).pathname} shows "${got}"`); await page.ctx.close(); }

  // Price on the detail screen: only the server number.
  for (const [name, m, want] of [["detail price without server quote", { db: {} }, "Pay securely"], ["detail price from server quote", { db: {}, server: { applicationId: APP, payment_status: "pending", open: false, amount: 498, currency: "AED" } }, "Pay 498 AED"]]) {
    const page = await open(browser, { signedIn: true, m }); await page.goto(base() + `/applications/${APP}`);
    const ok = await page.getByText(want, { exact: true }).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    const body = await page.locator("body").innerText();
    log(ok && !/249 AED/.test(body), name, ok ? `shows "${want}", no 249 AED in page` : "not found");
    if (name.endsWith("quote")) for (const vw of [390, 430]) for (const dark of [false, true]) {
      const p2 = await open(browser, { vw, dark, signedIn: true, m }); await p2.goto(base() + `/applications/${APP}`);
      await p2.getByText(want, { exact: true }).first().waitFor({ timeout: 20000 }).catch(() => {}); await p2.waitForTimeout(600);
      await p2.screenshot({ path: path.join(SHOTS, `detail-pay-${vw}-${dark ? "dark" : "light"}.png`) }); await p2.ctx.close();
    }
    await page.ctx.close();
  }

  // Screenshots of each result screen: 390/430, light/dark, plus Arabic RTL.
  const shots = Object.entries(scenarios).filter(([, s]) => s.shot);
  shots.push(["offline", { shot: "offline", offline: true, opts: { signedIn: true, m: { db: {} } }, url: `/payment/${APP}?returned=success`, want: ["You're offline", "أنت غير متصل"] }]);
  shots.push(["checking", { shot: "checking", opts: { signedIn: true, m: { db: {} } }, url: `/payment/${APP}?returned=success`, want: ["Checking your payment…", "جارٍ التحقق من الدفع…"] }]);
  const AR = { "Payment received": "تم استلام الدفع", "Payment not confirmed yet": null, "Payment cancelled": "تم إلغاء الدفع", "Payment didn't go through": null };
  const jobs = [];
  for (const [, s] of shots) for (const vw of [390, 430]) for (const dark of [false, true]) for (const lang of ["en", "ar"]) {
    if (lang === "ar" && vw === 430) continue; // Arabic at 390 light+dark
    jobs.push(async () => {
      const page = await open(browser, { ...s.opts, vw, dark, lang });
      await page.goto(base() + s.url);
      if (s.offline) { await page.getByTestId("payment-state").waitFor(); await page.ctx.setOffline(true); }
      if (s.shot === "checking") await page.waitForTimeout(1200);
      else { const end = Date.now() + 45000; while (Date.now() < end) { const t = await stateText(page); if (t && !/Checking|جارٍ التحقق/.test(t)) break; await page.waitForTimeout(250); } await page.waitForTimeout(500); }
      await page.screenshot({ path: path.join(SHOTS, `result-${s.shot}-${vw}-${dark ? "dark" : "light"}${lang === "ar" ? "-ar" : ""}.png`) });
      await page.ctx.close();
    });
  }
  for (let i = 0; i < jobs.length; i += 6) await Promise.all(jobs.slice(i, i + 6).map((j) => j()));
  console.log(`screenshots: ${fs.readdirSync(SHOTS).length} in ${SHOTS}`);
  console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
  await browser.close(); server.close(); process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
