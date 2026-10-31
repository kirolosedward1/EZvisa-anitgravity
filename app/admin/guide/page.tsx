// User guide board: how every part of the console works (lib/staff/guide.ts), with what's new and the keyboard
// shortcuts. "My role" shows the sections for the signed-in role first; ?all=1 shows every section.
import { ArrowRight } from "lucide-react"
import { GUIDE, GUIDE_UPDATED, SHORTCUTS, WHATS_NEW } from "@/lib/staff/guide"
import { sectionAccess } from "@/lib/staff/guard"
import { ROLE_LABEL } from "@/lib/staff/roles"

export const dynamic = "force-dynamic"

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ all?: string; q?: string }> }) {
  const { staff } = await sectionAccess("guide")
  const sp = await searchParams
  const all = sp.all === "1"
  const q = (sp.q ?? "").trim().toLowerCase()
  const sections = GUIDE.filter((g) => all || !g.roles?.length || g.roles.includes(staff.role)).filter(
    (g) => !q || [g.title, g.summary, ...g.steps, ...(g.tips ?? [])].join(" ").toLowerCase().includes(q),
  )
  return (
    <>
      <div className="ezc-pagehead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>User guide</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>How to use the console · updated {GUIDE_UPDATED} · {all ? "every role" : `for ${ROLE_LABEL[staff.role]}`}</p>
        </div>
        <form method="get" action="/staff/guide" role="search" style={{ display: "flex", gap: 6 }}>
          {all ? <input type="hidden" name="all" value="1" /> : null}
          <input className="inp" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search the guide" aria-label="Search the guide" />
        </form>
      </div>
      <div className="guide">
        <nav className="card guide-toc" aria-label="Guide sections">
          <div className="seg" style={{ marginBottom: 8 }}>
            <a className="tab" href={`/staff/guide${q ? `?q=${encodeURIComponent(q)}` : ""}`} aria-current={!all ? "page" : undefined}>My role</a>
            <a className="tab" href={`/staff/guide?all=1${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={all ? "page" : undefined}>Everyone</a>
          </div>
          {!q ? <a href="#whats-new" className="qbtn">What&rsquo;s new</a> : null}
          {sections.map((g) => <a key={g.key} href={`#${g.key}`} className="qbtn">{g.title}</a>)}
          {!q ? <a href="#shortcuts" className="qbtn">Keyboard shortcuts</a> : null}
        </nav>
        <div className="stack">
          {!q ? (
            <section className="card guide-sec" id="whats-new" aria-labelledby="wn-h">
              <h2 id="wn-h">What&rsquo;s new</h2>
              {WHATS_NEW.map((w) => (
                <div key={w.date} className="stack" style={{ gap: 6 }}>
                  <b style={{ fontWeight: 500, fontSize: 13 }}>{w.date}</b>
                  <ul>{w.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              ))}
            </section>
          ) : null}
          {sections.length === 0 ? <section className="card" style={{ padding: 24 }}><p className="muted" style={{ margin: 0 }}>Nothing in the guide matches &ldquo;{sp.q}&rdquo;. <a href="/staff/guide">Clear the search</a></p></section> : null}
          {sections.map((g) => (
            <section key={g.key} className="card guide-sec" id={g.key} aria-labelledby={`g-${g.key}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <h2 id={`g-${g.key}`}>{g.title}</h2>
                {g.href ? <a href={g.href} style={{ fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}>Open {g.title.toLowerCase()} <ArrowRight size={14} aria-hidden /></a> : null}
              </div>
              <p style={{ margin: 0 }}>{g.summary}</p>
              {g.roles?.length ? <p className="muted" style={{ margin: 0, fontSize: 12 }}>Used by: {g.roles.map((r) => ROLE_LABEL[r]).join(", ")}</p> : null}
              <ol>{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              {g.tips?.length ? <div className="guide-tip">{g.tips.map((t) => <p key={t} style={{ margin: 0 }}>{t}</p>)}</div> : null}
            </section>
          ))}
          {!q ? (
            <section className="card guide-sec" id="shortcuts" aria-labelledby="sc-h">
              <h2 id="sc-h">Keyboard shortcuts</h2>
              <div className="tbl"><div className="tbl-h" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}><span>Keys</span><span>Does</span><span>Where</span></div>
                {SHORTCUTS.map((s) => <div key={s.keys + s.where} className="tbl-r" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}><span><kbd className="ezc-kbd">{s.keys}</kbd></span><span>{s.does}</span><span className="muted">{s.where}</span></div>)}
              </div>
            </section>
          ) : null}
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Something unclear or out of date? Tell an admin; the guide is updated with every console change.</p>
        </div>
      </div>
    </>
  )
}
