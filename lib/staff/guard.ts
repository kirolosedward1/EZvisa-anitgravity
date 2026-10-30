/** Page guard for console sections: the staff session (the layout already 404s without one) and whether the role may open it. */
import { notFound } from "next/navigation"
import { canOpen, type NavKey } from "@/lib/staff/roles"
import { getStaff, type Staff } from "@/lib/staff/session"

export async function sectionAccess(key: NavKey): Promise<{ staff: Staff; allowed: boolean }> {
  const staff = await getStaff()
  if (!staff) notFound()
  return { staff, allowed: canOpen(staff.role, key) }
}
