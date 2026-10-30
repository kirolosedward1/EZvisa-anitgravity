import { NextResponse } from "next/server"
import { getStaffUser } from "@/lib/admin-auth"

/** Whether the signed-in user is staff (the account menu shows "Staff console" only then). Never cached. */
export async function GET() {
  return NextResponse.json({ staff: (await getStaffUser()) !== null }, { headers: { "Cache-Control": "no-store" } })
}
