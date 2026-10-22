"use client"

import { useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { Check, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { BrowserFrame } from "./browser-frame"
import { IphoneFrame } from "./iphone-frame"
import { REVEAL_EASE, useRevealPhase } from "./reveal"

interface Flight {
  x0: number
  y0: number
  x1: number
  y1: number
  scale0: number
  width: number
  height: number
}

function ApplicationCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full flex-col gap-2 rounded-2xl bg-primary p-4 text-primary-foreground", className)}>
      <div className="flex items-center gap-2">
        <span className="relative h-6 w-6 overflow-hidden rounded-full">
          <Image src="/flags/germany.png" alt="" fill sizes="24px" className="object-cover" />
        </span>
        <span className="text-sm font-semibold">Germany</span>
      </div>
      <span className="text-xs opacity-85">Draft · Trip details</span>
      <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-primary-foreground/30">
        <span className="block h-full w-1/2 rounded-full bg-primary-foreground" />
      </span>
      <span className="text-xs opacity-85">Saved just now</span>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground">{value}</div>
    </div>
  )
}

/**
 * The website's apply step beside the app's Continue screen. When the section scrolls into
 * view, the application card flies from the browser into the phone. Without JavaScript or
 * with reduced motion, the card simply sits in the phone.
 */
export function HandoffSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const fromRef = useRef<HTMLDivElement>(null)
  const toRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const phase = useRevealPhase(sectionRef, "0px 0px -20% 0px")
  const [landed, setLanded] = useState(true)
  const [flight, setFlight] = useState<Flight | null>(null)

  useLayoutEffect(() => {
    if (phase === "hidden" && !reduce) setLanded(false)
  }, [phase, reduce])

  useLayoutEffect(() => {
    if (phase !== "shown" || reduce || landed) return
    const section = sectionRef.current?.getBoundingClientRect()
    const from = fromRef.current?.getBoundingClientRect()
    const to = toRef.current?.getBoundingClientRect()
    if (!section || !from || !to) {
      setLanded(true)
      return
    }
    setFlight({
      x0: from.left - section.left,
      y0: from.top - section.top,
      x1: to.left - section.left,
      y1: to.top - section.top,
      scale0: from.width / to.width,
      width: to.width,
      height: to.height,
    })
  }, [phase, reduce, landed])

  return (
    <div ref={sectionRef} className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <BrowserFrame url="ezvisa.net/apply" className="w-full lg:justify-self-end lg:max-w-md">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step 4 of 5</span>
            <span>Trip details</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full w-4/5 rounded-full bg-primary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Trip details</h3>
          <Field label="Destination" value="Germany" />
          <Field label="Travel dates" value="12 – 24 Mar" />
          <div className="flex h-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            Continue
          </div>
          <div ref={fromRef} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Saved to your account · just now</span>
          </div>
        </div>
      </BrowserFrame>

      <div className="flex justify-center lg:justify-self-start">
        <IphoneFrame className="w-52 sm:w-60">
          <div className="absolute inset-0 flex flex-col gap-4 bg-background px-4 pb-5 pt-14 text-foreground">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">9:41</span>
              <span className="h-2.5 w-6 rounded-sm bg-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Germany · Draft</span>
              <h4 className="text-lg font-bold leading-tight tracking-tight">Pick up where you left off</h4>
            </div>
            <div ref={toRef} className="relative h-28 w-full rounded-2xl bg-muted">
              <ApplicationCard className={cn(!landed && "invisible")} />
            </div>
            <ul className="flex flex-col divide-y divide-background overflow-hidden rounded-2xl bg-muted text-xs">
              <li className="flex items-center justify-between px-3 py-2.5">
                <span className="font-medium">Personal details</span>
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </li>
              <li className="flex items-center justify-between px-3 py-2.5">
                <span className="font-medium">Trip details</span>
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </li>
              <li className="flex items-center justify-between px-3 py-2.5">
                <span className="font-medium">Employment</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </li>
            </ul>
            <div className="mt-auto flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              Continue
            </div>
          </div>
        </IphoneFrame>
      </div>

      {flight && !landed && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 origin-top-left"
          style={{ width: flight.width, height: flight.height }}
          initial={{ x: flight.x0, y: flight.y0, scale: flight.scale0, opacity: 0 }}
          animate={{ x: flight.x1, y: flight.y1, scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: REVEAL_EASE, opacity: { duration: 0.25 } }}
          onAnimationComplete={() => setLanded(true)}
        >
          <ApplicationCard />
        </motion.div>
      )}
    </div>
  )
}
