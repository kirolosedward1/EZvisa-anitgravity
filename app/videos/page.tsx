import type { Metadata } from "next"
import VideosContent from "./videos-content"
import { LatestGuides } from "@/components/latest-guides"
import { withArabicMeta } from "@/lib/page-meta"

export async function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Visa Application Video Guides",
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
        canonical: "https://www.ezvisa.net/videos",
      },
      openGraph: {
        title: "Visa Application Video Guides | EZvisa",
        description: "Step-by-step video tutorials on European visa applications.",
        url: "https://www.ezvisa.net/videos",
        type: "website",
      },
    },
    {
      title: "أدلة فيديو لطلب التأشيرة",
      description: "مقاطع قصيرة عن خطوات طلب تأشيرة شنغن وتجهيز المستندات. للمقيمين في الإمارات.",
      path: "/ar/videos",
    },
  )
}

export default function VideosPage() {
  return (
    <VideosContent>
      <LatestGuides />
    </VideosContent>
  )
}
