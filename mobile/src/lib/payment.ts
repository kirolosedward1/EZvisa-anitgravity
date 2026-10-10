import * as Linking from "expo-linking"
import * as WebBrowser from "expo-web-browser"

import { api, type Application } from "./api"

/**
 * Opens Ziina checkout in an in-app browser session. Ziina redirects to the
 * site's /api/mobile/v1/payment-return, which bounces back to this deep link
 * and closes the sheet. The real status always comes from the API, never
 * from the redirect.
 */
export async function payForApplication(applicationId: string): Promise<{ application: Application; dismissed: boolean }> {
  const returnUrl = Linking.createURL("payment-return") // ezvisa://payment-return (exp://…/--/payment-return in Expo Go)
  const { checkoutUrl } = await api.startPayment(applicationId, returnUrl)
  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl)
  const { application } = await api.refreshPayment(applicationId)
  return { application, dismissed: result.type !== "success" }
}
