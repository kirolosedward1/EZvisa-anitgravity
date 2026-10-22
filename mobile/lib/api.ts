import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { siteUrl, WHATSAPP, EMAIL } from "./config";

const sheet = { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, controlsColor: "#0436DC" } as const;
export const openWeb = (path: string) => WebBrowser.openBrowserAsync(siteUrl(path), { ...sheet, dismissButtonStyle: "close" });
export const shareUrl = (path = "/") => siteUrl(path);
export const whatsapp = (msg = "Hi EZvisa, I need help with my Schengen visa.") =>
  Linking.openURL(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`);
export const email = async () => {
  const { lastCrash } = require("./crash") as typeof import("./crash"); const c = await lastCrash();
  const body = c ? `\n\n---\nApp error (${new Date(c.at).toISOString()}): ${c.message}` : "";
  return Linking.openURL(`mailto:${EMAIL}?subject=EZvisa%20enquiry${body ? `&body=${encodeURIComponent(body)}` : ""}`);
};

export type { WizardForm as ApplicationForm } from "./wizard";
