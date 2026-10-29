import type { Metadata } from "next"
import { PopupDone } from "./popup-done"

export const metadata: Metadata = {
  title: "Signed in",
  robots: { index: false, follow: false },
}

export default function PopupDonePage() {
  return <PopupDone />
}
