"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

function hidesChat(path: string | null | undefined) {
  if (!path) return false
  const bare = path.split("?")[0].replace(/\/+$/, "") || "/"
  if (/\/apply(?:\/|$)|\/continue(?:\/|$)|\/payment-|\/checkout(?:\/|$)/.test(bare)) return true
  // Auth pages: the bubble covers the email label at 320px, including /ar and reset-password.
  return /^(?:\/ar)?\/(?:login|signup|reset-password)$/.test(bare)
}

/** Hide the Crisp bubble on the wizard, checkout, and auth pages so it cannot cover the form. */
export function CrispVisibility() {
  const pathname = usePathname()

  useEffect(() => {
    const hide = hidesChat(window.location.pathname) || hidesChat(pathname)
    document.documentElement.classList.toggle("hide-crisp", hide)
    const crisp = (window as Window & { $crisp?: Array<unknown[]> }).$crisp
    if (crisp) crisp.push(["do", hide ? "chat:hide" : "chat:show"])
    return () => {
      document.documentElement.classList.remove("hide-crisp")
    }
  }, [pathname])

  return null
}
