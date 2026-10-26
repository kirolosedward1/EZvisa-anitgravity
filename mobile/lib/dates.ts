// Date formatting shared by the wizard and the application screens.
// Arabic always uses the Western-digit locale from the traveller sheet (`12 مايو 1990`).
// English card and detail dates stay on the device locale, so a US phone still reads "Dec 1".

export const AR_DATE_LOCALE = "ar-u-nu-latn";

const noon = (s: string) => new Date(s.slice(0, 10) + "T12:00:00");

/** Day, long month, year. Empty when there is no date. English is en-GB, matching the saved-traveller list. */
export const formatListDate = (s: string, lang: string) =>
  s ? noon(s).toLocaleDateString(lang === "ar" ? AR_DATE_LOCALE : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

/** One trip day, no year. Arabic is the long month with Western digits (`1 ديسمبر`). English is the device short month. */
export const formatDay = (s?: string | null, lang = "en") =>
  s ? noon(s).toLocaleDateString(lang === "ar" ? AR_DATE_LOCALE : undefined, lang === "ar" ? { day: "numeric", month: "long" } : { day: "numeric", month: "short" }) : "";

/** "1 ديسمبر – 10 ديسمبر". One date when the return is missing or the same day. */
export const formatTripRange = (start?: string | null, end?: string | null, lang = "en") => {
  if (!start) return "";
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDay(start, lang);
  return `${formatDay(start, lang)} – ${formatDay(end, lang)}`;
};

const instant = (s: string) => new Date(s.length === 10 ? s + "T12:00:00" : s);

/** A single detail date, with the year. Date-only strings stay at noon; timestamps keep their clock time. Missing → em dash. */
export const formatDetailDate = (s?: string | null, lang = "en") => {
  if (!s) return "—";
  const opts = lang === "ar"
    ? { day: "numeric" as const, month: "long" as const, year: "numeric" as const }
    : { day: "numeric" as const, month: "short" as const, year: "numeric" as const };
  return instant(s).toLocaleDateString(lang === "ar" ? AR_DATE_LOCALE : undefined, opts);
};

/** Year once when both dates share it (`1 ديسمبر – 10 ديسمبر 2026`); both years when they don't. */
export const formatDetailRange = (start: string, end?: string | null, lang = "en") => {
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDetailDate(start, lang);
  const x = noon(start);
  const y = noon(end);
  if (x.getFullYear() !== y.getFullYear()) return `${formatDetailDate(start, lang)} – ${formatDetailDate(end, lang)}`;
  return `${formatDay(start, lang)} – ${formatDetailDate(end, lang)}`;
};

/** Appointment card. English keeps the device long month; Arabic uses the Western-digit locale. */
export const formatAppointment = (iso: string, lang = "en") =>
  new Date(iso).toLocaleString(lang === "ar" ? AR_DATE_LOCALE : undefined, { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Timeline stamp. Arabic uses the same Western-digit locale; a scheduled step adds the weekday. */
export const formatTimelineStamp = (iso: string, lang = "en", scheduled = false) => {
  const opts = {
    day: "numeric" as const,
    month: (lang === "ar" ? "long" : "short") as "long" | "short",
    hour: "2-digit" as const,
    minute: "2-digit" as const,
    ...(scheduled ? { weekday: "short" as const } : {}),
  };
  return new Date(iso).toLocaleString(lang === "ar" ? AR_DATE_LOCALE : undefined, opts);
};
