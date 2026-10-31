/**
 * Website contact form messages (contact_messages, migration 013) for the console: Messaging, Website messages, and
 * the sidebar count. Server only, service role. The demo session gets three invented messages.
 */
import { cache } from "react"
import { serviceClient } from "@/lib/applications"
import { missingTable, type Staff } from "@/lib/staff/session"

export type ContactMessage = { id: string; at: string; name: string; email: string; subject: string; message: string; emailSent: boolean; status: "new" | "handled"; handledBy: string | null; handledAt: string | null }

const DEMO: ContactMessage[] = [
  { id: "demo-msg-1", at: new Date(Date.now() - 40 * 60_000).toISOString(), name: "Omar Haddad", email: "omar.demo@example.com", subject: "France for a family of four", message: "Hi, we are four (two adults, two kids) travelling to Paris in December. Can you prepare all four files? What do the children need?", emailSent: false, status: "new", handledBy: null, handledAt: null },
  { id: "demo-msg-2", at: new Date(Date.now() - 5 * 3_600_000).toISOString(), name: "Rania Saleh", email: "rania.demo@example.com", subject: "", message: "I paid but I can't find where to upload my bank statement.", emailSent: false, status: "new", handledBy: null, handledAt: null },
  { id: "demo-msg-3", at: new Date(Date.now() - 2 * 86_400_000).toISOString(), name: "Karim Aziz", email: "karim.demo@example.com", subject: "Appointment", message: "Do you book the VFS appointment for us?", emailSent: false, status: "handled", handledBy: "Nour Saleh", handledAt: new Date(Date.now() - 86_400_000).toISOString() },
]

export const loadContactMessages = cache(async (staff: Staff): Promise<{ rows: ContactMessage[]; problem: string | null }> => {
  if (staff.demo) return { rows: DEMO, problem: null }
  const client = serviceClient()
  if (!client) return { rows: [], problem: "The database is not configured." }
  const { data, error } = await client.from("contact_messages").select("id, created_at, name, email, subject, message, email_sent, status, handled_by, handled_at").order("created_at", { ascending: false }).limit(200)
  if (error) return { rows: [], problem: missingTable(error) ? "Website messages need migration 013 (contact_messages)." : "Website messages could not be read." }
  return {
    rows: ((data ?? []) as Record<string, unknown>[]).map((r) => ({ id: String(r.id), at: String(r.created_at), name: String(r.name), email: String(r.email), subject: String(r.subject ?? ""), message: String(r.message), emailSent: !!r.email_sent, status: r.status === "handled" ? "handled" : "new", handledBy: (r.handled_by as string | null) ?? null, handledAt: (r.handled_at as string | null) ?? null })),
    problem: null,
  }
})
