import type { LucideIcon } from "lucide-react"
import { Languages, RefreshCw, ScanFace, ShieldCheck, Wallet, WifiOff } from "lucide-react"

import { PRICES } from "@/lib/currency"

/** Single source of truth for the /app page: screens, copy and FAQ. */

export const PRICE_AED = PRICES.visaApplication
export const PRICE_LABEL = `${PRICE_AED} AED`

export interface Screen {
  id: string
  /** Short name used in control labels ("Show screen 2 of 3: Apply"). */
  label: string
  src: string
  alt: string
}

// Files live in public/app/screenshots (1179 x 2556). They are rendered mock screens until real captures replace them.
export const SCREENS = {
  home: {
    id: "home",
    label: "Home",
    src: "/app/screenshots/home.png",
    alt: "EZvisa app home screen: a Germany application marked Paid, with a progress bar, status timeline and a Continue application button",
  },
  apply: {
    id: "apply",
    label: "Apply",
    src: "/app/screenshots/apply.png",
    alt: "EZvisa app apply step asking Where do you want to go, with a list of Schengen countries and Germany selected",
  },
  pay: {
    id: "pay",
    label: "Pay",
    src: "/app/screenshots/pay.png",
    alt: `EZvisa app review and pay screen for a Germany application showing the ${PRICE_LABEL} service fee and a payment button`,
  },
  upload: {
    id: "upload",
    label: "Upload",
    src: "/app/screenshots/upload.png",
    alt: "EZvisa app document upload screen listing passport, Emirates ID, bank statement and salary certificate with upload progress",
  },
  track: {
    id: "track",
    label: "Track",
    src: "/app/screenshots/track.png",
    alt: "EZvisa app application screen for Germany showing the status timeline, appointment details and a document checklist",
  },
} satisfies Record<string, Screen>

export const HERO_SCREENS: Screen[] = [SCREENS.home, SCREENS.apply, SCREENS.track]

export interface WalkthroughStep {
  id: string
  tab: string
  title: string
  body: string
  details: string[]
  screen: Screen
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "apply",
    tab: "Apply",
    title: "One question per screen",
    body: "Destination, dates, passport, employment, each on its own screen with a progress bar and a Back button. Answers save the moment you tap Continue.",
    details: ["Search 29 Schengen destinations", "Autosaves after every answer", "Resume at the exact question, on any device"],
    screen: SCREENS.apply,
  },
  {
    id: "pay",
    tab: "Pay",
    title: `Review, then pay ${PRICE_LABEL}`,
    body: "Check your answers on one page, then pay through the payment gateway. The price is set by our server, so what you see is what you pay.",
    details: [`${PRICE_LABEL} per application`, "Guest checkout, sign in later with the same email", "Embassy and visa centre fees are paid at your appointment", "EZvisa is not VAT-registered; prices shown are final."],
    screen: SCREENS.pay,
  },
  {
    id: "upload",
    tab: "Upload",
    title: "Finish after you've paid",
    body: "Payment unlocks Continue application: a short employment step, then your document uploads from the camera or Files.",
    details: ["Employment details, about 2 minutes", "Camera or Files, in any order", "Uploads resume if you go offline"],
    screen: SCREENS.upload,
  },
  {
    id: "track",
    tab: "Track",
    title: "The real status, with timestamps",
    body: "Submitted, Paid, Under review, File ready, each with the time it happened, plus the appointment details our staff add.",
    details: ["Every status change is time-stamped", "Appointment centre, date and time added by our team", "WhatsApp, email or phone with your reference attached"],
    screen: SCREENS.track,
  },
]

export interface StatusStep {
  label: string
  detail: string
}

export const STATUS_STEPS: StatusStep[] = [
  { label: "Submitted", detail: "2 Mar, 14:05" },
  { label: "Paid", detail: "2 Mar, 14:09" },
  { label: "Under review", detail: "3 Mar, 09:30" },
  { label: "File ready", detail: "6 Mar, 11:20" },
  { label: "Appointment", detail: "VFS Global, Dubai · 14 Mar, 10:30" },
]

export const STATUS_POINTS = [
  "Draft, Submitted, Paid, Under review, File ready, Cancelled: the real states, nothing vague in between.",
  "Appointment centre, date and time, entered by our team as soon as they have them.",
  "Need a human? WhatsApp, email or phone, with your application reference attached automatically.",
]

export interface Detail {
  icon: LucideIcon
  title: string
  body: string
  href?: string
  linkLabel?: string
}

export const DETAILS: Detail[] = [
  { icon: Languages, title: "English and Arabic", body: "Switch in Settings and the whole app flips to right-to-left." },
  { icon: ScanFace, title: "Face ID lock", body: "Optional. Keeps your passport details private on a shared phone." },
  { icon: WifiOff, title: "Uploads survive bad signal", body: "Lose connection mid-upload and it resumes when you're back online." },
  { icon: RefreshCw, title: "Autosave and resume anywhere", body: "Every answer saves as you go. Open the app or the website and continue at the same question." },
  { icon: Wallet, title: "Pay only when you're ready", body: `Finish the questions first. Payment comes after review: ${PRICE_LABEL} per application.` },
  { icon: ShieldCheck, title: "Clear refund rules", body: "Full refund if you cancel before we start reviewing your documents, or if we can't deliver because of an error on our side. No refund for visa refusals: the embassy decides.", href: "/refund-policy", linkLabel: "Refund policy" },
]

export interface Faq {
  question: string
  answer: string
  href?: string
  linkLabel?: string
}

export const FAQS: Faq[] = [
  {
    question: "Is there an Android version?",
    answer:
      "Not yet. The iPhone app is available now; Android is in development and the Google Play badge on this page will go live when it ships. Until then, the website works in any Android browser with the same account.",
  },
  {
    question: "How much does it cost?",
    answer: `The app is free to download. The service is ${PRICE_LABEL} per application, paid in the app through the payment gateway after you have reviewed your answers. Embassy and visa centre fees are paid separately at your appointment. EZvisa is not VAT-registered; prices shown are final.`,
  },
  {
    question: "I started on the website. Will it show in the app?",
    answer:
      "Yes. Sign in with the same email and the application appears at the exact question you left. The same applies the other way round.",
  },
  {
    question: "Which documents can I upload from the app?",
    answer:
      "Whatever your checklist asks for: passport, Emirates ID, bank statement, salary certificate, NOC, photo. Take a photo with the camera or pick a PDF or image from Files. Uploads open after payment and resume if you go offline.",
  },
  {
    question: "Can I lock the app?",
    answer:
      "Yes. Turn on Face ID lock in Settings and the app asks for Face ID before it opens. Your application lives in the same account and backend as the website.",
    href: "/privacy-policy",
    linkLabel: "How we handle data",
  },
]
