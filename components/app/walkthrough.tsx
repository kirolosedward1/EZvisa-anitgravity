"use client"

import { useRef, useState } from "react"
import { motion, useMotionValueEvent, useScroll } from "framer-motion"
import { Check } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/translations/use-translation"
import { cn } from "@/lib/utils"
import type { WalkthroughStep } from "./content"
import { IphoneFrame } from "./iphone-frame"
import { ScreenStack } from "./screen-stack"

interface WalkthroughProps {
  steps: WalkthroughStep[]
}

/**
 * Apply / Pay / Upload / Track.
 * Below `lg`: a segmented control switches the phone's screen and the copy.
 * From `lg`: the phone sticks while the copy scrolls; the active step follows scroll progress.
 * Both trees are rendered and toggled with CSS so there is no layout switch after hydration.
 */
export function Walkthrough({ steps }: WalkthroughProps) {
  if (steps.length === 0) return null
  return (
    <>
      <div className="lg:hidden">
        <WalkthroughTabs steps={steps} />
      </div>
      <div className="hidden lg:block">
        <WalkthroughSticky steps={steps} />
      </div>
    </>
  )
}

function StepCopy({ step, active }: { step: WalkthroughStep; active: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 transition-colors duration-300 motion-reduce:transition-none",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className={cn("text-sm font-semibold", active ? "text-primary" : "text-muted-foreground")}>{step.tab}</span>
      <h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{step.title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{step.body}</p>
      <ul className="flex flex-col gap-2.5">
        {step.details.map((detail) => (
          <li key={detail} className="flex items-start gap-3 text-sm text-muted-foreground md:text-base">
            <Check className={cn("mt-1 h-4 w-4 shrink-0", active ? "text-primary" : "text-border")} aria-hidden="true" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WalkthroughTabs({ steps }: WalkthroughProps) {
  const { isRtl } = useTranslation()
  const [value, setValue] = useState(steps[0]?.id ?? "")
  const active = Math.max(
    0,
    steps.findIndex((step) => step.id === value),
  )
  const screens = steps.map((step) => step.screen)

  return (
    <Tabs value={value} onValueChange={setValue} dir={isRtl ? "rtl" : "ltr"} className="gap-8">
      <TabsList className="grid h-auto w-full grid-cols-4 rounded-full bg-muted p-1">
        {steps.map((step) => (
          <TabsTrigger
            key={step.id}
            value={step.id}
            className="h-auto rounded-full py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            {step.tab}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex justify-center">
        <IphoneFrame className="w-52 sm:w-60">
          <ScreenStack screens={screens} active={active} mode="slide" sizes="(min-width: 640px) 240px, 208px" />
        </IphoneFrame>
      </div>

      {steps.map((step) => (
        <TabsContent key={step.id} value={step.id} className="mx-auto w-full max-w-xl">
          <StepCopy step={step} active />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function WalkthroughSticky({ steps }: WalkthroughProps) {
  const copyRef = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: copyRef, offset: ["start 0.6", "end 0.4"] })

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const next = Math.min(steps.length - 1, Math.max(0, Math.floor(progress * steps.length)))
    setActive((current) => (current === next ? current : next))
  })

  const screens = steps.map((step) => step.screen)

  return (
    <div className="grid grid-cols-12 gap-12 xl:gap-16">
      <div className="sticky top-28 col-span-5 flex justify-center self-start">
        <IphoneFrame className="w-64 xl:w-72">
          <ScreenStack screens={screens} active={active} mode="slide" sizes="(min-width: 1280px) 288px, 256px" />
        </IphoneFrame>
      </div>

      <div className="relative col-span-7">
        <div className="absolute inset-y-0 start-0 w-px bg-border" aria-hidden="true">
          <motion.div className="absolute inset-0 origin-top bg-primary" style={{ scaleY: scrollYProgress }} />
        </div>
        <ol ref={copyRef} className="flex flex-col ps-10">
          {steps.map((step, index) => (
            <li key={step.id} className="relative flex min-h-96 flex-col justify-center py-12">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -start-10 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-background transition-colors duration-300 ltr:-translate-x-1/2 rtl:translate-x-1/2",
                  index <= active ? "bg-primary" : "bg-border",
                )}
              />
              <StepCopy step={step} active={index === active} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
