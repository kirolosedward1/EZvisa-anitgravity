"use client"

// Staff console frame: grouped sidebar built from the role (lib/staff/roles.ts), top bar with search, New case and the
// notifications bell (with Refresh). Below 1024px the sidebar opens from a menu button. "/" focuses search, Esc closes the menu.
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BarChart3, Bell, Calendar, CreditCard, FileSpreadsheet, FileText, FolderOpen, History, Inbox, LayoutGrid, LogOut,
  Menu, MessageCircle, Plus, Search, Settings, ShieldCheck, Users, UserCog, X,
} from "lucide-react"
import type { NavGroup, NavKey } from "@/lib/staff/roles"
import { RefreshButton } from "@/components/staff/refresh-button"

const ICON: Record<NavKey, React.ComponentType<{ "aria-hidden"?: boolean }>> = {
  notifications: Bell,
  overview: LayoutGrid,
  cases: Inbox,
  documents: FileText,
  files: FolderOpen,
  appointments: Calendar,
  customers: Users,
  messaging: MessageCircle,
  payments: CreditCard,
  insurance: ShieldCheck,
  analytics: BarChart3,
  reports: FileSpreadsheet,
  team: UserCog,
  settings: Settings,
  audit: History,
}

export type ShellCounts = Partial<Record<NavKey, { n: number; tone?: "red" }>>

export function ConsoleShell({
  nav,
  counts,
  me,
  canCreate,
  children,
}: {
  nav: NavGroup[]
  counts: ShellCounts
  me: { name: string; initials: string; role: string; demo: boolean }
  canCreate: boolean
  children: React.ReactNode
}) {
  const raw = usePathname() ?? ""
  // The console is served at /staff and rendered from app/admin; accept either form.
  const pathname = raw.replace(/^\/admin(?=\/|$)/, "/staff")
  const [open, setOpen] = useState(false)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return
      e.preventDefault()
      search.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const bellCount = counts.notifications?.n ?? 0

  return (
    <div className="ezc" data-menu={open ? "open" : "closed"}>
      <aside className="ezc-side" id="ezc-sidebar" aria-label="Console navigation">
        <a href="/staff/overview" className="ezc-logo" aria-label="EZvisa staff console, overview">
          <Image src="/images/logo-main.png" alt="EZvisa" width={88} height={28} className="h-6 w-auto" />
          <span>Admin</span>
        </a>
        <nav aria-label="Console">
          {nav.map((group, gi) => (
            <div key={group.label ?? `g${gi}`}>
              {group.label ? <div className="ezc-sec">{group.label}</div> : null}
              {group.items.map((item) => {
                const Icon = ICON[item.key]
                const count = counts[item.key]
                return (
                  <a key={item.key} href={item.href} className="ezc-nav" aria-current={isActive(item.href) ? "page" : undefined}>
                    <Icon aria-hidden />
                    {item.label}
                    {count && count.n > 0 ? (
                      <span className={count.tone === "red" ? "n red" : "n"}>
                        {count.n}
                        <span className="sr-only"> waiting</span>
                      </span>
                    ) : null}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="ezc-me">
          <span className="av" aria-hidden="true">{me.initials}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <b>{me.name}</b>
            <small>{me.demo ? `${me.role} · demo` : me.role}</small>
          </span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn ghost" aria-label="Sign out" title="Sign out" style={{ height: 32 }}>
              <LogOut size={16} aria-hidden />
            </button>
          </form>
        </div>
      </aside>
      {open ? <div className="ezc-scrim" onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      <div className="ezc-body">
        <header className="ezc-top">
          <button
            type="button"
            className="btn ghost ezc-menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="ezc-sidebar"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
          <form action="/staff/cases" method="get" role="search" className="ezc-search">
            <Search size={16} aria-hidden />
            <input ref={search} name="q" type="search" placeholder="Search by name, email, phone or EZ reference" aria-label="Search cases" />
            <kbd className="ezc-kbd hide-sm" aria-hidden="true">/</kbd>
          </form>
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <RefreshButton />
            {canCreate ? (
              <a href="/staff/cases/new" className="btn primary" aria-label="New case">
                <Plus size={16} aria-hidden />
                <span className="hide-sm">New case</span>
              </a>
            ) : null}
            <a href="/staff/notifications" className="ezc-bell" aria-label={bellCount ? `Notifications, ${bellCount} new` : "Notifications"}>
              <Bell size={20} aria-hidden />
              {bellCount ? <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#c62828" }} /> : null}
            </a>
          </div>
        </header>
        <nav className="ezc-tabbar" aria-label="Quick">
          <a href="/staff/cases?tab=us" aria-current={pathname.startsWith("/staff/cases") ? "page" : undefined}><Inbox aria-hidden /><span>Queue</span></a>
          <a href="/staff/notifications" aria-current={pathname.startsWith("/staff/notifications") ? "page" : undefined}><Bell aria-hidden /><span>Inbox</span>{bellCount ? <i>{bellCount > 99 ? "99+" : bellCount}</i> : null}</a>
          <a href="/staff/appointments" aria-current={pathname.startsWith("/staff/appointments") ? "page" : undefined}><Calendar aria-hidden /><span>Appointments</span></a>
          <a href="/staff/customers" aria-current={pathname.startsWith("/staff/customers") ? "page" : undefined}><Search aria-hidden /><span>Customers</span></a>
        </nav>
        <main className="ezc-main" id="main">
          {me.demo ? (
            <div className="banner amber" role="note">
              Demo session: invented cases only. Nothing you do here is saved or sent.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}
