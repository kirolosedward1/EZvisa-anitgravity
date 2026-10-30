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

export function can(role: Role, permission: Permission): boolean {
  return role === "admin" || DEFAULT_MATRIX[role].includes(permission)
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

/** The sidebar for one role: groups with no visible item are dropped. */
export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length > 0)
}

export function canOpen(role: Role, key: NavKey): boolean {
  return NAV.some((g) => g.items.some((i) => i.key === key && i.roles.includes(role)))
}
