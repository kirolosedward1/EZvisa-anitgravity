// Popup sign-in (components/auth/google-popup-sign-in.tsx). The OAuth callback lands the popup on POPUP_DONE_PATH,
// which announces POPUP_SIGNED_IN to the window that opened it and closes.

export const POPUP_DONE_PATH = "/auth/popup-done"
export const POPUP_SIGNED_IN = "ezvisa-popup-signed-in"

/** The popup landing, with or without the Arabic prefix and any query. */
export function isPopupLanding(path: string): boolean {
  const pathname = path.split(/[?#]/)[0]
  return pathname === POPUP_DONE_PATH || pathname === `/ar${POPUP_DONE_PATH}`
}
