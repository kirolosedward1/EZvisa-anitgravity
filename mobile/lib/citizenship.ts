// Citizenship is stored as ISO 3166-1 alpha-2 (e.g. "IN"). Older accounts saved the country name: both are read.
// Converted on display only; the ISO code is written when the user saves the field themselves.
import { WORLD } from "./world";
export const citizenshipIso = (v?: string | null) => { const s = (v ?? "").trim(); if (!s) return ""; if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase(); return WORLD.find((w) => w.name.toLowerCase() === s.toLowerCase())?.iso2 ?? s; };
export const citizenshipName = (v?: string | null) => { const iso = citizenshipIso(v); return WORLD.find((w) => w.iso2 === iso)?.name ?? (v ?? ""); };
