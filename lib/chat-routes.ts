/** Routes where the Crisp launcher must stay out of the way. /ar copies are included. */
export function suppressesChat(path: string | null | undefined): boolean {
  if (!path) return false
  const bare = path.split("?")[0].replace(/\/+$/, "") || "/"
  if (/\/apply(?:\/|$)|\/continue(?:\/|$)|\/payment-|\/checkout(?:\/|$)/.test(bare)) return true
  return /^(?:\/ar)?\/(?:login|signup|forgot-password|reset-password)$/.test(bare)
}
