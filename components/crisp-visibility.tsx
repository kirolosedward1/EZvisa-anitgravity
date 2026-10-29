"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { CHAT_WIDGET_ENABLED, suppressesChat } from "@/lib/chat-routes"

type CrispWindow = Window & { $crisp?: unknown[]; CRISP_WEBSITE_ID?: string }

const SCRIPT_ID = "ez-crisp"
const SCRIPT_SRC = "https://client.crisp.chat/l.js"

let observer: MutationObserver | null = null

function crispWindow(): CrispWindow {
  return window as CrispWindow
}

/** Crisp only. Never the Vercel preview toolbar. */
function crispNodes(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".crisp-client, #crisp-chatbox")]
}

function forceHideNodes() {
  for (const node of crispNodes()) {
    if (node.style.display === "none" && node.style.getPropertyPriority("display") === "important") continue
    node.style.setProperty("display", "none", "important")
    node.style.setProperty("visibility", "hidden", "important")
    node.setAttribute("hidden", "")
    node.setAttribute("aria-hidden", "true")
  }
}

function watchForCrisp() {
  if (observer) return
  observer = new MutationObserver(() => forceHideNodes())
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] })
}

export function concealCrisp() {
  document.documentElement.classList.add("hide-crisp")
  crispWindow().$crisp?.push(["do", "chat:hide"])
  forceHideNodes()
  watchForCrisp()
}

function releaseCrispNodes() {
  observer?.disconnect()
  observer = null
  document.documentElement.classList.remove("hide-crisp")
  for (const node of crispNodes()) {
    node.style.removeProperty("display")
    node.style.removeProperty("visibility")
    node.removeAttribute("hidden")
    node.removeAttribute("aria-hidden")
  }
}

/**
 * Load Crisp only after functional consent and only off the auth routes.
 * On those routes the script is not inserted, and a widget already on the page is hidden.
 */
export function presentCrisp(websiteId: string) {
  if (!CHAT_WIDGET_ENABLED || suppressesChat(window.location.pathname)) {
    concealCrisp()
    return
  }
  releaseCrispNodes()
  const w = crispWindow()
  w.$crisp = w.$crisp || []
  w.CRISP_WEBSITE_ID = websiteId
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.async = true
    script.src = SCRIPT_SRC
    document.head.appendChild(script)
  }
  w.$crisp.push(["do", "chat:show"])
}

/** Hide the Crisp bubble on the wizard, checkout, and auth pages so it cannot cover the form. */
export function CrispVisibility() {
  const pathname = usePathname()

  useEffect(() => {
    const hide = !CHAT_WIDGET_ENABLED || suppressesChat(window.location.pathname) || suppressesChat(pathname)
    if (hide) {
      concealCrisp()
      return () => {
        observer?.disconnect()
        observer = null
      }
    }
    releaseCrispNodes()
    const w = crispWindow()
    if (document.getElementById(SCRIPT_ID)) w.$crisp?.push(["do", "chat:show"])
  }, [pathname])

  return null
}
