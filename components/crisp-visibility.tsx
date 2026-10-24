"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

function hidesChat(path: string | null | undefined) {
  if (!path) return false
  // /forgot-password also matches /ar/forgot-password. The bubble covers the email label there.
  return /\/apply(?:\/|$)|\/continue(?:\/|$)|\/payment-|\/checkout(?:\/|$)|\/forgot-password(?:\/|$)/.test(path)
}

/** Hide the Crisp bubble on the wizard, checkout, and forgot-password so it cannot cover the form. */
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
