/**
 * Loads the editable console settings once per request (service role). Demo sessions, a missing table (migration 011
 * not applied) or a read error all give the defaults. Server only.
 */
import { cache } from "react"
import { serviceClient } from "@/lib/applications"
import { DEFAULT_SETTINGS, mergeSettings, type ConsoleSettings } from "@/lib/staff/console-settings"

export type LoadedSettings = ConsoleSettings & { stored: boolean; updated: Record<string, string> }

export const loadSettings = cache(async (demo = false): Promise<LoadedSettings> => {
  if (demo) return { ...DEFAULT_SETTINGS, stored: false, updated: {} }
  const client = serviceClient()
  if (!client) return { ...DEFAULT_SETTINGS, stored: false, updated: {} }
  const { data, error } = await client.from("console_settings").select("key, value, updated_at")
  if (error) return { ...DEFAULT_SETTINGS, stored: false, updated: {} }
  const rows = (data ?? []) as { key: string; value: unknown; updated_at: string }[]
  return { ...mergeSettings(rows), stored: true, updated: Object.fromEntries(rows.map((r) => [r.key, r.updated_at])) }
})
