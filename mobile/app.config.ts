// Dynamic layer over app.json (Expo reads app.json first and hands it in as `config`).
//
// Over-the-air updates: Expo Go only loads updates whose runtime is the SDK ("exposdk:58.0.0"), so the preview
// channel (Expo Go testing) keeps the sdkVersion policy. Store builds (APP_VARIANT=production, set by the EAS
// "production" profile and by `eas update --channel production`) use the fingerprint policy: an update reaches only
// builds whose native code it matches, so a JS update can never call a native module the installed build lacks.
//
// Universal links: https://www.ezvisa.net/... opens the app when it is installed (the website serves
// /.well-known/apple-app-site-association and assetlinks.json once APPLE_TEAM_ID / ANDROID_CERT_SHA256 are set
// on Vercel). Paths are mapped to app screens in app/+native-intent.tsx.
import type { ConfigContext, ExpoConfig } from "expo/config";

const PROD = process.env.APP_VARIANT === "production";
// /app-return stays out: the checkout returns through it inside the in-app browser session.
const LINK_PATHS = ["/continue", "/dashboard", "/track", "/documents/required-documents", "/destinations/", "/ar/continue", "/ar/dashboard", "/ar/track", "/ar/documents/required-documents", "/ar/destinations/"];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  runtimeVersion: PROD ? { policy: "fingerprint" } : config.runtimeVersion,
  extra: { ...config.extra, variant: PROD ? "production" : "preview" }, // crash reports say which build they came from
  ios: { ...config.ios, associatedDomains: ["applinks:www.ezvisa.net", "applinks:ezvisa.net"] },
  android: {
    ...config.android,
    intentFilters: [{
      action: "VIEW", autoVerify: true, category: ["BROWSABLE", "DEFAULT"],
      data: ["www.ezvisa.net", "ezvisa.net"].flatMap((host) => LINK_PATHS.map((pathPrefix) => ({ scheme: "https", host, pathPrefix }))),
    }],
  },
});
