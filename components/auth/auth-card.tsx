import { AuthSplitLayout } from "@/components/auth/auth-split-layout"

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <AuthSplitLayout><div className="flex flex-col gap-7"><div><h1>{title}</h1>{subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}</div>{children}</div></AuthSplitLayout>
}
