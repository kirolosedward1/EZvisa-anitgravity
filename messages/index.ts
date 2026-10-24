import { ar } from "@/messages/ar"
import { en, type MessageKey } from "@/messages/en"

export type { MessageKey }
export type Locale = "en" | "ar"

const catalogs = { en, ar } as const

export function fill(template: string, values?: Record<string, string | number>) {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}

export function message(locale: Locale, key: MessageKey, values?: Record<string, string | number>) {
  return fill(catalogs[locale][key], values)
}

export { ar, en }
