"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

function hidesChat(path: string | null | undefined) {
  if (!path) return false
  return /\/apply(?:\/|$)|\/continue(?:\/|$)|\/payment-|\/checkout(?:\/|$)/.test(path)
}

/** Hide the Crisp bubble on the wizard and checkout so it cannot cover the bottom bar. */
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
