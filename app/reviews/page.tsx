import { redirect } from "next/navigation"

// Reviews are off the site for now (owner decision): only verifiable reviews will come back here.
export const metadata = { robots: { index: false, follow: true } }

export default function ReviewsPage() {
  redirect("/")
}
