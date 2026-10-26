/**
 * Sign in with Apple on the website.
 * Hidden unless NEXT_PUBLIC_APPLE_SIGNIN_ENABLED is exactly "true" (off when unset).
 * Next inlines this public variable into the client bundle at build time.
 */
export function appleSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED === "true"
}
