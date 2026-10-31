/**
 * Editable console settings (Settings board, migrations 011 and 012): message templates, SLA targets, automatic
 * assignment, the visa centres on the staff appointment form, and the permission matrix (Team board). Pure: defaults, validation and merging. Stored values that do
 * not validate are ignored, so a bad row can never break the console. Server loading is in console-settings-server.ts.
 */
import { z } from "zod"
import { TEMPLATES, type TemplateKey } from "@/lib/staff/templates"
import { SLA } from "@/lib/staff/sla"
import { CENTRES } from "@/lib/staff/centres"
import { GRANTABLE } from "@/lib/staff/roles"

export type SlaTargets = { reviewHours: number; fileBusinessDays: number; helpHours: number }
export type Centre = { name: string; short: string; match: string[] }
export type Templates = Record<TemplateKey, { label: string; en: string; ar: string; broadcast?: boolean }>
export type AutoAssign = { on: boolean; cap: number | null }
export type ConsoleSettings = { templates: Templates; sla: SlaTargets; autoAssign: AutoAssign; centres: Centre[] }
export type SettingKey = "templates" | "sla" | "auto_assign" | "centres" | "permissions"

export const DEFAULT_SETTINGS: ConsoleSettings = {
  templates: TEMPLATES,
  sla: { ...SLA },
  autoAssign: { on: true, cap: null },
  centres: CENTRES.map((c) => ({ name: c.name, short: c.short, match: [...c.match] })),
}

const text = z.string().trim().min(1).max(1000)
export const SCHEMAS = {
  templates: z.record(z.string(), z.object({ en: text, ar: text })),
  sla: z.object({ reviewHours: z.number().int().min(1).max(240), fileBusinessDays: z.number().int().min(1).max(20), helpHours: z.number().int().min(1).max(240) }),
  auto_assign: z.object({ on: z.boolean(), cap: z.number().int().min(1).max(500).nullable() }),
  centres: z
    .array(z.object({ name: z.string().trim().min(2).max(80), short: z.string().trim().min(2).max(24), match: z.array(z.string().trim().toLowerCase().min(2).max(30)).min(1).max(5) }))
    .min(1)
    .max(20)
    .refine((list) => new Set(list.map((c) => c.short.toLowerCase())).size === list.length, "Short names must be different"),
  permissions: (() => {
    const list = z.array(z.enum(GRANTABLE as [string, ...string[]])).max(20).refine((l) => l.includes("view"), "Every role keeps View cases")
    return z.object({ specialist: list, support: list, finance: list })
  })(),
} as const

/** Merges stored rows over the defaults; each key is validated on its own. */
export function mergeSettings(rows: { key: string; value: unknown }[]): ConsoleSettings {
  const out: ConsoleSettings = { ...DEFAULT_SETTINGS, templates: { ...DEFAULT_SETTINGS.templates } }
  for (const r of rows) {
    if (r.key === "templates") {
      const v = SCHEMAS.templates.safeParse(r.value)
      if (!v.success) continue
      for (const k of Object.keys(TEMPLATES) as TemplateKey[]) if (v.data[k]) out.templates[k] = { ...TEMPLATES[k], ...v.data[k] }
    } else if (r.key === "sla") {
      const v = SCHEMAS.sla.safeParse(r.value)
      if (v.success) out.sla = v.data
    } else if (r.key === "auto_assign") {
      const v = SCHEMAS.auto_assign.safeParse(r.value)
      if (v.success) out.autoAssign = v.data
    } else if (r.key === "centres") {
      const v = SCHEMAS.centres.safeParse(r.value)
      if (v.success) out.centres = v.data
    }
  }
  return out
}

/** Keywords for matching a typed centre, from its name: "VFS Global Abu Dhabi" gives ["vfs", "abu dhabi"]. */
export function matchFromName(name: string): string[] {
  const n = name.toLowerCase()
  const provider = ["vfs", "tls", "bls"].find((p) => n.includes(p))
  const city = ["abu dhabi", "dubai", "sharjah"].find((c) => n.includes(c))
  const words = [provider, city].filter(Boolean) as string[]
  return words.length ? words : [n.split(/[\s,]+/)[0]]
}
