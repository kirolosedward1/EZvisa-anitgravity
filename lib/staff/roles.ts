/**
 * Staff roles, the permission matrix (Team board) and the console sidebar (grouped by job: Work, Customers, Money,
 * Insights, Admin). Pure, so server pages, client components and tests share it.
 *
 * Admin always has everything. Support and Finance see the sidebars drawn on the Support desk and Finance desk boards.
 */
export const ROLES = ["admin", "specialist", "support", "finance"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", specialist: "Specialist", support: "Support", finance: "Finance" }

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

export const PERMISSIONS = [
  { id: "view", label: "View cases", hint: "Queue, case detail, customer contact" },
  { id: "docs", label: "Review documents", hint: "Approve, send back with a note" },
  { id: "stage", label: "Change stage", hint: "Including Ready" },
  { id: "edit", label: "Edit application details", hint: "On behalf of the customer, logged" },
  { id: "files", label: "Prepare and assemble files", hint: "Templates, bookings, final PDF" },
  { id: "msg", label: "Message customers", hint: "WhatsApp and email from the case" },
  { id: "appt", label: "Save appointments", hint: "Book on behalf, reminders" },
  { id: "assign", label: "Assign and reassign cases", hint: "Any owner" },
  { id: "pay", label: "View payments", hint: "Transactions, receipts" },
  { id: "refund", label: "Issue refunds", hint: "With reason, logged" },
  { id: "export", label: "Export data", hint: "CSV of cases, customers, payments" },
  { id: "settings", label: "Change settings and templates", hint: "Pricing, requirements, automations" },
  { id: "team", label: "Manage team and roles", hint: "Invite, remove, change roles" },
] as const
export type Permission = (typeof PERMISSIONS)[number]["id"]

/** Default matrix from the Team board. Admin is not listed: it always has every permission. */
export const DEFAULT_MATRIX: Record<Exclude<Role, "admin">, Permission[]> = {
  specialist: ["view", "docs", "stage", "edit", "files", "msg", "appt"],
  support: ["view", "msg", "appt"],
  finance: ["view", "pay", "refund", "export"],
}

/** Permissions an admin can grant to other roles. Team and Settings stay admin only, so no one can promote themselves. */
export const GRANTABLE: Permission[] = PERMISSIONS.map((p) => p.id).filter((id) => id !== "team" && id !== "settings")

export type Matrix = Record<Exclude<Role, "admin">, Permission[]>

// The matrix in force: the default, or the one saved on the Team board (console_settings "permissions", loaded with
// the staff session in lib/staff/session.ts). It is the same for every request, so a shared value is safe.
let MATRIX: Matrix = DEFAULT_MATRIX

/** Pure: a stored matrix limited to grantable permissions, always with "view"; anything else falls back to the default. */
export function cleanMatrix(value: unknown): Matrix {
  if (!value || typeof value !== "object") return DEFAULT_MATRIX
  const out = { ...DEFAULT_MATRIX }
  for (const role of ["specialist", "support", "finance"] as const) {
    const list = (value as Record<string, unknown>)[role]
    if (!Array.isArray(list)) continue
    const perms = [...new Set(list.filter((p): p is Permission => GRANTABLE.includes(p as Permission)))]
    out[role] = perms.includes("view") ? perms : ["view", ...perms]
  }
  return out
}

export function setMatrix(value: unknown): void {
  MATRIX = value ? cleanMatrix(value) : DEFAULT_MATRIX
}

export function currentMatrix(): Matrix {
  return MATRIX
}

export function can(role: Role, permission: Permission): boolean {
  return role === "admin" || MATRIX[role].includes(permission)
}

export type NavKey =
  | "notifications"
  | "overview"
  | "cases"
  | "documents"
  | "files"
  | "appointments"
  | "customers"
  | "messaging"
  | "payments"
  | "insurance"
  | "analytics"
  | "reports"
  | "team"
  | "settings"
  | "audit"

export type NavItem = { key: NavKey; label: string; href: string; roles: Role[] }
export type NavGroup = { label: string | null; items: NavItem[] }

const ALL: Role[] = ["admin", "specialist", "support", "finance"]

/** Console paths are served under /staff (middleware.ts rewrites them to app/admin). */
export const NAV: NavGroup[] = [
  { label: null, items: [{ key: "notifications", label: "Notifications", href: "/staff/notifications", roles: ALL }] },
  {
    label: "Work",
    items: [
      { key: "overview", label: "Overview", href: "/staff/overview", roles: ALL },
      { key: "cases", label: "Cases", href: "/staff/cases", roles: ALL },
      { key: "documents", label: "Document review", href: "/staff/documents", roles: ["admin", "specialist"] },
      { key: "files", label: "File preparation", href: "/staff/files", roles: ["admin", "specialist"] },
      { key: "appointments", label: "Appointments", href: "/staff/appointments", roles: ["admin", "specialist", "support"] },
    ],
  },
  {
    label: "Customers",
    items: [
      { key: "customers", label: "Customers", href: "/staff/customers", roles: ALL },
      { key: "messaging", label: "Messaging", href: "/staff/messaging", roles: ["admin", "specialist", "support"] },
    ],
  },
  {
    label: "Money",
    items: [
      { key: "payments", label: "Payments", href: "/staff/payments", roles: ["admin", "finance"] },
      { key: "insurance", label: "Insurance", href: "/staff/insurance", roles: ["admin", "finance"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { key: "analytics", label: "Analytics", href: "/staff/analytics", roles: ALL },
      { key: "reports", label: "Reports", href: "/staff/reports", roles: ["admin", "finance"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { key: "team", label: "Team", href: "/staff/team", roles: ["admin"] },
      { key: "settings", label: "Settings", href: "/staff/settings", roles: ["admin"] },
      { key: "audit", label: "Audit log", href: "/staff/audit", roles: ["admin", "finance"] },
    ],
  },
]

/** A granted permission also opens its board (giving Support "View payments" shows them Payments). */
const PAGE_PERMISSION: Partial<Record<NavKey, Permission>> = { documents: "docs", files: "files", appointments: "appt", messaging: "msg", payments: "pay", insurance: "pay", reports: "export" }

export function canOpen(role: Role, key: NavKey): boolean {
  const byRole = NAV.some((g) => g.items.some((i) => i.key === key && i.roles.includes(role)))
  const perm = PAGE_PERMISSION[key]
  return byRole || (!!perm && can(role, perm))
}

/** The sidebar for one role: groups with no visible item are dropped. */
export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => canOpen(role, i.key)) })).filter((g) => g.items.length > 0)
}
