// Web e2e for chat 03 auth (node scripts/auth-e2e-web.mjs <outDir>). Supabase is unreachable from the container, so /auth/v1 and /rest/v1 are mocked here with
// the response shapes GoTrue returns. Usage: node auth-e2e.mjs <outDir>
// Needs a web dev server (npx expo start --web) with EXPO_PUBLIC_SUPABASE_URL=https://dravvaykssrbktztmrlj.supabase.co and any
// placeholder key in .env.local, and Playwright (PLAYWRIGHT=/path/to/playwright/index.mjs if it is not resolvable).
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
import fs from "node:fs";

const BASE = "http://localhost:8081";
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`); };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (email, sub, ttl = 3600) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + ttl, session_id: "s-" + sub })}.c2ln`;
const user = (email) => ({ id: "u-" + email.split("@")[0], aud: "authenticated", role: "authenticated", email, email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: {}, identities: [{ id: "i1", provider: "email" }], created_at: "2026-02-01T00:00:00Z" });
const session = (email, ttl = 3600) => ({ access_token: jwt(email, "u-" + email.split("@")[0], ttl), token_type: "bearer", expires_in: ttl, expires_at: Math.floor(Date.now() / 1000) + ttl, refresh_token: "rt-" + email + "-" + Date.now(), user: user(email) });

