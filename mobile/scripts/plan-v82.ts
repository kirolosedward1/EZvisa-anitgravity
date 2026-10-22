// Deterministic itinerary checks + PDF HTML for both languages (no network, no DB).
// @ts-ignore node module in a node-only check
import fs from "fs";
declare const process: any;
import { generatePlan, planHtml } from "../lib/itinerary";
const a: any = { id: "x", reference: "EZ-TEST", destination_country: "France", additional_countries: [{ country: "Italy" }], entry_date: "2026-12-10", exit_date: "2026-12-20", countries: { name: "France" } };
const prefs: any = { cities: ["Paris", "Lyon", "Rome"], budget: "mid", who: "couple", interests: ["food", "culture", "nightlife"] };
let fail = 0; const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const p1 = generatePlan(a, prefs, "en"), p2 = generatePlan(a, prefs, "en");
const strip = (p: any) => JSON.stringify(p.days.map((d: any) => [d.n, d.date, d.city, d.title, d.items.map((i: any) => [i.time, i.text])]));
ok(strip(p1) === strip(p2), "same answers -> same plan (deterministic)");
ok(p1.days.length === 11, `11 days for 10-20 Dec (got ${p1.days.length})`);
ok(p1.label === "Ideas, not bookings", "labelled Ideas, not bookings");
ok(p1.days[0].date === "2026-12-10" && p1.days[10].date === "2026-12-20", "dates follow the application");
ok(new Set(p1.days.map((d) => d.city)).size === 3, "all 3 cities used");
ok(p1.days.every((d) => d.items.every((i) => i.time === "Evening" || !/bar|show|lounge|live music/i.test(i.text))), "nightlife only in the evening");
ok(!/€|AED|\$|\d{2}:\d{2}/.test(strip(p1)), "no prices or opening times");
const ar = generatePlan(a, prefs, "ar"); ok(/[\u0600-\u06FF]/.test(ar.days[1].items[0].text), "Arabic plan is in Arabic");
fs.writeFileSync("/tmp/plan-en.html", planHtml(a, p1, "en")); fs.writeFileSync("/tmp/plan-ar.html", planHtml(a, ar, "ar"));
ok(planHtml(a, ar, "ar").includes('dir="rtl"'), "Arabic PDF is RTL");
console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
