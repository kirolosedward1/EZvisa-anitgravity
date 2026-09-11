import type { Metadata } from "next"
import VideosContent from "./videos-content"

export const metadata: Metadata = {
  title: "Visa Application Video Guides | EZvisa Video Library",
  description:
    "Watch step-by-step video guides on applying for Schengen visas, document preparation tips, and common mistakes to avoid. Expert video tutorials for European visa applications.",
  keywords: [
    "visa application videos",
    "Schengen visa tutorials",
    "visa guide videos",
    "how to apply for visa",
    "visa tips videos",
    "travel video guides",
  ],
  alternates: {
    canonical: "https://ezvisa.net/videos",
  },
  openGraph: {
    title: "Visa Application Video Guides | EZvisa",
    description: "Step-by-step video tutorials on European visa applications.",
    url: "https://ezvisa.net/videos",
    type: "website",
  },
}

export default function VideosPage() {
  return <VideosContent />
}
