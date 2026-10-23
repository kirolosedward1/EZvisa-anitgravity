// Country screen v2: screenshots + UI checks on the app's web build against scripts/mock-supabase.mjs (no live data).
//   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx expo export --platform web --output-dir /tmp/web-new --clear
//   STATIC_DIR=/tmp/web-new node scripts/mock-supabase.mjs &
//   node scripts/country-shots.mjs docs/screenshots/country-v2          (PLAYWRIGHT=/path/to/playwright if needed)
//   BEFORE=1 node scripts/country-shots.mjs <dir>    with the OLD build served: only the "before" shots
// Each shot set scrolls the screen from top to bottom. Large text uses the web preview's Dynamic Type simulation
// (window.__FONT_SCALE__, capped per text role as on iOS). The funds preview sets window.__PREVIEW_FUNDS__, which only
// the web preview reads: in the app the section stays hidden until the numbers are confirmed (lib/funds.ts).
import fs from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const OUT = path.resolve(process.argv[2] || "/tmp/country-v2"); fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:8081"; const DB = "http://localhost:54321"; const EMAIL = "country-v2-test@example.com";
const H = { apikey: "mock-service-role", Authorization: "Bearer mock-service-role", "Content-Type": "application/json", Prefer: "return=representation" };
let fails = 0; const log = (ok, s, i = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${s}${i ? "  · " + i : ""}`); if (!ok) fails++; };
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const afterPay = { employmentStatus: "student", purposeOfTrip: "tourism", travelStartDate: inDays(45), travelEndDate: inDays(55), datesFlexible: "no", travelingWith: "alone", hotelCategory: "3-star",
  fundingSource: "self", balanceRange: "10000-25000", isFirstSchengenVisa: "yes", previousRefusals: "no", residenceVisaValid: "yes", dateOfBirth: "1990-01-01", hasValidPassport: "yes", passportNumber: "N1234567", passportExpiry: inDays(2000) };
const wiz = (extra = {}) => ({ destination: "Italy", nationality: "India", cityOfResidence: "Dubai", firstName: "Sara", lastName: "Khan", phone: "+971500000000", maritalStatus: "single", ...extra });
const seed = {
  none: [],
  draft: [{ destination_country: "Italy", application_status: "draft", payment_status: "pending", entry_date: null, exit_date: null, additional_notes: JSON.stringify({ source: "mobile-app", wizardStep: "personal", wizard: wiz() }) }],
  active: [
    { destination_country: "Italy", application_status: "submitted", payment_status: "paid", payment_amount: 249, entry_date: inDays(45), exit_date: inDays(55), additional_notes: JSON.stringify({ source: "mobile-app", wizard: wiz(afterPay), ...afterPay }) },
    { destination_country: "Italy", application_status: "draft", payment_status: "pending", entry_date: null, exit_date: null, updated_at: "2026-09-01T08:00:00Z", additional_notes: JSON.stringify({ source: "mobile-app", wizardStep: "personal", wizard: wiz() }) },
  ],
};
async function reset(kind) {
  await fetch(`${DB}/__db/reset`, { method: "POST" });
  for (const r of seed[kind]) await fetch(`${DB}/rest/v1/visa_applications`, { method: "POST", headers: H, body: JSON.stringify({ email: EMAIL, full_name: "Sara Khan", nationality: "India", ...r }) });
}

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
async function open({ w, scheme, lang, big, funds, signedIn, slug }) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 932 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.addInitScript(([big, funds, scheme]) => { localStorage.setItem("ezvisa.welcomed.v1", "1"); localStorage.setItem("ezvisa.appearance.v1", scheme); if (big) window.__FONT_SCALE__ = 3.1; if (funds) window.__PREVIEW_FUNDS__ = true; }, [big, funds, scheme]);
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  if (signedIn) {
    await p.goto(`${APP}/auth`); await p.getByPlaceholder("Email").fill(EMAIL); await p.getByPlaceholder("Password").fill("test-pass");
    await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForTimeout(2500);
  }
  await p.goto(`${APP}/`); await p.evaluate((l) => localStorage.setItem("ezvisa.lang.v1", l), lang);
  await p.goto(`${APP}/`); await p.waitForTimeout(3000);
  if (!signedIn) { await p.getByTestId("continue-guest").click(); await p.waitForTimeout(1500); } // guest mode lives in memory: navigate inside the app
  await p.getByRole("tab").nth(1).click({ force: true }); await p.waitForTimeout(1500);
  await p.getByTestId("countries-list").getByLabel(NAMES[lang][slug], { exact: true }).first().click(); await p.waitForTimeout(3000);
  return { ctx, p, errs };
}
const NAMES = { en: { italy: "Italy", portugal: "Portugal", malta: "Malta" }, ar: { italy: "إيطاليا", portugal: "البرتغال", malta: "مالطا" } };
const scroller = (p) => p.getByTestId("country-scroll");
const setScroll = async (p, y) => { await scroller(p).evaluate((el, y) => { el.scrollTop = y; el.dispatchEvent(new Event("scroll")); }, y); await p.waitForTimeout(450); };
/** Top-to-bottom shots; returns the file names. */
async function shoot(p, name) {
  const files = []; const h = await scroller(p).evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
  const step = Math.round(h.ch * 0.72);
  for (let y = 0, i = 1; i <= 9; y += step, i++) {
    const yy = Math.min(y, h.sh - h.ch); await setScroll(p, yy);
    const f = `${name}-${i}.jpg`; await p.screenshot({ path: `${OUT}/${f}`, type: "jpeg", quality: 78 }); files.push(f);
    if (yy >= h.sh - h.ch) break;
  }
  await setScroll(p, 0); return files;
}

const sheets = {};
const add = (sheet, label, files) => { (sheets[sheet] ??= []).push({ label, files }); };

if (process.env.BEFORE) {
  for (const cfg of [{ w: 390, scheme: "light", lang: "en" }, { w: 390, scheme: "dark", lang: "ar" }]) {
    const { ctx, p } = await open({ ...cfg, slug: "italy" });
    const files = []; await p.screenshot({ path: `${OUT}/before-italy-${cfg.w}-${cfg.scheme}-${cfg.lang}-1.jpg`, type: "jpeg", quality: 78 }); files.push(`before-italy-${cfg.w}-${cfg.scheme}-${cfg.lang}-1.jpg`);
    await p.mouse.move(cfg.w / 2, 500); await p.mouse.wheel(0, 2000); await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/before-italy-${cfg.w}-${cfg.scheme}-${cfg.lang}-2.jpg`, type: "jpeg", quality: 78 }); files.push(`before-italy-${cfg.w}-${cfg.scheme}-${cfg.lang}-2.jpg`);
    fs.writeFileSync(`${OUT}/before.json`, JSON.stringify({ ...(fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`)) : {}), [`${cfg.w} ${cfg.scheme} ${cfg.lang}`]: files }));
    await ctx.close();
  }
  await b.close(); process.exit(0);
}

const CONFIGS = {
  full: [{ w: 390, scheme: "light", lang: "en" }, { w: 390, scheme: "dark", lang: "ar" }, { w: 430, scheme: "dark", lang: "en" }, { w: 430, scheme: "light", lang: "ar" }, { w: 390, scheme: "light", lang: "en", big: true }, { w: 430, scheme: "dark", lang: "ar", big: true }],
  some: [{ w: 390, scheme: "light", lang: "en" }, { w: 430, scheme: "dark", lang: "ar" }, { w: 390, scheme: "dark", lang: "en", big: true }],
};
const SCENARIOS = [
  { id: "italy", slug: "italy", data: "none", cfgs: CONFIGS.full },
  { id: "italy-funds-preview", slug: "italy", data: "none", funds: true, cfgs: [CONFIGS.full[0], CONFIGS.full[1], CONFIGS.full[4]] },
  { id: "portugal-no-funds", slug: "portugal", data: "none", cfgs: CONFIGS.some },
  { id: "malta-no-centre", slug: "malta", data: "none", cfgs: CONFIGS.some },
  { id: "italy-draft", slug: "italy", data: "draft", signedIn: true, cfgs: CONFIGS.some },
  { id: "italy-active", slug: "italy", data: "active", signedIn: true, cfgs: CONFIGS.some },
];

for (const s of SCENARIOS) {
  await reset(s.data);
  for (const cfg of s.cfgs) {
    const tag = `${s.id}-${cfg.w}-${cfg.scheme}-${cfg.lang}${cfg.big ? "-largest" : ""}`;
    const { ctx, p, errs } = await open({ ...cfg, slug: s.slug, funds: s.funds, signedIn: s.signedIn });
    const text = await p.getByTestId("country-screen").innerText();
    // Content rules (every scenario, every language)
    log(!/24\s*[–-]\s*48|processing/i.test(text), `${tag}: no processing time`);
    log(!/AED|درهم|249|498/.test(text), `${tag}: no price`);
    log(!/%|approval rate|visas approved|\d,\d{3}\+/.test(text), `${tag}: no approval rate or visa count`);
    log(!/\p{Extended_Pictographic}/u.test(text), `${tag}: no emoji`);
    log(errs.length === 0, `${tag}: no page errors`, errs.join(" | "));
    if (cfg.w === 390 && !cfg.big) {
      // Structure
      const has = async (id) => (await p.getByTestId(id).count()) > 0;
      log(await has("country-glance") && await has("country-requirements") && await has("country-questions"), `${tag}: glance, requirements and questions shown`);
      log((await has("glance-centre")) === (s.slug !== "malta") && (await has("country-centre")) === (s.slug !== "malta"), `${tag}: visa centre shown only where mapped`);
      log((await has("country-funds")) === !!(s.funds && s.slug === "italy"), `${tag}: funds only in the preview (hidden until confirmed)`);
      log((await has("country-yourapp")) === (s.data !== "none"), `${tag}: Your application card only with an application`);
      const glance = await p.getByTestId("glance-stay").getAttribute("aria-label");
      log(cfg.lang !== "en" || glance === "Stay, Up to 90 days in any 180 days", `${tag}: glance row reads as one element`, glance);
      const footer = await p.getByTestId("country-footer").innerText();
      const want = { none: cfg.lang === "en" ? "Apply for Italy" : "قدّم على تأشيرة", draft: cfg.lang === "en" ? "Continue your Italy application" : "أكمل طلبك", active: cfg.lang === "en" ? "View your application" : "عرض طلبك" }[s.data];
      log(s.slug !== "italy" || footer.includes(want), `${tag}: footer button for "${s.data}"`, footer.replace(/\n/g, " / "));
      if (s.data === "active") log(await has("yourapp-active") && (await p.getByTestId("yourapp-header").innerText()).length > 0 && /See all|عرض الكل/.test(await p.getByTestId("yourapp-header").innerText()), `${tag}: active card, See all with 2 items`);
      // Back and Share: 44pt; Back on the leading side (right in Arabic)
      const bk = await p.getByTestId("country-back").boundingBox(); const sh = await p.getByTestId("country-share").boundingBox();
      log(Math.round(bk.width) >= 44 && Math.round(bk.height) >= 44 && Math.round(sh.width) >= 44, `${tag}: Back and Share are 44pt`, `${bk.width}x${bk.height}`);
      log(cfg.lang === "ar" ? bk.x > sh.x : bk.x < sh.x, `${tag}: Back on the ${cfg.lang === "ar" ? "right (RTL)" : "left"}`);
      // Photo ~34% of the window
      const ph = await p.getByTestId("country-photo").boundingBox(); const vh = p.viewportSize().height;
      log(Math.abs(ph.height / vh - 0.34) < 0.01, `${tag}: photo is 34% of the screen`, (ph.height / vh).toFixed(3));
      // Collapsing bar: hidden at the top, shown after scrolling past the title
      const op = async () => Number(await p.getByTestId("country-bar").evaluate((el) => getComputedStyle(el).opacity));
      const o0 = await op(); await setScroll(p, Math.round(vh * 0.4)); const o1 = await op(); await setScroll(p, 0);
      log(o0 < 0.05 && o1 > 0.95, `${tag}: compact bar appears once the title scrolls under it`, `${o0} -> ${o1}`);
      // Last row is above the footer at the end of the scroll; hairline only while content is under the footer
      const line = async () => Number(await p.getByTestId("footer-hairline").evaluate((el) => getComputedStyle(el).opacity));
      const l0 = await line();
      await setScroll(p, 99999);
      const last = await p.getByTestId("q-docs").boundingBox(); const ft = await p.getByTestId("country-footer").boundingBox(); const l1 = await line();
      log(last.y + last.height <= ft.y, `${tag}: last row not hidden behind the footer`, `${Math.round(last.y + last.height)} <= ${Math.round(ft.y)}`);
      log(l0 > 0.95 && l1 < 0.05, `${tag}: footer hairline only while content is under it`, `${l0} -> ${l1}`);
      await setScroll(p, 0);
      // Tips: a row with a tip opens the sheet; the residence row has no chevron and no action
      log((await p.getByTestId("req-residencyCopy").getAttribute("role")) !== "button" && (await p.getByTestId("req-bankStatement").getAttribute("role")) !== "button", `${tag}: rows without a tip are not buttons`);
      if (cfg.lang === "en") {
        await p.getByTestId("req-passportCopy").click(); await p.waitForTimeout(700);
        const sheet = await p.getByTestId("req-sheet").innerText().catch(() => "");
        log(/3 months/.test(sheet), `${tag}: passport tip sheet`, sheet.slice(0, 60));
        await p.screenshot({ path: `${OUT}/${tag}-tip.jpg`, type: "jpeg", quality: 78 }); add(s.id, `${tag} tip`, [`${tag}-tip.jpg`]);
        await p.keyboard.press("Escape"); await p.getByRole("button", { name: "Close" }).last().click().catch(() => {}); await p.waitForTimeout(600);
      }
      if (s.funds) {
        const total = () => p.getByTestId("funds-total").getAttribute("aria-label");
        const t0 = await total(); await p.getByRole("button", { name: cfg.lang === "en" ? "More days" : "أيام أكثر" }).click({ force: true }); await p.waitForTimeout(200); const t1 = await total();
        log(cfg.lang !== "en" || (/450/.test(t0) && /495/.test(t1)), `${tag}: stepper 10 → 11 days updates the total (€450 → €495)`, `${t0} → ${t1}`);
        const role = await p.getByTestId("funds-stepper").getAttribute("role");
        log(role === "slider" || role === "adjustable", `${tag}: stepper is one adjustable element (VoiceOver swipe up/down)`, role);
      }
    }
    // Large text: nothing clipped horizontally, footer button still on screen
    if (cfg.big) {
      const over = await p.getByTestId("country-screen").evaluate((root) => [...root.querySelectorAll("div[dir], div")].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "hidden" && el.innerText && !el.querySelector("img")).length);
      log(over === 0, `${tag}: no text clipped sideways at the largest size`, `${over} clipped boxes`);
      const ft = await p.getByTestId("country-footer").boundingBox(); log(ft.y + ft.height <= p.viewportSize().height + 1 && ft.height < p.viewportSize().height / 3, `${tag}: footer stays on screen and tappable`, `${Math.round(ft.height)}pt`);
    }
    await p.evaluate(() => document.activeElement?.blur()); // no web focus ring left from the checks above
    add(s.id, tag, await shoot(p, tag));
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(`${OUT}/shots.json`, JSON.stringify(sheets, null, 1));
console.log(`${fails ? "FAILED" : "ALL PASS"} (${fails} failed)`);
process.exit(fails ? 1 : 0);
