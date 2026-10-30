/**
 * Family trips: applications of one account that share the destination and both travel dates are one trip
 * (the dashboard's switcher groups them and the case page lists the other travellers). Matching by fields is
 * reliable here because the dates are exact calendar days chosen in the wizard; applications without dates never
 * group. Unpaid drafts and closed cases stay on their own.
 */
type TripApp = {
  id?: string | null
  email?: string | null
  destination_country?: string | null
  entry_date?: string | null
  exit_date?: string | null
  travel_start_date?: string | null
  travel_end_date?: string | null
  payment_status?: string | null
  application_status?: string | null
}

const day = (v?: string | null) => (v ?? "").slice(0, 10)

export function tripKey(app: TripApp): string | null {
  const status = (app.application_status ?? "").toLowerCase()
  const paid = ["paid", "completed"].includes((app.payment_status ?? "").toLowerCase())
  if (!paid || status === "cancelled" || status === "rejected") return null
  const start = day(app.entry_date || app.travel_start_date)
  const end = day(app.exit_date || app.travel_end_date)
  const country = (app.destination_country ?? "").trim().toLowerCase()
  const email = (app.email ?? "").trim().toLowerCase()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !country || !email) return null
  return `${email}|${country}|${start}|${end}`
}

export type SwitcherEntry<T> = { kind: "single"; app: T } | { kind: "trip"; key: string; apps: T[] }

/** The switcher's entries in the original order: a trip appears where its first application was. */
export function groupTrips<T extends TripApp>(apps: T[]): SwitcherEntry<T>[] {
  const byKey = new Map<string, T[]>()
  for (const app of apps) {
    const key = tripKey(app)
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), app])
  }
  const seen = new Set<string>()
  const out: SwitcherEntry<T>[] = []
  for (const app of apps) {
    const key = tripKey(app)
    const group = key ? byKey.get(key)! : null
    if (!key || !group || group.length < 2) out.push({ kind: "single", app })
    else if (!seen.has(key)) {
      seen.add(key)
      out.push({ kind: "trip", key, apps: group })
    }
  }
  return out
}

/** The other applications travelling with this one (empty when it is not part of a trip). */
export function tripMates<T extends TripApp>(app: T, apps: T[]): T[] {
  const key = tripKey(app)
  if (!key) return []
  const group = apps.filter((a) => tripKey(a) === key)
  return group.length > 1 ? group : []
}
