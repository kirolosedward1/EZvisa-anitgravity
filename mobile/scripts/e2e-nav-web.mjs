// STALE since the v1.1 wizard (canvas question order, Review → insurance → price → pay). The current end-to-end run is
// scripts/e2e-wizard-web.mjs; this script still describes the older flow and fails on it.
// Back and tab navigation around an application, on the app's web build against scripts/mock-supabase.mjs (no live data):
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --platform web --output-dir /tmp/web-dist
//   STATIC_DIR=/tmp/web-dist node scripts/mock-supabase.mjs &
//   node scripts/e2e-nav-web.mjs [screenshot dir]     (PLAYWRIGHT=<playwright/index.mjs>, CHROMIUM=<browser> if needed)
// Covers: submit -> Done opens the application with the list under it (Back -> list); tab -> card -> Back; a deep-linked
// application's Back stays in the Applications tab (it used to jump to Home).
import fs from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const OUT = process.argv[2] || "/tmp/e2e-nav"; fs.mkdirSync(OUT, { recursive: true }); const APP = process.env.APP_URL || "http://localhost:8081"; const EMAIL = "kirolos+ezvisa-app-test@example.com";
let fails = 0; const log = (ok, s, i = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${s}${i ? "  · " + i : ""}`); if (!ok) fails++; };
await fetch(`${process.env.MOCK_URL || "http://localhost:54321"}/__db/reset`, { method: "POST" });
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { localStorage.setItem("ezvisa.welcomed.v1", "1"); });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const path = () => new URL(p.url()).pathname;
const vis = (id) => p.getByTestId(id).locator("visible=true");
const pick = async (n) => { await p.getByRole("radio", { name: n, exact: true }).first().click(); await p.waitForTimeout(800); };
const tab = async (name) => { await vis(`tab-${name}`).first().click({ timeout: 8000 }); await p.waitForTimeout(1500); };
await p.goto(`${APP}/auth`); await p.getByPlaceholder("Email").fill(EMAIL); await p.getByPlaceholder("Password").fill("test-pass");
await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForTimeout(1800);
await p.goto(`${APP}/apply`); await p.waitForTimeout(2500);
await pick("France"); await pick("India"); await pick("Dubai");
await p.getByTestId("question-input").fill("Aisha"); await p.getByTestId("question-input-2").fill("Khan"); await p.getByRole("button", { name: "Continue", exact: true }).last().click(); await p.waitForTimeout(700);
await p.locator("input").last().fill("501234567"); await p.waitForTimeout(400); await p.getByRole("button", { name: "Continue", exact: true }).last().click(); await p.waitForTimeout(700);
await pick("Single"); await p.getByRole("button", { name: "Submit application" }).click(); await p.waitForTimeout(3000);
await p.getByRole("button", { name: "Done", exact: true }).first().click(); await p.waitForTimeout(2500);
const id = path().split("/").pop();
// A. Submit -> Done opens the application with the list under it
log(path().startsWith("/applications/"), "Done opens the application", path());
log((await vis("header-back").count()) > 0, "A: back button shown");
await p.screenshot({ path: `${OUT}/navA-detail.png` });
await vis("header-back").first().click(); await p.waitForTimeout(1500);
log(path() === "/applications", "A: Back goes to the Applications list", path());
// B. Home -> Applications tab -> open -> Back
await tab("(home)"); await tab("applications");
log(path() === "/applications", "B: Applications tab shows the list", path());
await p.getByText("EZ-", { exact: false }).first().click(); await p.waitForTimeout(1500);
log(path().startsWith("/applications/"), "B: tapping a card opens it", path());
await vis("header-back").first().click(); await p.waitForTimeout(1200);
log(path() === "/applications", "B: Back returns to the list", path());
// C. Opened with nothing under it (notification / deep link): tab tap goes to the list
await p.goto(`${APP}/applications/${id}`); await p.waitForTimeout(2500);
log((await vis("header-back").count()) > 0, "C: back button shown on a deep-linked application");
await p.waitForTimeout(2000); await p.screenshot({ path: `${OUT}/navC-detail.png` });
await vis("header-back").first().click(); await p.waitForTimeout(1500); log(path() === "/applications", "C: Back goes to the list", path());
await p.screenshot({ path: `${OUT}/navC-list.png` });
log(!errs.length, "no page errors", errs.join(" | "));
await b.close(); console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
