// Date DISPLAY follows the phone's locale (expo-localization): day/month order, month names and the first day of the
// week. Stored values never change: always "YYYY-MM-DD" (lib/dates.ts), the website's format.
import { useMemo } from "react";
import { getCalendars, getLocales } from "expo-localization";
import { useT } from "./i18n";
import { dateLocaleTag, fromIso, type IsoDate } from "./dates";

export function useDateLocale() {
  const { lang } = useT();
  return useMemo(() => {
    let tag = "en-GB", firstWeekday = 2; // Monday; Gregorian fallback when the module is unavailable (tests, old web)
    try {
      const l = getLocales()[0]; tag = dateLocaleTag(lang, l?.languageTag, l?.regionCode);
      const fw = getCalendars()[0]?.firstWeekday; if (fw && fw >= 1 && fw <= 7) firstWeekday = fw;
    } catch { tag = dateLocaleTag(lang); }
    const make = (o: Intl.DateTimeFormatOptions) => { try { return new Intl.DateTimeFormat(tag, o); } catch { return new Intl.DateTimeFormat("en-GB", o); } };
    const long = make({ day: "numeric", month: "long", year: "numeric" });
    const medium = make({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const short = make({ weekday: "short", day: "numeric", month: "short" });
    const full = make({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const month = make({ month: "long", year: "numeric" });
    const wd = make({ weekday: "narrow" }); const wdLong = make({ weekday: "long" });
    const num = make({ day: "numeric" });
    // 2023-01-01 was a Sunday: index 0 = Sunday … 6 = Saturday.
    const weekdays = Array.from({ length: 7 }, (_, i) => ({ narrow: wd.format(fromIso(`2023-01-0${i + 1}`)), long: wdLong.format(fromIso(`2023-01-0${i + 1}`)) }));
    const f = (fmt: Intl.DateTimeFormat) => (s?: IsoDate | null) => (s ? fmt.format(fromIso(s)) : "");
    return { tag, firstWeekday, long: f(long), medium: f(medium), short: f(short), full: f(full), day: f(num), month: (ym: string) => month.format(fromIso(`${ym}-01`)), weekdays };
  }, [lang]);
}
