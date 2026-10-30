import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStaffUser } from "@/lib/admin-auth"

// Staff console, reached at /staff (middleware.ts rewrites it here). Only signed-in staff (ADMIN_EMAILS, see
// lib/admin-auth.ts) see it; everyone else gets the normal missing page. Never indexed, and links out of it send no
// referrer.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getStaffUser())) notFound()
  return children
}
