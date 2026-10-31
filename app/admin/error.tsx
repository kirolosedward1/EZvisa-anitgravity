"use client"

// Console error state (States board): what broke, that customers are not affected, and one action.
import { useEffect } from "react"

export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[console]", error.digest ?? error.message)
  }, [error])
  return (
    <div className="banner red" role="alert" style={{ flexDirection: "column", gap: 8 }}>
      <b style={{ fontWeight: 500 }}>This page could not load.</b>
      <span>Nothing was changed and customers are not affected. Try again; if it keeps failing, the data service may be down.{error.digest ? ` Reference ${error.digest}.` : ""}</span>
      <button type="button" className="btn outline sm" style={{ alignSelf: "flex-start" }} onClick={reset}>Try again</button>
    </div>
  )
}
