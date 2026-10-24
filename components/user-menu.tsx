"use client"

// Header account menu. Signed out: sign in, create account, start an application, help. Signed in (Supabase session
// or a demo session): the customer's applications, documents, account settings, the app, help and sign out.
import { useEffect, useState } from "react"
import {
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  PlusCircle,
  Settings,
  Smartphone,
  UserPlus,
  UserRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { User } from "@supabase/supabase-js"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LocaleLink } from "@/components/locale-link"
import { LangText } from "@/components/lang-text"
import { createBrowserClient, supabasePublicEnv } from "@/lib/supabase/client"
import { useAvatarUrl } from "@/lib/avatar"
import { AvatarPhoto } from "@/components/avatar-photo"
import { cn } from "@/lib/utils"

function readDemoCookie(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)ez_demo_active=1(?:;|$)/.test(document.cookie)
}

function initialsOf(viewer: NonNullable<Viewer>): string {
  const source = viewer.name?.trim() || viewer.email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 && viewer.name ? parts[1][0] : "")).toUpperCase() || "E"
}

function MenuLink({ href, icon: Icon, en, ar }: { href: string; icon: LucideIcon; en: string; ar: string }) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm">
      <LocaleLink href={href}>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <LangText en={en} ar={ar} />
      </LocaleLink>
    </DropdownMenuItem>
  )
}

/** `user` (id + metadata) is set for Supabase sessions; the profile photo is read from it (lib/avatar.ts). */
export type Viewer = { email: string; name?: string; demo: boolean; user?: Pick<User, "id" | "user_metadata"> } | null

/** The signed-in customer (Supabase session, or the demo sandbox cookie). `ready` turns true once checked. */
export function useViewer(): { viewer: Viewer; ready: boolean } {
  const [viewer, setViewer] = useState<Viewer>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    const demo = readDemoCookie()
    if (!supabasePublicEnv().configured) {
      setViewer(demo ? { email: "Demo account", demo: true } : null)
      setReady(true)
      return
    }
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const user = data.session?.user
      if (user?.email) setViewer({ email: user.email, name: user.user_metadata?.full_name, demo: false, user: { id: user.id, user_metadata: user.user_metadata } })
      else setViewer(demo ? { email: "Demo account", demo: true } : null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      setViewer(user?.email ? { email: user.email, name: user.user_metadata?.full_name, demo: false, user: { id: user.id, user_metadata: user.user_metadata } } : readDemoCookie() ? { email: "Demo account", demo: true } : null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { viewer, ready }
}

export function UserMenu() {
  const { viewer, ready } = useViewer()
  const photo = useAvatarUrl(viewer?.user)

  const signedIn = !!viewer

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "h-10 w-10 flex items-center justify-center overflow-hidden rounded-full shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          signedIn ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-foreground hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary",
        )}
        aria-label={signedIn ? `Account menu for ${viewer?.email}` : "Account menu / حسابي"}
      >
        {signedIn && viewer ? (
          <AvatarPhoto src={photo} initials={<span className="text-sm font-semibold">{initialsOf(viewer)}</span>} className="size-full" />
        ) : (
          <UserRound className="h-5 w-5" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-72 rounded-2xl border-border/70 p-2 shadow-xl">
        {signedIn && viewer ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2.5 font-normal">
              <AvatarPhoto src={photo} initials={initialsOf(viewer)} className="size-9 shrink-0 bg-primary/10 text-sm font-semibold text-primary" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-foreground">{viewer.name || <LangText en="Signed in" ar="مسجّل الدخول" />}</span>
                <span className="truncate text-xs text-muted-foreground">{viewer.demo ? <LangText en="Demo sandbox" ar="حساب تجريبي" /> : viewer.email}</span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuGroup>
              <MenuLink href="/dashboard" icon={LayoutDashboard} en="My applications" ar="طلباتي" />
              <MenuLink href="/documents" icon={FileText} en="Required documents" ar="المستندات المطلوبة" />
              <MenuLink href="/apply" icon={PlusCircle} en="New application" ar="طلب جديد" />
              {!viewer.demo && <MenuLink href="/account" icon={Settings} en="Account settings" ar="إعدادات الحساب" />}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuGroup>
              <MenuLink href="/app" icon={Smartphone} en="Get the app" ar="حمّل التطبيق" />
              <MenuLink href="/contact" icon={LifeBuoy} en="Help & support" ar="المساعدة والدعم" />
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1.5" />
            <form action="/api/auth/signout" method="POST">
              <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive focus:text-destructive">
                <button type="submit" className="w-full">
                  <LogOut className="size-4" aria-hidden="true" />
                  {viewer.demo ? <LangText en="Exit demo" ar="الخروج من العرض التجريبي" /> : <LangText en="Sign out" ar="تسجيل الخروج" />}
                </button>
              </DropdownMenuItem>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1 px-3 pb-2 pt-2.5">
              <span className="text-sm font-semibold text-foreground"><LangText en="Your EZvisa account" ar="حسابك في إيزي فيزا" /></span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                <LangText en="Track your application and upload documents. Same account as the app." ar="تابع طلبك وارفع مستنداتك. الحساب نفسه في التطبيق." />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 px-1 pb-2 pt-1">
              <DropdownMenuItem asChild className="cursor-pointer justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground">
                <LocaleLink href="/login">
                  <LogIn className="size-4" aria-hidden="true" />
                  <LangText en="Sign in" ar="تسجيل الدخول" />
                </LocaleLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold">
                <LocaleLink href="/signup">
                  <UserPlus className="size-4" aria-hidden="true" />
                  <LangText en="Sign up" ar="إنشاء حساب" />
                </LocaleLink>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuGroup>
              <MenuLink href="/apply" icon={PlusCircle} en="Start an application" ar="ابدأ طلبًا" />
              <MenuLink href="/dashboard" icon={LayoutDashboard} en="Track my application" ar="تتبّع طلبي" />
              <MenuLink href="/app" icon={Smartphone} en="Get the app" ar="حمّل التطبيق" />
              <MenuLink href="/contact" icon={LifeBuoy} en="Help & support" ar="المساعدة والدعم" />
            </DropdownMenuGroup>
          </>
        )}
        {!ready && <span className="sr-only">Loading account</span>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
