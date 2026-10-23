import crypto from "crypto"

/** Constant-time check of an `Authorization: Bearer <secret>` header. False when the secret is not configured. */
export function hasBearerSecret(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false
  const a = crypto.createHash("sha256").update(authHeader).digest()
  const b = crypto.createHash("sha256").update(`Bearer ${secret}`).digest()
  return crypto.timingSafeEqual(a, b)
}
