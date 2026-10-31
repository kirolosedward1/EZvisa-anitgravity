"use client"

// Broadcast builder: audience by stage, destination and language with a live count, a template with variables and
// a preview. WhatsApp Business is not connected, so the list is copied (logged) for sending from WhatsApp.
import { useMemo, useState } from "react"
import { logBroadcastList } from "@/app/admin/messaging/actions"
import { fillTemplate, type TemplateKey } from "@/lib/staff/templates"
import type { Templates } from "@/lib/staff/console-settings"

export type Recipient = { phone: string; first: string; lang: "en" | "ar"; stage: string; stageLabel: string; country: string; missing: string; ref: string }

export function Broadcast({ recipients, stages, countries, templates: TEMPLATES }: { recipients: Recipient[]; stages: { key: string; label: string }[]; countries: string[]; templates: Templates }) {
  const [onStages, setOnStages] = useState<string[]>(["payment", "documents"])
  const [onCountries, setOnCountries] = useState<string[]>(countries)
  const [lang, setLang] = useState<"both" | "en" | "ar">("both")
  const [tpl, setTpl] = useState<TemplateKey>("documents_reminder")
  const [body, setBody] = useState(TEMPLATES.documents_reminder.en)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const audience = useMemo(() => recipients.filter((r) => onStages.includes(r.stage) && onCountries.includes(r.country) && (lang === "both" || r.lang === lang)), [recipients, onStages, onCountries, lang])
  const sample = audience[0]
  const preview = fillTemplate(body, { first_name: sample?.first ?? "Amira", destination: sample?.country ?? "France", missing_documents: sample?.missing || "your bank statement", reference: sample?.ref ?? "EZ-0000", dashboard_link: "ezvisa.net/dashboard" })
  const toggle = (list: string[], v: string, set: (x: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  return (
    <div className="grid2">
      <section className="card form" aria-labelledby="bc-h">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <h2 id="bc-h">1. Who gets it</h2>
          <span className="pill blue">{audience.length} {audience.length === 1 ? "customer matches" : "customers match"}</span>
        </div>
        <fieldset className="seg-field"><legend>Stage</legend>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{stages.map((s) => <button key={s.key} type="button" className="tab" aria-pressed={onStages.includes(s.key)} onClick={() => toggle(onStages, s.key, setOnStages)}>{s.label}</button>)}</div>
        </fieldset>
        <fieldset className="seg-field"><legend>Destination</legend>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{countries.map((c) => <button key={c} type="button" className="tab" aria-pressed={onCountries.includes(c)} onClick={() => toggle(onCountries, c, setOnCountries)}>{c}</button>)}</div>
        </fieldset>
        <fieldset className="seg-field"><legend>Language</legend>
          <div className="seg">{(["both", "en", "ar"] as const).map((l) => <button key={l} type="button" className="tab" aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "both" ? "Both" : l === "en" ? "English" : "Arabic"}</button>)}</div>
        </fieldset>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Only customers who allowed WhatsApp messages in their application are included.</p>
        <h2>2. Message</h2>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>Template
          <select className="sel" value={tpl} onChange={(e) => { const k = e.target.value as TemplateKey; setTpl(k); setBody(TEMPLATES[k].en) }}>
            {(Object.keys(TEMPLATES) as TemplateKey[]).filter((k) => TEMPLATES[k].broadcast).map((k) => <option key={k} value={k}>{TEMPLATES[k].label}</option>)}
          </select>
        </label>
        <textarea className="inp" rows={4} value={body} onChange={(e) => setBody(e.target.value)} style={{ height: "auto", padding: 10, minWidth: 0 }} aria-label="Message" />
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Variables: {"{first_name} {destination} {missing_documents} {dashboard_link}"}. Arabic speakers get the Arabic version of the template.</p>
        <h2>3. Send</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>WhatsApp Business is not connected, so broadcasts are not sent from here. Copy the list (logged) and send from WhatsApp Business, respecting quiet hours (21:00 to 09:00 Dubai).</p>
        <div className="actions">
          <button type="button" className="btn primary" disabled={!audience.length} onClick={async () => {
            const r = await logBroadcastList({ count: audience.length, filters: `stages ${onStages.join("/")}; ${onCountries.length} destinations; ${lang}`, template: tpl })
            if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Not allowed." })
            const lines = audience.map((a) => `${a.phone}\t${fillTemplate(a.lang === "ar" ? TEMPLATES[tpl].ar : body, { first_name: a.first, destination: a.country, missing_documents: a.missing, reference: a.ref, dashboard_link: "https://www.ezvisa.net/dashboard" })}`)
            try {
              await navigator.clipboard.writeText(lines.join("\n"))
              setMsg({ ok: true, text: `${audience.length} numbers with their messages copied (phone, tab, message). Logged.` })
            } catch {
              setMsg({ ok: false, text: "Copy is blocked in this browser." })
            }
          }}>Copy {audience.length} numbers with messages</button>
        </div>
        {msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null}
      </section>
      <aside className="stack">
        <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="pv-h">
          <h2 id="pv-h">Preview{sample ? `, as ${sample.first} would see it` : ""}</h2>
          <div className="phone"><div className="bubble">{preview}</div></div>
        </section>
      </aside>
    </div>
  )
}
