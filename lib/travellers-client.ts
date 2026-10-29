"use client"

// Saved travellers in the browser: the signed-in customer's list from GET /api/travellers (lib/travellers.ts) and the
// mapping onto the website wizard's form, whose nationality is an ISO code and whose phone is always "+971 …".
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient, supabasePublicEnv } from "@/lib/supabase/client"
import { toCitizenshipIso } from "@/lib/nationalities"
import { applyTraveller, type Traveller, type TravellerDetails } from "@/lib/shared/wizard-contract"

/** The customer explicitly chose "Someone else": no preselection on this form again. */
export const TRAVELLER_NONE = "none"

export async function fetchTravellers(signal?: AbortSignal): Promise<Traveller[]> {
  const res = await fetch("/api/travellers", { credentials: "same-origin", cache: "no-store", signal })
  if (res.status === 401) return []
  if (!res.ok) throw new Error("Could not load saved travellers")
  const json = (await res.json()) as { travellers?: Traveller[] }
  return Array.isArray(json.travellers) ? json.travellers : []
}

/** The signed-in customer's travellers (empty while loading, signed out, or when there are none). */
export function useTravellers() {
  const [travellers, setTravellers] = useState<Traveller[]>([])
  const [email, setEmail] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])
  useEffect(() => {
    if (!supabasePublicEnv().configured) return
    let previousUser: string | null | undefined
    const { data } = createBrowserClient().auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null
      if (userId === previousUser) return
      previousUser = userId
      // Clear the previous account immediately. Fetch outside the auth callback to avoid auth-lock deadlocks.
      setTravellers([])
      setEmail(null)
      setLoaded(false)
      refresh()
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])
  useEffect(() => {
    const demo = /(?:^|;\s*)ez_demo_active=1(?:;|$)/.test(document.cookie)
    const configured = supabasePublicEnv().configured
    if (!configured && !demo) {
      setLoaded(true)
      return
    }
    const controller = new AbortController()
    let alive = true
    setLoaded(false)
    setError(false)
    ;(async () => {
      try {
        const user = configured ? (await createBrowserClient().auth.getUser()).data.user : null
        const who = user?.email?.toLowerCase() ?? null
        if (!alive) return
        setEmail(who)
        if (who || demo) {
          const list = await fetchTravellers(controller.signal)
          if (alive) setTravellers(list)
        } else setTravellers([])
      } catch {
        if (alive) {
          setTravellers([])
          setError(true)
        }
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
      controller.abort()
    }
  }, [tick])
  return { travellers, email, loaded, error, refresh }
}

type WebForm = { nationality: string; phone: string; travellerId?: string }

/**
 * Fill the website wizard form from a saved traveller: the shared applyTraveller(), then the website's own shapes
 * (nationality as ISO code; phone only when it is a UAE number, the form shows a fixed +971 prefix).
 */
export function applyTravellerToWebForm<T extends WebForm>(form: T, t: Traveller): T {
  // A saved profile can be incomplete. Never carry another person's passport or contact details into it.
  const clean = { ...form, firstName: "", lastName: "", dateOfBirth: "", passportNumber: "", passportExpiry: "", hasValidPassport: undefined, phone: "", phoneLocal: "", phoneCountry: "AE", cityOfResidence: "" }
  const next = applyTraveller(clean as T & Partial<TravellerDetails>, { ...t, phone: /^\+?971/.test((t.phone ?? "").replace(/\s/g, "")) ? t.phone : "" }) as T
  const iso = toCitizenshipIso(t.nationality)
  return { ...next, nationality: iso || form.nationality, travellerId: t.id }
}

/** Nothing identifying typed yet (the same rule the app uses before prefilling). */
export const isFreshTravellerForm = (f: { firstName?: string; lastName?: string; dateOfBirth?: string; passportNumber?: string }) =>
  !["firstName", "lastName", "dateOfBirth", "passportNumber"].some((k) => !!(f as Record<string, string | undefined>)[k]?.trim())

/** Tell the server a saved traveller was used (last_used_at), best effort. */
export function markTravellerUsed(id: string) {
  if (!id || id === TRAVELLER_NONE) return
  fetch(`/api/travellers/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ used: true }), credentials: "same-origin", keepalive: true }).catch(() => {})
}
