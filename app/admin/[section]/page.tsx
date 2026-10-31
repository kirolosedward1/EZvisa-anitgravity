import { notFound } from "next/navigation"
import { EmptyState, PermissionDenied } from "@/components/staff/states"
import { sectionAccess } from "@/lib/staff/guard"
import type { NavKey } from "@/lib/staff/roles"

// Console boards that are not built yet, in the agreed build order. Each board replaces its entry here with its own
// route folder (a static route wins over this one); this file goes once every board exists.
const UPCOMING: Partial<Record<NavKey, string>> = {
  files: "File preparation",
  appointments: "Appointments",
  payments: "Payments and the Finance desk",
  insurance: "Insurance quotes",
  messaging: "Messaging and the Support desk",
  analytics: "Analytics",
  reports: "Reports",
  notifications: "Notifications",
  customers: "Customers",
  team: "Team and roles",
  settings: "Settings",
  audit: "Audit log",
}

export default async function UpcomingBoard({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const title = UPCOMING[section as NavKey]
  if (!title) notFound()
  const { staff, allowed } = await sectionAccess(section as NavKey)
  if (!allowed) return <PermissionDenied what={`${title} is not part of your role`} role={staff.role} who="An admin can change roles on the Team page." />
  return <EmptyState title={title} body="This board is next in the console build and is not available yet." />
}
