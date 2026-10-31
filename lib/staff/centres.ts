/** Visa centres offered on the staff appointment form (Settings board, Visa centres). */
export const CENTRES = [
  { name: "VFS Global Dubai, Wafi Mall", short: "VFS Dubai", match: ["vfs", "dubai"] },
  { name: "TLScontact Dubai", short: "TLS Dubai", match: ["tls"] },
  { name: "VFS Global Abu Dhabi", short: "VFS Abu Dhabi", match: ["vfs", "abu dhabi"] },
  { name: "BLS International Dubai", short: "BLS Dubai", match: ["bls"] },
] as const

/** Whether a saved centre (free text from the customer or staff) is the filtered centre. */
export function centreMatches(saved: string | null | undefined, short: string, list: readonly { short: string; match: readonly string[] }[] = CENTRES): boolean {
  const c = list.find((x) => x.short === short)
  if (!c) return true
  const s = (saved ?? "").toLowerCase()
  return c.match.every((k) => s.includes(k))
}

export function centreTone(centre: string | null | undefined): "tls" | "vfs" | "other" {
  const c = (centre ?? "").toLowerCase()
  return c.includes("tls") ? "tls" : c.includes("vfs") ? "vfs" : "other"
}
