export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-28" aria-hidden>
      <div className="skeleton-shimmer h-8 w-40 rounded-full" />
      <div className="skeleton-shimmer h-12 w-full max-w-xl rounded-2xl" />
      <div className="skeleton-shimmer h-5 w-full max-w-lg rounded-xl" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="skeleton-shimmer h-40 rounded-3xl" />
        <div className="skeleton-shimmer h-40 rounded-3xl" />
        <div className="skeleton-shimmer hidden h-40 rounded-3xl lg:block" />
      </div>
    </div>
  )
}
