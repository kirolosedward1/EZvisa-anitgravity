/**
 * Server-side reads and writes for application_events (supabase/migrations/004_application_events.sql). Both go
 * through the service role and never throw: until the migration is applied, reads return [] and writes are dropped,
 * and the dashboard rebuilds the activity list from the application row (lib/application-events.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { DEMO_APPLICATION_EVENTS } from "@/lib/demo-data"
import { toApplicationEvents, type ApplicationEvent, type EventKind } from "@/lib/application-events"

export async function loadApplicationEvents(applicationId?: string | null): Promise<ApplicationEvent[]> {
  if (!applicationId) return []
  const demo = DEMO_APPLICATION_EVENTS[applicationId]
  if (demo) return toApplicationEvents(demo)
  if (!UUID_RE.test(applicationId)) return []
  const client = serviceClient()
  if (!client) return []
  try {
    const { data, error } = await client
      .from("application_events")
      .select("kind, payload, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(50)
    return error ? [] : toApplicationEvents(data)
  } catch {
    return []
  }
}

/** Best effort: a missing table or a failed insert never blocks the flow that changed the case. */
export async function recordApplicationEvent(
  applicationId: string | null | undefined,
  kind: EventKind,
  payload: Record<string, unknown> = {},
  actor: "customer" | "team" | "system" = "system",
  client?: SupabaseClient | null,
): Promise<void> {
  if (!applicationId || !UUID_RE.test(applicationId)) return
  const writer = client ?? serviceClient()
  if (!writer) return
  try {
    const { error } = await writer.from("application_events").insert({ application_id: applicationId, kind, payload, actor })
    // 42P01: table not created yet (migration 004 not applied). Anything else is worth a log line.
    if (error && error.code !== "42P01" && error.code !== "PGRST205") console.error(`[events] ${kind}:`, error.code)
  } catch {
    // ignore
  }
}
