// Universal links / Android App Links for the EZvisa app (bundle and package net.ezvisa.app): these website paths
// open the app when it is installed; the app maps them to its screens (mobile/lib/linkRoute.ts on mobile-app).
// Served only once the owner sets the identifiers on Vercel, so nothing changes until then:
//   APPLE_TEAM_ID        Apple Developer Team ID (10 characters)
//   ANDROID_CERT_SHA256  SHA-256 fingerprint(s) of the app signing certificate, comma-separated (EAS credentials / Play Console)
// /app-return is left out on purpose: the checkout returns through it inside the app's own browser session.
export const APP_ID = "net.ezvisa.app"
export const APP_LINK_PATHS = ["/continue/*", "/dashboard", "/dashboard/*", "/track/*", "/documents/required-documents-*", "/destinations/*"]

export const appleTeamId = () => (process.env.APPLE_TEAM_ID || "").trim()
export const androidFingerprints = () =>
  (process.env.ANDROID_CERT_SHA256 || "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s))
