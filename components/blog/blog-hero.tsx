"use client"

import React from "react"
import { InnerHero } from "@/components/inner-hero"

export function BlogHero() {
  return (
    <InnerHero
      badge="Blog"
      title={
        <>
          News & <span className="text-blue-300">Insights</span>
        </>
      }
      description="Expert visa guidance, travel tips, and the latest updates on Schengen visa applications."
      randomizeBackground={true}
    />
  )
}
