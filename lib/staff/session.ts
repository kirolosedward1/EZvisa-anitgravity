/**
 * Who is using the staff console, and with which role. Server only.
 *
 * A staff member is a signed-in Supabase user with a confirmed email who is either
 * - listed in the Vercel variable ADMIN_EMAILS (always an admin; works before migration 005 is applied), or
 * - an active row in staff_users (supabase/migrations/005_staff_console.sql), matched by user id or email.
 *
 * Outside production (local and preview builds) a demo staff session can be opened with
 * /api/auth/demo-login?scenario=staff&role=<role>. It only ever sees the built-in demo cases and never writes.
 */
import { cache } from "react"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { serviceClient } from "@/lib/applications"
import { createServerClient } from "@/lib/supabase/server"
import { DEMO_STAFF } from "@/lib/staff/demo"
import { isRole, setMatrix, type Role } from "@/lib/staff/roles"

export const DEMO_STAFF_COOKIE = "ez_demo_staff"
export const DEMO_STAFF_ALLOWED = process.env.VERCEL_ENV !== "production"

export type Staff = {
  /** auth.users id; null for the demo session */
  userId: string | null
  /** staff_users id, when the row exists */
  staffId: string | null
  email: string
  name: string
  role: Role
  demo: boolean
}

export function staffEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  )
}

export function isStaffEmail(email?: string | null): boolean {
  return !!email && staffEmails().has(email.trim().toLowerCase())
}

/** Missing table (migration not applied yet): treated as "no rows", never as an error. */
export function missingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205"
}

type StaffRow = { id: string; user_id: string | null; email: string; name: string; role: string; active: boolean; last_seen_at: string | null }

/** The staff_users row, or null; `ready` is false when the table is missing or could not be read. */
async function staffRow(client: SupabaseClient, userId: string, email: string): Promise<{ row: StaffRow | null; ready: boolean }> {
  try {
    const { data, error } = await client
      .from("staff_users")
      .select("id, user_id, email, name, role, active, last_seen_at")
      // Emails are stored lower case (the Team board writes them that way); quoted for PostgREST's or() syntax.
      .or(`user_id.eq.${userId},email.eq."${email.replace(/["\\]/g, "")}"`)
      .limit(2)
    if (error) {
      if (!missingTable(error)) console.error("[staff] lookup failed:", error.code)
      return { row: null, ready: false }
    }
    const rows = (data ?? []) as StaffRow[]
    return { row: rows.find((r) => r.user_id === userId) ?? rows.find((r) => r.email.toLowerCase() === email) ?? null, ready: true }
  } catch {
    return { row: null, ready: false }
  }
}

/** The signed-in staff member from a real Supabase session, or null. Never the demo session. */
// Permission matrix saved on the Team board, re-read at most every 30 seconds per server instance.
let matrixReadAt = 0
async function refreshMatrix(client: ReturnType<typeof serviceClient>): Promise<void> {
  if (!client || Date.now() - matrixReadAt < 30_000) return
  matrixReadAt = Date.now()
  try {
    const { data, error } = await client.from("console_settings").select("value").eq("key", "permissions").maybeSingle()
    if (!error) setMatrix(data?.value ?? null)
  } catch {
    // keep the matrix in force
  }
}

/** Forces the next staff request to re-read the matrix (after it is saved). */
export async function invalidateMatrix(): Promise<void> {
  matrixReadAt = 0
}

export const getRealStaff = cache(async (): Promise<Staff | null> => {
  let user
  try {
    user = (await (await createServerClient()).auth.getUser()).data.user
  } catch {
    return null
  }
  if (!user?.email || !user.email_confirmed_at) return null
  const email = user.email.trim().toLowerCase()
  const envAdmin = isStaffEmail(email)
  const client = serviceClient()
  const [lookup] = await Promise.all([client ? staffRow(client, user.id, email) : Promise.resolve({ row: null, ready: false }), refreshMatrix(client)])
  let row = lookup.row
  const role: Role | null = envAdmin ? "admin" : row?.active && isRole(row.role) ? row.role : null
  if (!role) return null

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const metaName = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim().length > 0)

  if (client && envAdmin && !row && lookup.ready) {
    // An ADMIN_EMAILS admin gets a staff_users row on first sign-in, so cases can be assigned to them.
    const { data } = await client
      .from("staff_users")
      .insert({ user_id: user.id, email, name: (metaName || email.split("@")[0]).trim(), role: "admin" })
      .select("id, user_id, email, name, role, active, last_seen_at")
      .maybeSingle()
    row = (data as StaffRow | null) ?? null
  }

  if (client && row) {
    // Link the row to this sign-in on first use, and note activity at most every 5 minutes.
    const stale = !row.last_seen_at || Date.now() - Date.parse(row.last_seen_at) > 5 * 60 * 1000
    if (!row.user_id || stale) {
      void client
        .from("staff_users")
        .update({ ...(row.user_id ? {} : { user_id: user.id }), last_seen_at: new Date().toISOString() })
        .eq("id", row.id)
        .then(() => undefined, () => undefined)
    }
  }

  return {
    userId: user.id,
    staffId: row?.id ?? null,
    email,
    name: (row?.name || metaName || email.split("@")[0]).trim(),
    role,
    demo: false,
  }
})

/** The console user: the real staff session, or (outside production only) the demo staff session. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const real = await getRealStaff()
  if (real) return real
  if (!DEMO_STAFF_ALLOWED) return null
  const role = (await cookies()).get(DEMO_STAFF_COOKIE)?.value
  if (!isRole(role)) return null
  // The demo session acts as the first demo specialist (lib/staff/demo.ts) so "My cases" is not empty.
  const self = DEMO_STAFF[0]
  return { userId: null, staffId: self.id, email: self.email, name: self.name, role, demo: true }
})

export function firstName(staff: Pick<Staff, "name">): string {
  return staff.name.split(/\s+/)[0] || staff.name
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? ""))).toUpperCase()
}
