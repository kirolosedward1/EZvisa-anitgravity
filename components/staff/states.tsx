// Console states from the "Empty, error and loading states" board: say what happened, what we are doing and what the
// person can do. Never a lonely icon.
import { Lock, TriangleAlert } from "lucide-react"
import { ROLE_LABEL, type Role } from "@/lib/staff/roles"

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
      <h2>{title}</h2>
      {body ? <p className="muted" style={{ margin: 0, maxWidth: 520, fontSize: 13 }}>{body}</p> : null}
      {children ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>{children}</div> : null}
    </section>
  )
}

export function PermissionDenied({ what, role, who }: { what: string; role: Role; who: string }) {
  return (
    <section className="card" style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
      <span className="av" style={{ width: 40, height: 40 }} aria-hidden="true">
        <Lock size={18} />
      </span>
      <h2>{what}</h2>
      <p className="muted" style={{ margin: 0, maxWidth: 520, fontSize: 13 }}>
        You are signed in as {ROLE_LABEL[role]}. {who}
      </p>
      <a className="btn outline" href="/staff/overview" style={{ marginTop: 6 }}>Back to the overview</a>
    </section>
  )
}

/** What broke, what we are doing, whether customers are affected; the data that did load stays visible. */
export function ErrorBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="banner red" role="alert">
      <TriangleAlert size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      <span>
        <b style={{ fontWeight: 500 }}>{title}</b> {body}
      </span>
    </div>
  )
}