const state = { deleted: false, revoked: false, calls: {}, lastEmail: "a@ezvisa-test.net" };
const count = (k) => { state.calls[k] = (state.calls[k] ?? 0) + 1; };
async function mock(ctx) {
  await ctx.route("https://dravvaykssrbktztmrlj.supabase.co/**", async (route) => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname; const m = req.method();
    const body = req.postData() ? (() => { try { return JSON.parse(req.postData()); } catch { return {}; } })() : {};
    const json = (status, data) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(data) });
    if (m === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    count(`${m} ${p}${url.searchParams.get("grant_type") ? "?" + url.searchParams.get("grant_type") : ""}`);
    if (p === "/auth/v1/settings") return json(200, { external: { email: true, google: false, apple: false } });
    if (p === "/auth/v1/token") {
      const g = url.searchParams.get("grant_type");
      if (g === "password") {
        const e = body.email ?? "";
        if (e.startsWith("unconfirmed")) return json(400, { code: "email_not_confirmed", error_code: "email_not_confirmed", msg: "Email not confirmed" });
        if (e.startsWith("ratelimit")) return json(429, { code: "over_request_rate_limit", error_code: "over_request_rate_limit", msg: "Request rate limit reached" });
        await new Promise((r) => setTimeout(r, 600)); // slow enough for a double tap
        if (body.password === "right-pass1") { state.revoked = false; state.lastEmail = e; return json(200, session(e)); }
        return json(400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      if (g === "refresh_token") return state.revoked || state.deleted ? json(400, { code: "refresh_token_not_found", error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" }) : json(200, session(state.lastEmail));
      if (g === "pkce") {
        if (body.auth_code === "good") return json(200, session(state.lastEmail));
        return json(404, { code: "flow_state_not_found", error_code: "flow_state_not_found", msg: "invalid flow state, no valid flow state found" });
      }
    }
    if (p === "/auth/v1/user" && m === "GET" && state.deleted) return json(403, { code: "user_not_found", error_code: "user_not_found", msg: "User from sub claim in JWT does not exist" });
    if (p === "/auth/v1/user" && m === "GET") return state.revoked ? json(403, { code: "session_not_found", error_code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" }) : json(200, user(state.lastEmail));
    if (p === "/auth/v1/user" && m === "PUT") { count("password-update"); return body.password === "same-pass1" ? json(422, { code: "same_password", error_code: "same_password", msg: "New password should be different from the old password." }) : json(200, user(state.lastEmail)); }
    if (p === "/auth/v1/logout") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    if (p === "/auth/v1/otp" || p === "/auth/v1/recover" || p === "/auth/v1/resend") return json(200, {});
    if (p === "/auth/v1/signup") return json(200, { ...user(body.email), email_confirmed_at: null, confirmation_sent_at: new Date().toISOString() });
    if (p.startsWith("/rest/v1/")) return json(200, []);
    if (p.startsWith("/functions/v1/")) return json(200, {});
    return json(404, { msg: "not mocked " + p });
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--no-sandbox"] });
async function newPage({ width = 390, height = 844, dark = false, lang = "en", storage = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light", isMobile: true, hasTouch: true });
  await mock(ctx);
  await ctx.addInitScript(([lang, storage]) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("ezvisa.lang.v1", lang); for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v); sessionStorage.setItem("seeded", "1"); } }, [lang, storage]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  return { ctx, page };
}
const text = (page, s) => page.getByText(s, { exact: false }).first();
const visible = async (page, s, timeout = 15000) => { try { await text(page, s).waitFor({ state: "visible", timeout }); return true; } catch { return false; } };
const shot = async (page, name) => { await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/${name}.png` }); };
const fill = async (page, id, v) => { const el = page.getByTestId(id); await el.click(); await el.fill(v); };
const SESSION_KEY = "sb-dravvaykssrbktztmrlj-auth-token";

/** Watches the DOM from the first frame: records whether Home tabs or the Welcome screen were ever rendered. */
async function bootWatch(page) {
  await page.addInitScript(() => {
    window.__seen = { home: false, welcome: false };
    const tick = () => { const t = document.body?.innerText ?? ""; if (/Countries/.test(t) && /Account/.test(t)) window.__seen.home = true; if (/Continue without an account/.test(t)) window.__seen.welcome = true; };
    new MutationObserver(tick).observe(document, { subtree: true, childList: true, characterData: true });
  });
}

// ---------- 1. Signed-out launch: Welcome, never Home ----------
{
  const { ctx, page } = await newPage(); await bootWatch(page);
  await page.goto(BASE + "/"); const w = await visible(page, "Continue without an account");
  const seen = await page.evaluate(() => window.__seen);
  ok("signed-out launch shows Welcome, no Home flash", w && !seen.home, JSON.stringify(seen));
  // ---------- 2. Sign-in errors ----------
  await text(page, "Sign in").click(); await visible(page, "Welcome back");
  await fill(page, "auth-email", "a@ezvisa-test.net"); await fill(page, "auth-password", "wrong-pass");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  ok("wrong password -> short message", await visible(page, "Wrong email or password."));
  await fill(page, "auth-email", "unconfirmed@ezvisa-test.net"); await page.getByRole("button", { name: "Sign in", exact: true }).click();
  ok("unconfirmed email -> message + resend", (await visible(page, "Confirm your email first")) && (await page.getByTestId("resend-confirm").isVisible()));
  await fill(page, "auth-email", "ratelimit@ezvisa-test.net"); await page.getByRole("button", { name: "Sign in", exact: true }).click();
  ok("rate limited -> message", await visible(page, "Too many tries"));
  await ctx.setOffline(true);
  await fill(page, "auth-email", "a@ezvisa-test.net"); await page.getByRole("button", { name: "Sign in", exact: true }).click();
  ok("no internet -> message", await visible(page, "You're offline"));
  await shot(page, "signin-error-offline-390-light");
  await ctx.setOffline(false);
  // ---------- 3. Double tap sends one request ----------
  await fill(page, "auth-password", "right-pass1"); const before = state.calls["POST /auth/v1/token?password"] ?? 0;
  const btn = page.getByRole("button", { name: "Sign in", exact: true });
  await Promise.all([btn.click(), btn.click({ force: true, delay: 30 }).catch(() => {})]);
  await page.waitForTimeout(1500);
  ok("double tap -> one sign-in request", (state.calls["POST /auth/v1/token?password"] ?? 0) - before === 1, `requests=${(state.calls["POST /auth/v1/token?password"] ?? 0) - before}`);
  ok("existing user signs in -> Home", await visible(page, "Countries"));
  const stored = await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY);
  ok("session persisted by the storage adapter", !!stored && stored.includes("a@ezvisa-test.net"));
  await shot(page, "home-after-signin-390-light");
  // ---------- 4. Reopen keeps the session, no Welcome flash ----------
  const p2 = await ctx.newPage(); await bootWatch(p2); await p2.goto(BASE + "/");
  const home2 = await visible(p2, "Countries"); await p2.waitForTimeout(800);
  const seen2 = await p2.evaluate(() => window.__seen);
  ok("reopen keeps user signed in, no Welcome flash", home2 && !seen2.welcome, JSON.stringify(seen2));
  // ---------- 5. Revoked session on launch -> clean sign-out with message ----------
  state.revoked = true;
  await p2.evaluate(() => localStorage.setItem("ezvisa.drafts.v2", JSON.stringify([{ key: "dA", form: { fullName: "User A" }, page: "q:destination", savedAt: 1, draftId: null }])));
  await p2.close(); await page.close(); // one app instance, like a phone (tabs share storage and would race)
  const p3 = await ctx.newPage(); await p3.goto(BASE + "/");
  const ended = await visible(p3, "Your session ended", 20000);
  const left = await p3.evaluate((k) => ({ session: localStorage.getItem(k), drafts: localStorage.getItem("ezvisa.drafts.v2") }), SESSION_KEY);
  ok("revoked/deleted user -> refresh once, then signed out with message", ended && !left.session, `refresh calls=${state.calls["POST /auth/v1/token?refresh_token"] ?? 0}`);
  ok("session end wipes local user data", !left.drafts);
  await shot(p3, "welcome-session-ended-390-light");
  await ctx.close();
}

// ---------- 5b. Deleted user: refresh once, then sign out. 5c. Expired token on launch refreshes. ----------
{
  const signed = (ttl) => ({ [SESSION_KEY]: JSON.stringify(session("d@ezvisa-test.net", ttl)) });
  state.lastEmail = "d@ezvisa-test.net"; state.revoked = false; state.deleted = false;
  let r0 = state.calls["POST /auth/v1/token?refresh_token"] ?? 0;
  { const { ctx, page } = await newPage({ storage: signed(-60) }); await page.goto(BASE + "/");
    const home = await visible(page, "Countries"); await page.waitForTimeout(800);
    const r = (state.calls["POST /auth/v1/token?refresh_token"] ?? 0) - r0;
    ok("expired access token on launch -> refreshed, stays signed in", home && r >= 1, `refresh calls=${r}`); await ctx.close(); }
  state.deleted = true; r0 = state.calls["POST /auth/v1/token?refresh_token"] ?? 0;
  { const { ctx, page } = await newPage({ storage: signed(3600) }); await page.goto(BASE + "/");
    const ended = await visible(page, "Your session ended", 20000);
    const r = (state.calls["POST /auth/v1/token?refresh_token"] ?? 0) - r0;
    const s = await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY);
    ok("user deleted on website -> one refresh, then clean sign-out + message", ended && r === 1 && !s, `refresh calls=${r}`); await ctx.close(); }
  state.deleted = false;
}

// ---------- 6. Two accounts one after the other: sign out clears everything ----------
{
  const { ctx, page } = await newPage(); state.revoked = false;
  await page.goto(BASE + "/auth?mode=signin"); await visible(page, "Welcome back");
  await fill(page, "auth-email", "a@ezvisa-test.net"); await fill(page, "auth-password", "right-pass1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await visible(page, "Countries");
  await page.evaluate(() => {
    localStorage.setItem("ezvisa.drafts.v2", JSON.stringify([{ key: "dA", form: { fullName: "User A" }, page: "q:destination", savedAt: 1, draftId: null }]));
    localStorage.setItem("ezvisa.wizard.v1", JSON.stringify({ v: 1, key: "dA", form: { fullName: "User A" }, page: "q:destination" }));
    localStorage.setItem("ezvisa.itinerary.v1.abc", "{}"); localStorage.setItem("ezvisa.passportExpiry.v1", "2030-01-01");
  });
  await page.goto(BASE + "/account"); await visible(page, "a@ezvisa-test.net");
  await page.getByText("Sign out", { exact: true }).last().click();
  ok("sign out -> Welcome", await visible(page, "Continue without an account"));
  const keys = await page.evaluate(() => Object.keys(localStorage));
  const leftovers = keys.filter((k) => /auth-token|wizard|drafts|itinerary|passportExpiry|uploads|push|events|crash/.test(k));
  ok("sign out clears session + cached user data", leftovers.length === 0, `remaining keys: ${keys.join(", ")}`);
  await text(page, "Sign in").click(); await visible(page, "Welcome back");
  await fill(page, "auth-email", "b@ezvisa-test.net"); await fill(page, "auth-password", "right-pass1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await visible(page, "Countries");
  await page.goto(BASE + "/account"); const bShown = await visible(page, "b@ezvisa-test.net");
  const aGone = !(await page.evaluate(() => document.body.innerText.includes("a@ezvisa-test.net") || document.body.innerText.includes("User A")));
  ok("second account sees only its own data", bShown && aGone);
  await shot(page, "account-user-b-390-light");
  await ctx.close();
}

// ---------- 7. Magic link: send, open on this device, other device, expired ----------
{
  const { ctx, page } = await newPage(); state.revoked = false; state.lastEmail = "magic@ezvisa-test.net";
  await page.goto(BASE + "/auth/magic-link"); await visible(page, "Sign in with a link");
  await fill(page, "auth-email", "magic@ezvisa-test.net"); await page.getByRole("button", { name: "Send link" }).click();
  ok("magic link request -> check email", await visible(page, "We sent a link to magic@ezvisa-test.net"));
  const otpBody = state.calls["POST /auth/v1/otp"] ?? 0; ok("magic link request sent once", otpBody === 1, `otp calls=${otpBody}`);
  await shot(page, "magic-sent-390-light");
  const verifier = await page.evaluate((k) => localStorage.getItem(k + "-code-verifier"), SESSION_KEY);
  ok("PKCE verifier kept for this device", !!verifier);
  await page.goto(BASE + "/auth/callback?type=magiclink&code=good"); ok("magic link opens app and signs in", await visible(page, "Countries"));
  // other device: no verifier
  await page.evaluate(() => localStorage.clear()); await page.goto(BASE + "/auth/callback?type=magiclink&code=good");
  ok("magic link on another device -> clear message", await visible(page, "Open the link on the phone where you asked for it"));
  await shot(page, "callback-other-device-390-light");
  await page.goto(BASE + "/auth/callback?type=magiclink#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  ok("expired magic link -> clear message", await visible(page, "This link has expired"));
  await shot(page, "callback-expired-390-light");
  await ctx.close();
}

// ---------- 8. Password reset: send, open, set new password ----------
{
  const { ctx, page } = await newPage(); state.lastEmail = "reset@ezvisa-test.net";
  await page.goto(BASE + "/auth/forgot"); await visible(page, "Reset password");
  await fill(page, "auth-email", "reset@ezvisa-test.net"); await page.getByRole("button", { name: "Send reset link" }).click();
  ok("reset request -> check email", await visible(page, "If there's an account for this email"));
  const ver = await page.evaluate((k) => localStorage.getItem(k + "-code-verifier"), SESSION_KEY);
  ok("reset verifier marked as recovery", !!ver && ver.includes("recovery"), String(ver).slice(-12));
  await page.goto(BASE + "/auth/callback?type=recovery&code=good"); ok("reset link opens 'Choose a new password'", await visible(page, "Choose a new password"));
  await shot(page, "reset-new-password-390-light");
  await fill(page, "auth-password", "same-pass1"); await page.getByRole("button", { name: "Save password" }).click();
  ok("same password -> short message", await visible(page, "Choose a password you haven't used before."));
  await fill(page, "auth-password", "brand-new-pass9"); await page.getByRole("button", { name: "Save password" }).click();
  ok("new password saved -> Home", (await visible(page, "Countries")) && (state.calls["password-update"] ?? 0) === 2);
  await ctx.close();
}

// ---------- 9. Guest checkout path still open ----------
{
  const { ctx, page } = await newPage(); await page.goto(BASE + "/"); await visible(page, "Continue without an account");
  await page.getByTestId("continue-guest").click(); ok("continue without an account -> Home (guest)", await visible(page, "Countries"));
  await page.getByText("Applications", { exact: true }).last().click(); ok("account-only screen asks guest to sign in", await visible(page, "Your applications live here"));
  await ctx.close();
}

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, calls: state.calls }, null, 2));
await browser.close();
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
