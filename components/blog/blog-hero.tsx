"use client"

import React from "react"
import { InnerHero } from "@/components/inner-hero"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"

export function BlogHero() {
  return (
    <InnerHero
      badge={<LangText en="Blog" ar="الأخبار" />}
      title={
        <LangText
          en={<>News & <span className="text-[#0436DC]">Insights</span></>}
          ar={<>الأخبار و<span className="text-[#0436DC]">النصائح</span></>}
        />
      }
      description={<Msg id="news.heroBody" />}
      randomizeBackground={true}
    />
  )
}
