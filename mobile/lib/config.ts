// Single source of truth for the official website. Every website link, payment return URL,
// auth email redirect and share link in the app is built from SITE_URL (never localhost / vercel.app).
const OFFICIAL = "https://www.ezvisa.net";
const fromEnv = (process.env.EXPO_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
export const SITE_URL = /^https:\/\/(www\.)?ezvisa\.net$/.test(fromEnv) ? fromEnv.replace("://ezvisa.net", "://www.ezvisa.net") : OFFICIAL;
/** @deprecated use SITE_URL */
export const WEB_URL = SITE_URL;
export const siteUrl = (path = "/") => SITE_URL + (path.startsWith("/") ? path : `/${path}`);

// Live website database (Supabase project ezvisa-uae, ref dravvaykssrbktztmrlj). Publishable/anon key only.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
export const SUPABASE_ENABLED = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
export const WHATSAPP = "971547109533";
export const EMAIL = "support@ezvisa.net";

/** Trip plan (app/trip/[id].tsx): hidden for now at the owner's request; true brings the row back on the application page. */
export const SHOW_TRIP_PLAN = false;
