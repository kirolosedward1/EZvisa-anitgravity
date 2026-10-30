import { redirect } from "next/navigation"

/** /staff opens the overview. */
export default function AdminIndex() {
  redirect("/staff/overview")
}
