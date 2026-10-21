import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { SITE_URL, siteUrl, WHATSAPP, EMAIL, PRICE_AED } from "./config";

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

/** Website price: 249 AED, doubled when the spouse travels (web components/apply/payment-step.tsx). */
export const priceFor = (spouse: boolean) => PRICE_AED * (spouse ? 2 : 1);

/** Same Ziina flow as the website: POST /api/create-payment (which also stores payment_id on the visa_applications row),
 *  then open redirect_url in the in-app browser. Return URLs are the website's own pages on SITE_URL. */
export async function startPayment(a: { id: string; destination_country: string | null; total_amount?: number }, spouse: boolean) {
  const success = new URL("/payment-success", SITE_URL);
  success.searchParams.set("appId", a.id);
  if (a.destination_country) success.searchParams.set("dest", a.destination_country);
  const amount = a.total_amount ?? priceFor(spouse);
  const r = await fetch(siteUrl("/api/create-payment"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId: a.id, amount, currency: "AED", success_url: success.toString(), cancel_url: siteUrl("/payment-failed"), test: false }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.redirect_url) {
    const e: any = new Error(r.status >= 500 ? "Online card payment isn't available right now. You can pay on WhatsApp and we'll send a secure link." : j.error || `Could not create the payment link (${r.status})`);
    e.fallbackWhatsApp = true; e.detail = j.error; throw e;
  }
  await WebBrowser.openBrowserAsync(j.redirect_url, { ...sheet, dismissButtonStyle: "done" });
  return { paymentId: String(j.id) };
}

/** Ziina status through the website's GET /api/check-payment?id=… (completed | pending | failed | …). */
export async function checkPayment(paymentId: string): Promise<string | null> {
  try {
    const r = await fetch(siteUrl(`/api/check-payment?id=${encodeURIComponent(paymentId)}`));
    const j: any = await r.json().catch(() => ({}));
    return r.ok && typeof j.status === "string" ? j.status : null;
  } catch { return null; }
}
