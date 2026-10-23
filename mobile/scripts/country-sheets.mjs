// Contact sheets for scripts/country-shots.mjs output: one per scenario (each row = one width/theme/language/text
// size, scrolled top to bottom) and a before/after sheet. Usage: node scripts/country-sheets.mjs <shots dir>
import fs from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const DIR = path.resolve(process.argv[2]); const OUT = path.join(DIR, "sheets"); fs.mkdirSync(OUT, { recursive: true });
const shots = JSON.parse(fs.readFileSync(path.join(DIR, "shots.json"), "utf8"));
const before = fs.existsSync(path.join(DIR, "before.json")) ? JSON.parse(fs.readFileSync(path.join(DIR, "before.json"), "utf8")) : {};
const css = `body{margin:0;padding:24px;font:14px -apple-system,system-ui,sans-serif;background:#f2f2f7;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#555}
.row{margin-bottom:20px}.lab{font-weight:600;margin:0 0 6px}.strip{display:flex;gap:8px;align-items:flex-start}img{width:195px;border-radius:12px;border:1px solid #ddd}`;
const page = (title, note, rows) => `<!doctype html><meta charset="utf-8"><style>${css}</style><h1>${title}</h1><p>${note}</p>` +
  rows.map((r) => `<div class="row"><div class="lab">${r.label}</div><div class="strip">${r.files.map((f) => `<img src="../${f}">`).join("")}</div></div>`).join("");
const NOTE = {
  "italy": "Italy as shipped (signed out): hero, title, at a glance, what you'll need, visa centre, questions, footer. Proof of funds is hidden until its numbers are confirmed.",
  "italy-funds-preview": "Italy with the proof-of-funds section previewed (web preview flag only; hidden in the app until the numbers have a source).",
  "portugal-no-funds": "A country without funds data: no funds section, no estimate.",
  "malta-no-centre": "A country the website does not map to a visa centre: no centre row and no centre section.",
  "italy-draft": "Italy with a saved draft: card shows the draft, footer says Continue.",
  "italy-active": "Italy with an active (paid) case and an older draft: status, dates, 5-step progress, next action, See all; footer says View your application.",
};
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await b.newPage({ viewport: { width: 1900, height: 800 } });
const render = async (name, html) => { const f = path.join(OUT, `${name}.html`); fs.writeFileSync(f, html); await p.goto(`file://${f}`); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 80, fullPage: true }); fs.unlinkSync(f); };
for (const [id, rows] of Object.entries(shots)) await render(id, page(`Country screen v2 · ${id}`, NOTE[id] ?? "", rows));
if (Object.keys(before).length) {
  const after = shots.italy ?? [];
  const pick = (label) => after.find((r) => r.label === label);
  const rows = [];
  for (const [cfg, files] of Object.entries(before)) {
    const [w, scheme, lang] = cfg.split(" ");
    rows.push({ label: `Before · Italy ${cfg}`, files });
    const a = pick(`italy-${w}-${scheme}-${lang}`) ?? pick(`italy-${w}-light-${lang}`); // the app is light-only since v10.4
    if (a) rows.push({ label: `After · Italy ${a.label.replace(/^italy-/, "").replace(/-/g, " ")}`, files: a.files });
  }
  await render("before-after", page("Country screen: before / after", "Before: 44% photo, three tiles (90 days max, C Schengen, 24-48h processing), a fixed list with Travel insurance and Salary certificate / NOC for everyone, English only. After: see the rows below.", rows));
}
await b.close();
console.log(fs.readdirSync(OUT).join("\n"));
