// Date formatting for Arabic application cards, detail and the timeline.
// Run: node --import ./scripts/ts-hooks.mjs scripts/dates.test.ts   (from mobile/, Node 22.18+)
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAppointment, formatDay, formatDetailDate, formatDetailRange, formatListDate, formatTimelineStamp, formatTripRange } from "../lib/dates";
import { AR } from "../lib/ar";
import { formatPayAmount, payActionCopy, PAY_AED } from "../lib/payLabel";

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);

const EASTERN = /[٠-٩]/;
const deviceDay = (s: string) => new Date(s + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
const deviceDetail = (s: string) => new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

test("traveller sheet date: Arabic long month, Western digits, English en-GB", () => {
  assert.equal(formatListDate("1990-05-12", "ar"), "12 مايو 1990");
  assert.equal(formatListDate("", "ar"), "");
  assert.equal(formatListDate("1990-05-12", "en"), "12 May 1990");
  assert.doesNotMatch(formatListDate("1990-05-12", "ar"), EASTERN);
});

test("application card range is Arabic with Western digits", () => {
  assert.equal(formatTripRange("2026-12-01", "2026-12-10", "ar"), "1 ديسمبر – 10 ديسمبر");
  assert.equal(formatDay("2026-12-01", "ar"), "1 ديسمبر");
  assert.equal(formatTripRange("2026-12-01", "2026-12-01", "ar"), "1 ديسمبر");
  assert.equal(formatTripRange("2026-12-01", null, "ar"), "1 ديسمبر");
  assert.equal(formatTripRange(null, "2026-12-10", "ar"), "");
  assert.equal(formatTripRange(undefined, undefined, "ar"), "");
  const ar = formatTripRange("2026-12-01", "2026-12-10", "ar");
  assert.doesNotMatch(ar, EASTERN);
  assert.doesNotMatch(ar, /Dec|January|ديسمبر\s*\d/);
});

test("English card range stays on the device short month", () => {
  assert.equal(formatTripRange("2026-12-01", "2026-12-10", "en"), `${deviceDay("2026-12-01")} – ${deviceDay("2026-12-10")}`);
  assert.equal(formatDay("2026-12-01", "en"), deviceDay("2026-12-01"));
  assert.equal(formatTripRange("2026-12-01", "2026-12-01", "en"), deviceDay("2026-12-01"));
});

test("application detail keeps one year when both dates share it", () => {
  assert.equal(formatDetailRange("2026-12-01", "2026-12-10", "ar"), "1 ديسمبر – 10 ديسمبر 2026");
  assert.equal(formatDetailRange("2026-12-01", "2027-01-10", "ar"), "1 ديسمبر 2026 – 10 يناير 2027");
  assert.equal(formatDetailRange("2026-12-01", "2026-12-01", "ar"), "1 ديسمبر 2026");
  assert.equal(formatDetailRange("2026-12-01", null, "ar"), "1 ديسمبر 2026");
  assert.equal(formatDetailDate(null, "ar"), "—");
  assert.equal(formatDetailDate("", "en"), "—");
  assert.doesNotMatch(formatDetailRange("2026-12-01", "2027-01-10", "ar"), EASTERN);
  assert.equal(formatDetailRange("2026-12-01", "2026-12-10", "en"), `${deviceDay("2026-12-01")} – ${deviceDetail("2026-12-10")}`);
  assert.equal(formatDetailRange("2026-12-01", "2027-01-10", "en"), `${deviceDetail("2026-12-01")} – ${deviceDetail("2027-01-10")}`);
});

test("a paid-at timestamp is not moved to noon", () => {
  const iso = "2026-12-01T00:30:00.000Z";
  assert.equal(formatDetailDate(iso, "en"), deviceDetail(iso));
  assert.equal(formatDetailDate(iso, "ar"), new Date(iso).toLocaleDateString("ar-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }));
  assert.doesNotMatch(formatDetailDate(iso, "ar"), EASTERN);
});

test("timeline stamps follow the app language", () => {
  const iso = "2026-12-01T09:30:00";
  const en = { day: "numeric" as const, month: "short" as const, hour: "2-digit" as const, minute: "2-digit" as const };
  assert.equal(formatTimelineStamp(iso, "en"), new Date(iso).toLocaleString(undefined, en));
  assert.equal(formatTimelineStamp(iso, "en", true), new Date(iso).toLocaleString(undefined, { weekday: "short", ...en }));
  const ar = formatTimelineStamp(iso, "ar");
  const arAppt = formatTimelineStamp(iso, "ar", true);
  assert.equal(ar, new Date(iso).toLocaleString("ar-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));
  assert.equal(arAppt, new Date(iso).toLocaleString("ar-u-nu-latn", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));
  assert.match(ar, /ديسمبر/);
  assert.match(arAppt, /ديسمبر/);
  assert.doesNotMatch(ar, EASTERN);
  assert.doesNotMatch(ar, /\bDec\b|AM|PM/);
  assert.doesNotMatch(arAppt, EASTERN);
});

test("Arabic pay label uses tanween and Western digits", () => {
  assert.equal(formatPayAmount(249), "249");
  assert.equal(formatPayAmount(498), "498");
  const one = payActionCopy(249, "AED");
  const two = payActionCopy(498, "AED");
  assert.equal(one.title, PAY_AED);
  assert.equal(one.cta, PAY_AED);
  assert.equal(fill(AR[PAY_AED], one.vars!), "ادفع 249 درهمًا");
  assert.equal(fill(AR[PAY_AED], two.vars!), "ادفع 498 درهمًا");
  assert.equal(AR[PAY_AED].includes("\u064b"), true);
  assert.doesNotMatch(fill(AR[PAY_AED], one.vars!), EASTERN);
  assert.equal(payActionCopy(null, "AED").title, "Pay securely");
});

test("processing time is not a ranged يوم and uses Western digits", () => {
  const compact = AR["Your file is ready in 1–2 days"];
  const roomy = AR["Your file is ready in a day or two"];
  const glance = AR["We prepare your file in 1–2 days. Embassy fees are paid at your appointment."];
  assert.equal(compact, "ملفك جاهز خلال 1–2 أيام عمل");
  assert.equal(roomy, "ملفك جاهز خلال يوم إلى يومين");
  assert.match(glance, /يوم إلى يومين/);
  for (const s of [compact, roomy, glance]) {
    assert.doesNotMatch(s, EASTERN);
    assert.doesNotMatch(s, /[0-9]\s*[–-]\s*[0-9]\s*يوم(?!ين)/);
  }
});

test("appointment card uses a long month and Western digits in Arabic", () => {
  const iso = "2026-12-01T09:30:00";
  const opts = { weekday: "short" as const, day: "numeric" as const, month: "long" as const, hour: "2-digit" as const, minute: "2-digit" as const };
  assert.equal(formatAppointment(iso, "en"), new Date(iso).toLocaleString(undefined, opts));
  assert.equal(formatAppointment(iso, "ar"), new Date(iso).toLocaleString("ar-u-nu-latn", opts));
  assert.match(formatAppointment(iso, "ar"), /ديسمبر/);
  assert.doesNotMatch(formatAppointment(iso, "ar"), EASTERN);
});
