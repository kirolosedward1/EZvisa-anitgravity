// Startup / screen benchmark for the exported web build (react-native-web), CPU throttled to approximate a phone.
// Usage: npx expo export --platform web --output-dir dist && node scripts/bench-web.mjs dist <label> [runs]
// Needs Playwright + Chromium (PLAYWRIGHT_MODULE / CHROMIUM env vars; defaults match the Claude cloud container).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node-tools/node_modules/playwright/index.mjs");
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [dir, label, runsArg] = process.argv.slice(2);
const RUNS = Number(runsArg || 7);
const types = { ".js": "text/javascript", ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ttf": "font/ttf", ".json": "application/json", ".ico": "image/x-icon", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(dir, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const out = { startup: [], countries: [], detail: [], bytes: [] };
for (let i = 0; i < RUNS; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { try { localStorage.setItem("ezvisa.welcomed.v1", "1"); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  let bytes = 0; page.on("response", async (r) => { try { const b = await r.body(); bytes += b.length; } catch {} });
  const t0 = Date.now();
  await page.goto(base + "/", { waitUntil: "commit" });
  await page.waitForSelector('[data-testid="home-headline"], [data-testid="home-hero"]', { timeout: 60000 });
  await page.waitForSelector('[data-testid="boot-overlay"]', { state: "detached", timeout: 60000 });
  out.startup.push(Date.now() - t0);
  const t1 = Date.now();
  await page.goto(base + "/countries", { waitUntil: "commit" });
  await page.waitForSelector('[data-testid="countries-list"]', { timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="countries-list"] svg').length >= 29, null, { timeout: 60000 });
  out.countries.push(Date.now() - t1);
  const t2 = Date.now();
  await page.goto(base + "/country/spain", { waitUntil: "commit" });
  await page.waitForFunction(() => [...document.images].some((im) => /spain/.test(im.currentSrc || im.src) && im.complete && im.naturalWidth > 0)
    || [...document.querySelectorAll("[style*='spain']")].length > 0, null, { timeout: 60000 });
  out.detail.push(Date.now() - t2);
  out.bytes.push(bytes);
  await ctx.close();
}
await browser.close(); server.close();
const r = { label, runs: RUNS, startup_ms_median: med(out.startup), countries_ms_median: med(out.countries), detail_ms_median: med(out.detail), bytes_median: med(out.bytes), raw: out };
console.log(JSON.stringify(r, null, 1));
