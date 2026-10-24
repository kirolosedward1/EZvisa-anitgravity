import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"

function Block({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-2xl ${className}`} />
}

export default function AccountLoading() {
  return (
    <>
      <SiteHeader />
      <main className="bg-secondary/40 px-4 pb-20 pt-28 md:pt-32" aria-busy="true" aria-label="Loading your account">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-4">
            <Block className="h-72" />
            <Block className="h-36" />
          </div>
          <div className="flex flex-col gap-8">
            <Block className="h-80" />
            <Block className="h-40" />
            <Block className="h-56" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
