// Tab bar, discard and Account checks on the app's web build against scripts/mock-supabase.mjs (no live data):
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --platform web --output-dir /tmp/web-dist
//   STATIC_DIR=/tmp/web-dist node scripts/mock-supabase.mjs &
//   node scripts/e2e-ui-web.mjs <screenshot dir> <a square-ish photo .png/.jpg>   (PLAYWRIGHT=..., CHROMIUM=... if needed)
// Covers: icon-only tab bar (names kept for VoiceOver), tab bar shrinks on scroll down and returns at the top, trash asks
// once, long swipe discards without asking, short swipe shows Discard, a swipe never opens the row, passport expiry
// picker hidden until tapped, profile photo shown as the Account tab and kept after reopening.
import fs from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const OUT = process.argv[2] || "/tmp/e2e-ui"; fs.mkdirSync(OUT, { recursive: true }); const APP = "http://localhost:8081"; const DB = "http://localhost:54321"; const EMAIL = "kirolos+ezvisa-app-test@example.com";
let fails = 0; const log = (ok, s, i = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${s}${i ? "  · " + i : ""}`); if (!ok) fails++; };
await fetch(`${DB}/__db/reset`, { method: "POST" });
const H = { apikey: "mock-service-role", Authorization: "Bearer mock-service-role", "Content-Type": "application/json", Prefer: "return=representation" };
for (let i = 0; i < 8; i++) await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: H, body: JSON.stringify({ email: EMAIL, full_name: "Kirolos Edward", destination_country: "Croatia", entry_date: "2027-01-13", exit_date: "2027-01-20", payment_status: "pending", application_status: "submitted", additional_notes: JSON.stringify({ source: "mobile-app" }) }) });
const cancelled = async () => (await (await fetch(`${DB}/__db`)).json()).filter((r) => r.application_status === "cancelled").length;
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
let dialogs = 0; p.on("dialog", (d) => { dialogs++; d.accept(); });
await p.goto(`${APP}/auth`); await p.getByPlaceholder("Email").fill(EMAIL); await p.getByPlaceholder("Password").fill("test-pass");
await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForTimeout(2500);
// 1. icon-only tab bar
const tabText = await p.locator('[role="tablist"]').first().innerText();
log(!/Home|Countries|Applications|Account/.test(tabText), "tab bar shows icons only (no label text)", JSON.stringify(tabText));
log((await p.getByRole("tab", { name: "Applications" }).count()) > 0, "tabs keep their names for screen readers");
// 2. applications list: shrink on scroll
await p.getByRole("tab", { name: "Applications" }).first().click(); await p.waitForTimeout(2000);
const scale = () => p.locator('[role="tablist"]').first().evaluate((el) => { let n = el; for (let i = 0; i < 6 && n; i++, n = n.parentElement) { const m = getComputedStyle(n).transform; if (m && m !== "none") { const v = m.match(/matrix\(([^,]+)/); if (v && Math.abs(parseFloat(v[1]) - 1) > 0.001) return parseFloat(v[1]); } } return 1; });
const s0 = await scale();
await p.mouse.move(195, 400); await p.mouse.wheel(0, 300); await p.waitForTimeout(150); await p.mouse.wheel(0, 300); await p.waitForTimeout(900);
const s1 = await scale();
await p.screenshot({ path: `${OUT}/ui-compact.png` });
await p.mouse.wheel(0, -2000); await p.waitForTimeout(900);
const s2 = await scale();
log(s0 === 1 && s1 < 0.95 && s2 === 1, "tab bar shrinks scrolling down, full size again at the top", `${s0} -> ${s1} -> ${s2}`);
// 3. single confirmation on the trash button
const c0 = await cancelled(); dialogs = 0;
await p.getByTestId("app-discard").first().click(); await p.waitForTimeout(1500);
log(dialogs === 1 && (await cancelled()) === c0 + 1, "trash: one confirmation, then discarded", `dialogs=${dialogs}`);
// 4. swipe: long swipe discards at once (no dialog)
const card = p.getByTestId("app-swipe").first(); const bb = await card.boundingBox(); dialogs = 0;
await p.mouse.move(bb.x + bb.width - 40, bb.y + 40); await p.mouse.down(); for (let i = 1; i <= 12; i++) await p.mouse.move(bb.x + bb.width - 40 - i * 25, bb.y + 42); await p.mouse.up(); await p.waitForTimeout(1500);
log((await cancelled()) === c0 + 2 && dialogs === 0, "long swipe left discards without asking", `cancelled=${await cancelled()}`);
// short swipe reveals the button, tapping it discards
await p.waitForTimeout(800); const card2 = p.getByTestId("app-swipe").locator("visible=true").first(); await card2.scrollIntoViewIfNeeded(); const b2 = await card2.boundingBox();
await p.mouse.move(b2.x + b2.width - 40, b2.y + 40); await p.mouse.down(); for (let i = 1; i <= 5; i++) await p.mouse.move(b2.x + b2.width - 40 - i * 20, b2.y + 41); await p.mouse.up(); await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/ui-swipe-reveal.png` });
const btn = card2.getByTestId("swipe-discard"); const vb = await btn.boundingBox();
await p.mouse.click(vb.x + vb.width / 2, vb.y + vb.height / 2); await p.waitForTimeout(1500);
log((await cancelled()) === c0 + 3, "short swipe shows Discard; tapping it discards", `cancelled=${await cancelled()}`);
log(new URL(p.url()).pathname === "/applications", "swiping did not open the application", p.url());
// 4b. while a row is being swiped the list does not scroll; after release it scrolls again
const scroller = () => p.getByTestId("app-swipe").first().evaluate((el) => { let n = el.parentElement; while (n && !(n.scrollHeight > n.clientHeight + 2 && /(auto|scroll|hidden)/.test(getComputedStyle(n).overflowY))) n = n.parentElement; return n ? { top: n.scrollTop, oy: getComputedStyle(n).overflowY } : null; });
const r3 = await p.getByTestId("app-swipe").locator("visible=true").first().boundingBox();
await p.mouse.move(r3.x + r3.width - 40, r3.y + 40); await p.mouse.down(); for (let i = 1; i <= 3; i++) await p.mouse.move(r3.x + r3.width - 40 - i * 20, r3.y + 41); await p.waitForTimeout(300);
const during = await scroller(); await p.mouse.wheel(0, 400); await p.waitForTimeout(300); const during2 = await scroller();
await p.mouse.move(r3.x + r3.width - 40, r3.y + 41); await p.mouse.up(); await p.waitForTimeout(800);
log(!!during && during.oy === "hidden" && during2.top === during.top, "no scrolling while swiping a row", JSON.stringify([during, during2]));
const after = await scroller(); await p.mouse.move(195, 500); await p.mouse.wheel(0, 300); await p.waitForTimeout(500); const after2 = await scroller();
log(!!after && after.oy !== "hidden" && after2.top > after.top, "scrolling works again after the swipe", JSON.stringify([after, after2]));
await p.mouse.wheel(0, -3000); await p.waitForTimeout(500);
// 5. account: passport expiry picker hidden until tapped
await p.getByRole("tab", { name: "Account" }).first().click(); await p.waitForTimeout(2000);
log((await p.getByTestId("passport-expiry-picker").count()) === 0, "passport expiry: picker hidden at first");
await p.getByTestId("passport-expiry").getByRole("button").first().click(); await p.waitForTimeout(700);
log((await p.getByTestId("passport-expiry-picker").count()) === 1, "tapping the row shows the picker");
await p.getByTestId("passport-expiry").getByRole("button").first().click(); await p.waitForTimeout(700);
log((await p.getByTestId("passport-expiry-picker").count()) === 0, "tapping again hides it");
// 6. profile photo
const fc = p.waitForEvent("filechooser", { timeout: 8000 });
await p.getByTestId("avatar-edit").click();
await (await fc).setFiles(process.argv[3]); await p.waitForTimeout(2500);
const imgs = await p.locator('[role="tablist"] img, [role="tablist"] [style*="background-image"]').count();
await p.screenshot({ path: `${OUT}/ui-avatar.png` });
log(imgs > 0, "the photo replaces the Account icon in the tab bar", `images in tab bar: ${imgs}`);
log((await p.getByRole("button", { name: "Edit photo" }).count()) > 0, "the avatar button becomes Edit photo once a photo is set");
await p.reload(); await p.waitForTimeout(3000);
log((await p.locator('[role="tablist"] img, [role="tablist"] [style*="background-image"]').count()) > 0, "photo still there after reopening");
// 7. Account: email hidden; details on their own page
log((await p.getByText(EMAIL, { exact: true }).locator("visible=true").count()) === 0, "Account does not show the email");
await p.getByText("Account details", { exact: true }).first().click(); await p.waitForTimeout(1500);
log(new URL(p.url()).pathname === "/account/details" && (await p.getByText(EMAIL, { exact: true }).locator("visible=true").count()) > 0, "Account details opens its own page with the email", p.url());
await p.screenshot({ path: `${OUT}/ui-account-details.png` });
await p.getByTestId("header-back").locator("visible=true").first().click(); await p.waitForTimeout(1200);
log(new URL(p.url()).pathname === "/account", "Back returns to Account", p.url());
log(!errs.length, "no page errors", errs.join(" | ").slice(0, 300));
await b.close(); console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
