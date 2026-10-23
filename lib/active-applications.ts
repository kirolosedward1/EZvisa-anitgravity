import { isPaid, type ApplicationLike } from "@/lib/application-status"

/** Unpaid drafts and unpaid submitted applications. Paid and in-review cases do not count. */
export const ACTIVE_APPLICATION_LIMIT = 10

export function isDiscardable(app: ApplicationLike): boolean {
  const status = (app.application_status || "").toLowerCase()
  return !isPaid(app) && (status === "draft" || status === "submitted")
}

export function abandonedApplications<T extends ApplicationLike>(apps: T[]): T[] {
  return apps.filter(isDiscardable)
}

export function canStartApplication<T extends ApplicationLike>(apps: T[]): boolean {
  return abandonedApplications(apps).length < ACTIVE_APPLICATION_LIMIT
}

function updatedAt(app: ApplicationLike): number {
  const raw = app.updated_at || ""
  const time = Date.parse(raw)
  return Number.isNaN(time) ? 0 : time
}

/** Keeps every paid or in-progress case, and at most 10 unpaid draft/submitted cases. Nothing is deleted. */
export function visibleApplications<T extends ApplicationLike>(apps: T[]): T[] {
  const keptAbandoned = new Set(
    abandonedApplications(apps)
      .sort((a, b) => updatedAt(b) - updatedAt(a))
      .slice(0, ACTIVE_APPLICATION_LIMIT)
      .map((app) => app.id)
      .filter(Boolean),
  )
  return apps.filter((app) => !isDiscardable(app) || (app.id && keptAbandoned.has(app.id)))
}
