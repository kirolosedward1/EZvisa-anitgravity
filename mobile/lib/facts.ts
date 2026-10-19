// Destination quick facts for the 29 Schengen countries. Static and verified on 19 Oct 2026:
//  - Plug types and voltage: Wikipedia "Mains electricity by country" (which cites IEC World Plugs, iec.ch/world-plugs).
//    The UAE uses type G, so every destination except Malta needs an adapter for UAE plugs.
//  - Currency: ISO 4217 / European Central Bank euro area list. Bulgaria uses the euro since 1 Jan 2026
//    (Council Decision (EU) 2025/1407; the lev stopped being legal tender on 1 Feb 2026).
//  - Emergency number: 112 works in all EU/EEA countries and Switzerland (EU Directive 2018/1972 art. 109; EEA/CH adopted 112).
//  - Time zone: IANA tz database (capital city zone; Spain's Canary Islands and Portugal's Azores/Madeira differ).
export type Facts = { currency: string; currencyName: string; tz: string; plugs: string; volts: string; emergency: string };
const EUR = { currency: "EUR", currencyName: "Euro" };
export const FACTS: Record<string, Facts> = {
  Austria: { ...EUR, tz: "Europe/Vienna", plugs: "C, F", volts: "230 V", emergency: "112" },
  Belgium: { ...EUR, tz: "Europe/Brussels", plugs: "C, E", volts: "230 V", emergency: "112" },
  Bulgaria: { ...EUR, tz: "Europe/Sofia", plugs: "C, F", volts: "230 V", emergency: "112" },
  Croatia: { ...EUR, tz: "Europe/Zagreb", plugs: "C, F", volts: "230 V", emergency: "112" },
  "Czech Republic": { currency: "CZK", currencyName: "Czech koruna", tz: "Europe/Prague", plugs: "C, E", volts: "230 V", emergency: "112" },
  Denmark: { currency: "DKK", currencyName: "Danish krone", tz: "Europe/Copenhagen", plugs: "C, E, F, K", volts: "230 V", emergency: "112" },
  Estonia: { ...EUR, tz: "Europe/Tallinn", plugs: "C, F", volts: "230 V", emergency: "112" },
  Finland: { ...EUR, tz: "Europe/Helsinki", plugs: "C, F", volts: "230 V", emergency: "112" },
  France: { ...EUR, tz: "Europe/Paris", plugs: "C, E", volts: "230 V", emergency: "112" },
  Germany: { ...EUR, tz: "Europe/Berlin", plugs: "C, F", volts: "230 V", emergency: "112" },
  Greece: { ...EUR, tz: "Europe/Athens", plugs: "C, F", volts: "230 V", emergency: "112" },
  Hungary: { currency: "HUF", currencyName: "Hungarian forint", tz: "Europe/Budapest", plugs: "C, F", volts: "230 V", emergency: "112" },
  Iceland: { currency: "ISK", currencyName: "Icelandic króna", tz: "Atlantic/Reykjavik", plugs: "C, F", volts: "230 V", emergency: "112" },
  Italy: { ...EUR, tz: "Europe/Rome", plugs: "C, F, L", volts: "230 V", emergency: "112" },
  Latvia: { ...EUR, tz: "Europe/Riga", plugs: "C, F", volts: "230 V", emergency: "112" },
  Liechtenstein: { currency: "CHF", currencyName: "Swiss franc", tz: "Europe/Vaduz", plugs: "C, J", volts: "230 V", emergency: "112" },
  Lithuania: { ...EUR, tz: "Europe/Vilnius", plugs: "C, F", volts: "230 V", emergency: "112" },
  Luxembourg: { ...EUR, tz: "Europe/Luxembourg", plugs: "C, F", volts: "230 V", emergency: "112" },
  Malta: { ...EUR, tz: "Europe/Malta", plugs: "G", volts: "230 V", emergency: "112" },
  Netherlands: { ...EUR, tz: "Europe/Amsterdam", plugs: "C, F", volts: "230 V", emergency: "112" },
  Norway: { currency: "NOK", currencyName: "Norwegian krone", tz: "Europe/Oslo", plugs: "C, F", volts: "230 V", emergency: "112" },
  Poland: { currency: "PLN", currencyName: "Polish złoty", tz: "Europe/Warsaw", plugs: "C, E", volts: "230 V", emergency: "112" },
  Portugal: { ...EUR, tz: "Europe/Lisbon", plugs: "C, E, F", volts: "230 V", emergency: "112" },
  Romania: { currency: "RON", currencyName: "Romanian leu", tz: "Europe/Bucharest", plugs: "C, F", volts: "230 V", emergency: "112" },
  Slovakia: { ...EUR, tz: "Europe/Bratislava", plugs: "C, E, F", volts: "230 V", emergency: "112" },
  Slovenia: { ...EUR, tz: "Europe/Ljubljana", plugs: "C, F", volts: "230 V", emergency: "112" },
  Spain: { ...EUR, tz: "Europe/Madrid", plugs: "C, F", volts: "230 V", emergency: "112" },
  Sweden: { currency: "SEK", currencyName: "Swedish krona", tz: "Europe/Stockholm", plugs: "C, F", volts: "230 V", emergency: "112" },
  Switzerland: { currency: "CHF", currencyName: "Swiss franc", tz: "Europe/Zurich", plugs: "C, J", volts: "230 V", emergency: "112" },
};
export const UAE_PLUG = "G";
/** Local time now in the destination (device Intl; null if the engine can't format time zones). */
export function localTime(tz: string, locale = "en-GB"): string | null {
  try { return new Date().toLocaleTimeString(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit" }); } catch { return null; }
}
/** Hours ahead/behind Dubai (UTC+4, no DST) right now. */
export function diffFromUae(tz: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "numeric", hour12: false, timeZoneName: "shortOffset" }).formatToParts(new Date());
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? ""; const m = off.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!m) return off === "GMT" ? -4 : null;
    return Number(m[1]) + (m[2] ? Math.sign(Number(m[1])) * Number(m[2]) / 60 : 0) - 4;
  } catch { return null; }
}
