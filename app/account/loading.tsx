import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { requestLocale } from "@/lib/request-locale"

function Block({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />
}

export default async function AccountLoading() {
  const arabic = (await requestLocale()) === "ar"
  return (
    <>
      <SiteHeader />
      <main className="ez-dash min-h-screen px-4 pb-20 pt-[104px] sm:px-8 md:pt-[112px]" aria-busy="true" aria-label={arabic ? "جارٍ تحميل حسابك" : "Loading your account"}>
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7">
          <Block className="h-14 max-w-md" />
          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[260px_1fr]">
            <div className="flex flex-col gap-4">
              <Block className="h-52" />
              <Block className="h-64" />
            </div>
            <div className="flex flex-col gap-5">
              <Block className="h-80" />
              <Block className="h-56" />
              <Block className="h-48" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
