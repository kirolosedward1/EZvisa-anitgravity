/** Pure text building for what the automation writes back (tested in lib/staff/staff.test.ts). */
import type { AutomationPart } from "@/lib/automation/make"

type PartInput = { body?: string; summary?: string; drive_file_url?: string; items?: { item: string; status: "provided" | "prepared" | "missing" }[] }

export function composePartBody(part: AutomationPart, p: PartInput): string {
  const lines: string[] = []
  if (p.body?.trim()) lines.push(p.body.trim())
  if (p.summary?.trim()) lines.push(`${lines.length ? "\n" : ""}Summary: ${p.summary.trim()}`)
  if (part === "checklist" && p.items?.length) {
    const mark = { provided: "Provided", prepared: "Prepared by EZvisa", missing: "MISSING" } as const
    lines.push(`${lines.length ? "\n" : ""}${p.items.map((i) => `- ${i.item}: ${mark[i.status]}`).join("\n")}`)
  }
  if (p.drive_file_url) lines.push(`${lines.length ? "\n" : ""}Google Drive: ${p.drive_file_url}`)
  return lines.join("\n").slice(0, 40000)
}

export function composeNote(v: { status?: string; main_destination?: string; missing_info?: string[]; warnings?: string[]; notes_for_specialist?: string; drive_folder_url?: string; saved: string[]; skipped: { part: string; reason: string }[] }): string | null {
  const out: string[] = []
  const status = v.status === "needs_info" ? "Needs information from the customer" : v.status === "to_book_by_staff" ? "Reservations to be made by staff" : v.status === "ready_for_review" ? "Drafts ready for review" : null
  out.push(`Automation: ${status ?? "drafts saved"}${v.saved.length ? ` (${v.saved.join(", ").replace(/_/g, " ")})` : ""}.`)
  if (v.main_destination) out.push(`Main destination: ${v.main_destination}.`)
  if (v.missing_info?.length) out.push(`Missing: ${v.missing_info.join("; ")}.`)
  if (v.warnings?.length) out.push(`Check: ${v.warnings.join("; ")}.`)
  if (v.notes_for_specialist?.trim()) out.push(v.notes_for_specialist.trim())
  if (v.skipped.length) out.push(`Not saved: ${v.skipped.map((s) => `${s.part.replace(/_/g, " ")} (${s.reason.replace(/_/g, " ")})`).join(", ")}.`)
  if (v.drive_folder_url) out.push(`Google Drive folder: ${v.drive_folder_url}`)
  const text = out.join("\n").slice(0, 3900)
  return text.length > 12 ? text : null
}
