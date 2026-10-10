/**
 * Deep links the payment return page may redirect to. Restricting the scheme
 * stops /api/mobile/v1/payment-return being used as an open redirect.
 *   ezvisa://…  installed app (scheme in mobile/app.json)
 *   exp://…     Expo Go during development
 */
const ALLOWED_SCHEMES = ["ezvisa:", "exp:", "exps:"]

export function isAllowedAppReturnUrl(value: string): boolean {
  if (value.length > 500) return false
  try {
    return ALLOWED_SCHEMES.includes(new URL(value).protocol)
  } catch {
    return false
  }
}
