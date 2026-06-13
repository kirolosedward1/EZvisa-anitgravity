"use client"

import React from "react"
import { InnerHero } from "@/components/inner-hero"

export function BlogHero() {
  return (
    <InnerHero
      badge="Blog"
      title={
        <>
          News & <span className="text-primary bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary/80">Insights</span>
        </>
      }
      description="Expert visa guidance, travel tips, and the latest updates on Schengen visa applications."
      gradientType="ocean"
    />
  )
}
