"use client"
// Return page for the EZvisa iOS/Android app after Ziina checkout. It only hands control back to the app;
// the app verifies payment from the database itself and never trusts these parameters.
import { useEffect, useState } from "react"

const APP_SCHEME = /^(ezvisa|exp|exps):\/\/[^\s<>"']*$/i

export default function AppReturn() {
  const [target, setTarget] = useState<string | null>(null)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const to = p.get("to") || ""
    const r = p.get("r") === "cancel" ? "cancel" : "success"
    const appId = (p.get("appId") || "").replace(/[^0-9a-f-]/gi, "").slice(0, 36)
    if (!APP_SCHEME.test(to)) { setTarget(""); return }
    const u = `${to}${to.includes("?") ? "&" : "?"}r=${r}${appId ? `&appId=${appId}` : ""}`
    setTarget(u)
    window.location.replace(u)
  }, [])
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, fontFamily: "-apple-system, system-ui, sans-serif", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Returning to the EZvisa app…</h1>
      {target ? <a href={target} style={{ padding: "12px 20px", borderRadius: 999, background: "#0434E0", color: "#fff", textDecoration: "none" }}>Open the app</a>
        : target === "" ? <p style={{ color: "#666" }}>You can close this page and return to the app.</p> : null}
    </main>
  )
}
