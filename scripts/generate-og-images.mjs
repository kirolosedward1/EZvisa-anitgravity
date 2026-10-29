// Renders the default 1200×630 social share images (public/og/ezvisa-og.png and ezvisa-og-ar.png).
// Run: node scripts/generate-og-images.mjs   (needs Playwright with Chromium and network access to Google Fonts)
import { createRequire } from "node:module"
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

// Playwright is not a project dependency; require() also finds a global install via NODE_PATH.
const { chromium } = createRequire(import.meta.url)("playwright")

const root = resolve(import.meta.dirname, "..")
const outDir = join(root, "public/og")
mkdirSync(outDir, { recursive: true })

const logo = pathToFileURL(join(root, "public/logo-main.png")).href
const globi = pathToFileURL(join(root, "public/globi/travel.webm")).href

const CARDS = [
  {
    file: "ezvisa-og.png",
    lang: "en",
    heading: "Your Schengen visa,<br><em>made simple.</em>",
    body: "Your visa file prepared by specialists for UAE residents: form, cover letter, itinerary, flight and hotel reservations.",
    facts: ["Ready in 1–2 days", "249 AED", "29 countries"],
  },
  {
    file: "ezvisa-og-ar.png",
    lang: "ar",
    heading: "تأشيرة شنغن،<br><em>ببساطة.</em>",
    body: "ملف تأشيرتك يجهّزه مختصون للمقيمين في الإمارات: النموذج وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق.",
    facts: ["جاهز خلال 1–2 يوم", "249 درهمًا", "29 دولة"],
  },
]

function html(card) {
  const ar = card.lang === "ar"
  return `<!doctype html>
<html lang="${card.lang}" dir="${ar ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,500;0,700;1,500&family=IBM+Plex+Sans+Arabic:wght@500;600&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #ffffff; color: #102347;
    font-family: ${ar ? "'IBM Plex Sans Arabic', " : ""}'DM Sans', sans-serif; }
  .card { position: relative; display: grid; grid-template-columns: 1fr 430px; height: 100%; }
  .copy { padding: 72px ${ar ? "80px 0 0" : "0 0 80px"}; display: flex; flex-direction: column; }
  .logo { height: 54px; width: auto; align-self: flex-start; }
  h1 { margin-top: 56px; font-size: 68px; line-height: 1.06; font-weight: ${ar ? 600 : 500}; letter-spacing: ${ar ? "0" : "-0.02em"}; }
  h1 em { color: #0436dc; font-style: ${ar ? "normal" : "italic"}; }
  p { margin-top: 26px; max-width: 600px; font-size: 25px; line-height: 1.45; color: #52617a; }
  ul { margin-top: auto; margin-bottom: 64px; display: flex; gap: 12px; list-style: none; padding: 0; }
  li { padding: 10px 18px; border-radius: 999px; background: #edf4ff; color: #0436dc; font-size: 22px; font-weight: ${ar ? 600 : 500}; }
  .art { position: relative; background: #edf4ff; display: grid; place-items: center; }
  video { width: 400px; height: 400px; object-fit: contain; }
  .domain { position: absolute; bottom: 34px; ${ar ? "left" : "right"}: 40px; font-size: 20px; color: #52617a; font-family: 'DM Sans', sans-serif; direction: ltr; }
</style>
</head>
<body>
  <div class="card">
    <div class="copy">
      <img class="logo" src="${logo}" alt="">
      <h1>${card.heading}</h1>
      <p>${card.body}</p>
      <ul>${card.facts.map((f) => `<li>${f}</li>`).join("")}</ul>
    </div>
    <div class="art">
      <video src="${globi}" muted playsinline preload="auto"></video>
      <span class="domain">www.ezvisa.net</span>
    </div>
  </div>
</body>
</html>`
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
const dir = mkdtempSync(join(tmpdir(), "ezvisa-og-"))

for (const card of CARDS) {
  const file = join(dir, `${card.lang}.html`)
  writeFileSync(file, html(card))
  await page.goto(pathToFileURL(file).href)
  await page.evaluate(() => document.fonts.ready)
  // Freeze Globi on a friendly frame of the transparent loop.
  await page.evaluate(
    () =>
      new Promise((done) => {
        const video = document.querySelector("video")
        const seek = () => {
          video.currentTime = 1.2
          video.addEventListener("seeked", () => done(), { once: true })
        }
        if (video.readyState >= 1) seek()
        else video.addEventListener("loadedmetadata", seek, { once: true })
      }),
  )
  await page.screenshot({ path: join(outDir, card.file), type: "png" })
  console.log(`wrote public/og/${card.file}`)
}

await browser.close()
