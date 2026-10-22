"use client"

// The visa application wizard. Steps, fields, option lists and validation are shared with the EZvisa app through
// lib/shared/wizard-contract.ts: Personal → Spouse (if the spouse travels) → Trip Details → Review & Payment.
// Employment details and the passport number are asked after payment (dashboard "Continue application"), and a
// signed-in user's answers autosave to the same visa_applications draft row the app reads (lib/draft-sync.ts).
import { useState, Suspense, useCallback, useMemo, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { NationalityStep } from "@/components/apply/nationality-step"
import { TripDetailsStep } from "@/components/apply/trip-details-step"
import { PaymentStep } from "@/components/apply/payment-step"
import { SpouseStep } from "@/components/apply/spouse-step"
import { CheckCircle2, ChevronDown } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { trackEvent } from "@/lib/analytics"
import { getStepSlug, getStepNumber, isValidStep, STEP_TO_NUMBER, STEP_TITLES, visibleSteps } from "@/lib/wizard-steps"
import { createBrowserClient } from "@/lib/supabase/client"
import { useDraftSync, type ServerDraft } from "@/lib/draft-sync"
import { DraftStatus, DraftConflictDialog } from "@/components/apply/draft-status"
import type { FormData } from "@/lib/form-types"
import { emptyAnswers, coerceAnswers, matchCountry, SCHENGEN, SCHENGEN_VISA_REQUIRED, type WizardStep } from "@/lib/shared/wizard-contract"

const WIZARD_STORAGE_KEY = "visa_wizard_data"
const AUTO_SAVE_DELAY = 300

const defaultFormData: FormData = { ...emptyAnswers }

/** Answers prefilled from the URL (homepage selector, destination pages, shared links), validated against the shared lists. */
function paramsToAnswers(searchParams: URLSearchParams): Partial<FormData> {
  const from = matchCountry(searchParams.get("from") || searchParams.get("nationality"), SCHENGEN_VISA_REQUIRED)
  const to = matchCountry(searchParams.get("to") || searchParams.get("destination"), SCHENGEN)
  const travelStartDate = searchParams.get("travelStartDate") || ""
  const travelEndDate = searchParams.get("travelEndDate") || ""
  return {
    ...(from && { nationality: from }),
    ...(to && { destination: to }),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(travelStartDate) && { travelStartDate }),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(travelEndDate) && { travelEndDate }),
  }
}

function ApplyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isTransitioning] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const [showResumeModal, setShowResumeModal] = useState(false)
  const [pendingSavedData, setPendingSavedData] = useState<Partial<FormData> | null>(null)

  // Signed-in users: answers also autosave to their draft row, shared with the EZvisa app (lib/draft-sync.ts).
  // ?draft=<id> opens a specific draft (dashboard "Continue draft", or one started in the app).
  const openDraftId = searchParams.get("draft")
  const handleServerDraft = useCallback((d: ServerDraft) => {
    setFormData(coerceAnswers({ ...defaultFormData, ...(d.wizard as Partial<FormData>) }))
    setCurrentStep(getStepNumber(d.step))
  }, [])
  const draft = useDraftSync({ form: formData, step: getStepSlug(currentStep), ready: isInitialized && !showResumeModal, onLoad: handleServerDraft, openId: openDraftId })

  const isUpdatingUrl = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wizardContainerRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(false)

  // Coerce restored drafts and links to the shared rules (residence UAE only, visa-required nationality, …).
  useEffect(() => {
    const c = coerceAnswers(formData)
    if (
      c.countryOfResidence !== formData.countryOfResidence ||
      c.cityOfResidence !== formData.cityOfResidence ||
      c.nationality !== formData.nationality ||
      c.hasNOC !== formData.hasNOC ||
      c.passportExpiry !== formData.passportExpiry
    ) {
      setFormData(c)
    }
  }, [formData])

  const handleContinuePrevious = useCallback(() => {
    if (pendingSavedData) {
      setFormData(coerceAnswers({ ...defaultFormData, ...pendingSavedData, ...paramsToAnswers(searchParams) }))
    }
    setShowResumeModal(false)
  }, [pendingSavedData, searchParams])

  const handleStartFresh = useCallback(() => {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
    draft.forget()
    const seeded = paramsToAnswers(searchParams)
    setFormData({ ...defaultFormData, ...seeded })

    const slug = getStepSlug(1)
    setCurrentStep(1)
    router.replace(
      `/apply?step=${slug}${seeded.nationality ? `&from=${encodeURIComponent(seeded.nationality)}` : ""}${seeded.destination ? `&to=${encodeURIComponent(seeded.destination)}` : ""}`,
      { scroll: false }
    )

    setShowResumeModal(false)
  }, [router, searchParams, draft.forget])

  const scrollToWizardTop = useCallback(() => {
    if (typeof window === "undefined") return

    const header = document.querySelector("header")
    const headerHeight = header?.offsetHeight || 80

    if (wizardContainerRef.current) {
      const containerTop = wizardContainerRef.current.getBoundingClientRect().top
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const targetPosition = scrollTop + containerTop - headerHeight - 20

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: "smooth",
      })
      return
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  // The steps shown before payment, exactly like the app (spouse only when married and the spouse travels).
  const steps = useMemo(
    () => visibleSteps(formData).map((slug) => ({ slug, number: STEP_TO_NUMBER[slug], ...STEP_TITLES[slug] })),
    [formData.maritalStatus, formData.spouseAccompanying], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const moveTo = useCallback(
    (slug: WizardStep) => {
      setCurrentStep(STEP_TO_NUMBER[slug])
      scrollToWizardTop()
    },
    [scrollToWizardTop],
  )

  const handleNext = useCallback(() => {
    trackEvent("application_step_completed", { step: currentStep, destination: formData.destination })
    setDirection(1)
    const order = visibleSteps(formData)
    const idx = order.indexOf(getStepSlug(currentStep))
    moveTo(order[Math.min(idx + 1, order.length - 1)] ?? "payment")
  }, [currentStep, formData, moveTo])

  const handleBack = useCallback(() => {
    setDirection(-1)
    const order = visibleSteps(formData)
    const idx = order.indexOf(getStepSlug(currentStep))
    moveTo(order[Math.max(idx - 1, 0)] ?? "personal")
  }, [currentStep, formData, moveTo])

  const handleStepClick = useCallback(
    (stepNumber: number) => {
      // Only allow navigation to completed steps (steps before current step)
      if (stepNumber < currentStep) {
        setDirection(-1)
        setCurrentStep(stepNumber)
        scrollToWizardTop()
        setIsMobileDropdownOpen(false)
      }
    },
    [currentStep, scrollToWizardTop],
  )

  useEffect(() => {
    if (typeof window === "undefined" || isInitialized) return

    isMounted.current = true

    try {
      const seeded = paramsToAnswers(searchParams)
      if (seeded.destination) {
        trackEvent("application_started", { destination: seeded.destination })
      }
      const stepSlug = searchParams.get("step") || ""
      const isRetry = searchParams.get("retry") === "true"

      // Check for payment retry
      if (isRetry && stepSlug === "payment") {
        setPaymentError("Your previous payment was not completed. Please try again.")
      }

      let savedData: Partial<FormData> = {}
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY)
      let hasPreviousProgress = false
      if (saved) {
        try {
          savedData = JSON.parse(saved)
          hasPreviousProgress = !!(
            savedData.firstName ||
            savedData.lastName ||
            savedData.email ||
            savedData.phone ||
            savedData.maritalStatus ||
            savedData.destination ||
            savedData.nationality
          )
        } catch (e) {
          console.error("Failed to parse saved form data:", e)
        }
      }

      if (hasPreviousProgress && !openDraftId) {
        setPendingSavedData(savedData)
        setShowResumeModal(true)
        setFormData(coerceAnswers({ ...defaultFormData, ...seeded }))
      } else {
        setFormData(coerceAnswers({ ...defaultFormData, ...(openDraftId ? {} : savedData), ...seeded }))
      }

      if (stepSlug && isValidStep(stepSlug)) {
        setCurrentStep(getStepNumber(stepSlug))
      } else if (isMounted.current) {
        // No or invalid step in the URL: start at the first step
        const params = new URLSearchParams(searchParams.toString())
        params.set("step", getStepSlug(1))
        router.replace(`/apply?${params.toString()}`)
      }

      setIsInitialized(true)
    } catch (error) {
      console.error("Error initializing form:", error)
      setIsInitialized(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fill logged-in user profile if available
  useEffect(() => {
    const loadAuthenticatedUser = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          setFormData((prev) => ({
            ...prev,
            email: prev.email || user.email || "",
            firstName: prev.firstName || (user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || ""),
            lastName: prev.lastName || (user.user_metadata?.last_name || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || ""),
            phone: prev.phone || (user.user_metadata?.phone || ""),
          }))
        }
      } catch {
        // Non-blocking
      }
    }
    loadAuthenticatedUser()
  }, [])

  const totalSteps = steps.length
  const currentVisualStep = Math.max(1, steps.findIndex((s) => s.number === currentStep) + 1)
  const progressPercentage = ((currentVisualStep - 1) / (totalSteps - 1)) * 100

  // Keep the URL in sync with the current step (keeps from/to/draft parameters).
  useEffect(() => {
    if (!isInitialized || isUpdatingUrl.current || !isMounted.current) return

    const currentSlug = searchParams.get("step")
    const expectedSlug = getStepSlug(currentStep)

    if (currentSlug !== expectedSlug) {
      isUpdatingUrl.current = true
      const params = new URLSearchParams()
      params.set("step", expectedSlug)
      for (const key of ["from", "to", "draft"]) {
        const v = searchParams.get(key)
        if (v) params.set(key, v)
      }

      router.replace(`/apply?${params.toString()}`, { scroll: false })

      setTimeout(() => {
        isUpdatingUrl.current = false
      }, 100)
    }
  }, [currentStep, isInitialized, searchParams, router])

  useEffect(() => {
    if (!isInitialized || !isMounted.current) return

    const stepSlug = searchParams.get("step")
    if (stepSlug && isValidStep(stepSlug)) {
      const stepNumber = getStepNumber(stepSlug)
      if (stepNumber !== currentStep && !isUpdatingUrl.current) {
        setCurrentStep(stepNumber)
      }
    }
  }, [searchParams, currentStep, isInitialized])

  // If the spouse step disappears while we are on it (marital status changed), move on.
  useEffect(() => {
    if (!isInitialized) return
    const slug = getStepSlug(currentStep)
    if (!visibleSteps(formData).includes(slug)) setCurrentStep(STEP_TO_NUMBER["trip-details"])
  }, [formData, currentStep, isInitialized])

  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

  const renderStepContent = () => {
    if (!isInitialized) {
      return <div className="p-8 text-center text-muted-foreground">Loading...</div>
    }

    const stepSlug = getStepSlug(currentStep)

    switch (stepSlug) {
      case "personal":
        return (
          <NationalityStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            isLoading={isTransitioning}
          />
        )
      case "spouse":
        return (
          <SpouseStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isTransitioning}
          />
        )
      case "trip-details":
        return (
          <TripDetailsStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isTransitioning}
          />
        )
      case "payment":
        return <PaymentStep formData={formData} onBack={handleBack} isLoading={isTransitioning} paymentError={paymentError} prepareSubmit={draft.prepareSubmit} onSubmitted={draft.forget} />
      default:
        return null
    }
  }

  useEffect(() => {
    if (!isInitialized) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(formData))
        setLastSaved(new Date())
      } catch (error) {
        console.error("Failed to save form data:", error)
      }
    }, AUTO_SAVE_DELAY)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formData, isInitialized])

  const currentTitle = steps.find((s) => s.number === currentStep) ?? steps[0]

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <SiteHeader />

      <div className="flex-1 relative overflow-hidden bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none transform-gpu">
          <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-400/15 via-indigo-400/10 to-primary/5 blur-3xl" />
          <div className="absolute top-[60%] right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-400/10 via-blue-400/8 to-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 pt-28 md:pt-36 pb-16 md:pb-24" ref={wizardContainerRef}>
          {/* Mobile: Title and Progress at Top */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 md:mb-8 text-center lg:hidden"
          >
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">Visa Application</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Complete your application in {totalSteps} simple steps
            </p>
            <div className="max-w-md mx-auto mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-2">
                  <span>Step {currentVisualStep} of {totalSteps}</span>
                  <DraftStatus status={draft.status} signedIn={draft.signedIn} savedLocally={!!lastSaved} onRetry={draft.retry} />
                </div>
                <span>{Math.round(progressPercentage)}% complete</span>
              </div>
              <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>

          <div className="mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-7xl">
            <div className="w-full lg:w-80 shrink-0">
              {/* Desktop: Title, Progress, and Steps in Left Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block mb-6"
              >
                <h1 className="text-3xl text-foreground mb-2 font-semibold tracking-tight">Visa Application</h1>

                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-2">
                      <span>Step {currentVisualStep} of {totalSteps}</span>
                      <DraftStatus status={draft.status} signedIn={draft.signedIn} savedLocally={!!lastSaved} onRetry={draft.retry} />
                    </div>
                    <span>{Math.round(progressPercentage)}% complete</span>
                  </div>
                  <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Mobile: Dropdown steps */}
              <div className="lg:hidden mb-4">
                <button
                  type="button"
                  onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                  aria-expanded={isMobileDropdownOpen}
                  className="w-full flex items-center justify-between p-4 rounded-md bg-card border border-border/80 shadow-sm cursor-pointer transition-all duration-200 hover:bg-secondary text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-sm flex items-center justify-center font-bold bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 shrink-0">
                      {currentVisualStep}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight text-foreground">{currentTitle?.title}</p>
                      <p className="text-xs text-muted-foreground">{currentTitle?.description}</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isMobileDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isMobileDropdownOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mt-2 space-y-1 bg-card rounded-md shadow-lg border border-border/80 p-1"
                    >
                      {steps.map((step, index) => (
                        <button
                          type="button"
                          key={step.slug}
                          onClick={() => handleStepClick(step.number)}
                          disabled={step.number > currentStep}
                          className={`w-full flex items-start gap-4 p-3 rounded-md transition-all text-left ${
                            currentStep === step.number
                              ? "bg-secondary text-foreground font-bold"
                              : currentStep > step.number
                                ? "cursor-pointer hover:bg-secondary"
                                : "cursor-not-allowed opacity-50"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-sm flex items-center justify-center font-bold text-xs shrink-0 ${
                              currentStep === step.number
                                ? "bg-primary text-primary-foreground"
                                : currentStep > step.number
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-secondary text-muted-foreground border border-border"
                            }`}
                          >
                            {currentStep > step.number ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{step.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop: Vertical steps sidebar */}
              <div className="hidden lg:block space-y-3">
                {steps.map((step, index) => (
                  <motion.button
                    type="button"
                    key={step.slug}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    onClick={() => handleStepClick(step.number)}
                    disabled={step.number > currentStep}
                    className={`w-full flex items-start gap-4 p-4 rounded-md transition-all duration-300 text-left ${
                      currentStep === step.number
                        ? "bg-card border border-border/80 shadow-md text-foreground font-medium scale-[1.02] relative pl-5 after:absolute after:left-0 after:top-3 after:bottom-3 after:w-[3px] after:bg-primary after:rounded-r-sm"
                        : currentStep > step.number
                          ? "bg-secondary/60 border border-border/40 cursor-pointer hover:bg-secondary text-foreground/80 hover:shadow-sm"
                          : "bg-transparent border border-transparent cursor-not-allowed opacity-50 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-sm flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                        currentStep === step.number
                          ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                          : currentStep > step.number
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {currentStep > step.number ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm tracking-tight">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </motion.button>
                ))}
                <p className="px-4 pt-2 text-xs text-muted-foreground leading-relaxed">
                  After payment: passport number and employment details, then your documents. The same steps as in the EZvisa app.
                </p>
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-8 min-w-0">
              <Card className="border border-border/80 bg-card shadow-xl rounded-md overflow-hidden transition-all duration-300">
                <CardContent className="p-6 md:p-8 overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={{
                        enter: (direction: number) => ({
                          x: direction > 0 ? 50 : -50,
                          opacity: 0,
                        }),
                        center: {
                          x: 0,
                          opacity: 1,
                        },
                        exit: (direction: number) => ({
                          x: direction > 0 ? -50 : 50,
                          opacity: 0,
                        }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 380, damping: 38 },
                        opacity: { duration: 0.15 },
                      }}
                    >
                      {renderStepContent()}
                    </motion.div>
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <DraftConflictDialog conflict={draft.conflict} onChoose={draft.resolveConflict} />

      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 md:backdrop-blur-md animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="resume-title">
          <div className="bg-card border border-border/80 shadow-xl rounded-md p-6 md:p-8 max-w-md w-full animate-in zoom-in-95 duration-200 flex flex-col gap-5">
            <div className="space-y-2">
              <h3 id="resume-title" className="text-xl font-semibold tracking-tight text-foreground">Continue Application?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We found a previous in-progress visa application. Would you like to restore your details or start fresh?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartFresh}
                className="flex-1 h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground cursor-pointer flex items-center justify-center active:scale-95"
              >
                Start Fresh
              </button>
              <button
                type="button"
                onClick={handleContinuePrevious}
                className="flex-1 h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center"
              >
                Restore Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[100dvh]">Loading...</div>}>
      <ApplyPageContent />
    </Suspense>
  )
}
