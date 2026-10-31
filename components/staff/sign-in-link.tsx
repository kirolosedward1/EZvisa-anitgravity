"use client"

import { useState, useTransition } from "react"
import { createSignInLink } from "@/app/admin/customers/actions"
import { waUrl } from "@/lib/staff/templates"

export function SignInLink({ email, phone, first }: { email: string; phone: string; first: string }) {
  const [res, setRes] = useState<{ ok: boolean; text: string; link?: string } | null>(null)
  const [pending, start] = useTransition()
  const wa = res?.link ? waUrl(phone, `Hi ${first}, here is your one-time EZvisa sign-in link: ${res.link}`) : null
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn outline sm" style={{ alignSelf: "flex-start" }} disabled={pending} onClick={() => start(async () => { const r = await createSignInLink({ email }); setRes(r.ok ? { ok: true, text: r.message, link: r.link } : { ok: false, text: r.error }) })}>Create sign-in link</button>
      {res ? <div className={res.ok ? "flash ok" : "flash err"} role="status"><span>{res.text}</span></div> : null}
      {res?.link ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn ghost sm" onClick={() => navigator.clipboard.writeText(res.link!).catch(() => undefined)}>Copy link</button>
          {wa ? <a className="btn primary sm" href={wa} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a> : null}
        </div>
      ) : null}
    </div>
  )
}
