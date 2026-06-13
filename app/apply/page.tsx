"use client"

import { useState, Suspense, useCallback, useMemo, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { NationalityStep } from "@/components/apply/nationality-step"
import { TripDetailsStep } from "@/components/apply/trip-details-step"
import { DocumentsStep } from "@/components/apply/documents-step"
import { PaymentStep } from "@/components/apply/payment-step"
import { EmploymentStep } from "@/components/apply/employment-step"
import { SpouseStep } from "@/components/apply/spouse-step"
import { CheckCircle2, ChevronDown } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { getStepSlug, getStepNumber, isValidStep } from "@/lib/wizard-steps"

const WIZARD_STORAGE_KEY = "visa_wizard_data"
const AUTO_SAVE_DELAY = 300

interface WizardFormData {
  // Step 1: Personal & Profile Information
  nationality: string
  countryOfResidence: string
  cityOfResidence: string
  firstName: string
  lastName: string
  email: string
  phone: string
  maritalStatus: "single" | "married" | "divorced" | "widowed" | ""
  employmentStatus: "employed" | "business" | "freelancer" | "student" | "unemployed" | "retired" | ""
  spouseNationality?: string
  hasValidPassport: "yes" | "no" | undefined
  // Conditional employment fields
  jobTitle: string
  companyName: string
  employmentStartDate: string
  monthlySalary: string
  hasNOC: "yes" | "no" | undefined
  industry: string
  yearsOfExperience: string
  averageMonthlyIncome: string
  // Step 2: Employment
  employmentDetails: string
  // Step 2/3: Spouse Information (if married and accompanying)
  spouseFirstName: string
  spouseLastName: string
  spouseHasValidPassport: "yes" | "no" | undefined
  spouseOccupation: string
  // Step 3: Trip Details & Travel Intent
  destination: string
  purposeOfTrip: string
  isFirstSchengenVisa: string
  previousTravel: string[]
  travelingWith: string
  travelStyle: string
  preferredCities: string[]
  travelStartDate: string
  travelEndDate: string
  datesFlexible: string
  // Step 4: Accommodation, Budget & Documents
  hotelCategory: string
  roomType: string
  preferredLocation: string
  hasBankStatement: string
  balanceRange: string
  fundingSource: string
  previousRefusals: string
  refusalDetails?: string
  passportCopy: File | null
  residencyCopy: File | null
  photo: File | null
  nocSalaryCertificate: File | null
  previousVisas: File | null
  spouseAccompanying: "yes" | "no" | undefined
  willVisitOtherCountries?: "yes" | "no"
  // Additional countries for itinerary
  additionalCountries: Array<{ country: string; arrivalDate: string; departureDate: string }>
  itinerary: string
  // Step 5: Declaration
  declarationAccepted: boolean
  documentsUploadLater?: boolean

  // Missing fields for steps types compatibility
  hasEmiratesId: "yes" | "no" | undefined
  passportPhoto: File | null
  passportFront: File | null
  passportBack: File | null
  bankStatement: File | null
  nocCertificate: File | null
  salaryCertificate: File | null
  spousePassportPhoto: File | null
  spousePassportFront: File | null
  spousePassportBack: File | null
  spouseBankStatement: File | null
  spouseNocCertificate: File | null
  spouseSalaryCertificate: File | null
  spousePhoto: File | null
}

const defaultFormData: WizardFormData = {
  nationality: "",
  countryOfResidence: "",
  cityOfResidence: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  maritalStatus: "",
  employmentStatus: "",
  jobTitle: "",
  companyName: "",
  employmentStartDate: "",
  monthlySalary: "",
  hasNOC: undefined,
  industry: "",
  yearsOfExperience: "",
  averageMonthlyIncome: "",
  spouseNationality: "",
  hasValidPassport: undefined,
  spouseFirstName: "",
  spouseLastName: "",
  spouseHasValidPassport: undefined,
  spouseOccupation: "",
  employmentDetails: "",
  destination: "",
  purposeOfTrip: "",
  isFirstSchengenVisa: "",
  previousTravel: [],
  travelingWith: "",
  travelStyle: "",
  preferredCities: [],
  travelStartDate: "",
  travelEndDate: "",
  datesFlexible: "",
  hotelCategory: "",
  roomType: "",
  preferredLocation: "",
  hasBankStatement: "",
  balanceRange: "",
  fundingSource: "",
  previousRefusals: "",
  passportCopy: null,
  residencyCopy: null,
  photo: null,
  nocSalaryCertificate: null,
  previousVisas: null,
  spouseAccompanying: undefined,
  additionalCountries: [],
  itinerary: "",
  declarationAccepted: false,
  documentsUploadLater: false,

  // Missing fields initialization
  hasEmiratesId: undefined,
  passportPhoto: null,
  passportFront: null,
  passportBack: null,
  bankStatement: null,
  nocCertificate: null,
  salaryCertificate: null,
  spousePassportPhoto: null,
  spousePassportFront: null,
  spousePassportBack: null,
  spouseBankStatement: null,
  spouseNocCertificate: null,
  spouseSalaryCertificate: null,
  spousePhoto: null,
}

function ApplyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [formData, setFormData] = useState<WizardFormData>(defaultFormData)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const [showResumeModal, setShowResumeModal] = useState(false)
  const [pendingSavedData, setPendingSavedData] = useState<Partial<WizardFormData> | null>(null)

  const isUpdatingUrl = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wizardContainerRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(false)

  const handleContinuePrevious = useCallback(() => {
    if (pendingSavedData) {
      const fromCountry = searchParams.get("from") || ""
      const toCountry = searchParams.get("to") || ""
      
      setFormData({
        ...defaultFormData,
        ...pendingSavedData,
        ...(fromCountry && { nationality: fromCountry }),
        ...(toCountry && { destination: toCountry }),
      })
    }
    setShowResumeModal(false)
  }, [pendingSavedData, searchParams])

  const handleStartFresh = useCallback(() => {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
    const fromCountry = searchParams.get("from") || ""
    const toCountry = searchParams.get("to") || ""
    
    setFormData({
      ...defaultFormData,
      ...(fromCountry && { nationality: fromCountry }),
      ...(toCountry && { destination: toCountry }),
    })
    
    const slug = getStepSlug(1)
    setCurrentStep(1)
    router.replace(
      `/apply?step=${slug}${fromCountry ? `&from=${fromCountry}` : ""}${toCountry ? `&to=${toCountry}` : ""}`,
      { scroll: false }
    )
    
    setShowResumeModal(false)
  }, [router])

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

    setTimeout(() => {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }, 100)
  }, [])

  const handleNext = useCallback(() => {
    setDirection(1)
    setCurrentStep((prevStep) => {
      const nextStep = prevStep + 1
      const shouldShowSpouse = formData.maritalStatus === "married" && formData.spouseAccompanying === "yes"
      
      // Skip spouse step (step 2) if not needed
      if (nextStep === 2 && !shouldShowSpouse) {
        return 3 // Skip to employment
      }
      
      return Math.min(nextStep, 6)
    })
    scrollToWizardTop()
  }, [formData.maritalStatus, formData.spouseAccompanying, scrollToWizardTop])

  const handleBack = useCallback(() => {
    setDirection(-1)
    setCurrentStep((prevStep) => {
      const previousStep = prevStep - 1
      const shouldShowSpouse = formData.maritalStatus === "married" && formData.spouseAccompanying === "yes"
      
      // Skip spouse step (step 2) when going back if not needed
      if (previousStep === 2 && !shouldShowSpouse) {
        return 1 // Skip back to personal
      }
      
      return Math.max(previousStep, 1)
    })
    scrollToWizardTop()
  }, [formData.maritalStatus, formData.spouseAccompanying, scrollToWizardTop])

  const handleStepClick = useCallback((stepNumber: number) => {
    // Only allow navigation to completed steps (steps before current step)
    if (stepNumber < currentStep) {
      setDirection(stepNumber < currentStep ? -1 : 1)
      setCurrentStep(stepNumber)
      scrollToWizardTop()
      setIsMobileDropdownOpen(false)
    }
  }, [currentStep, scrollToWizardTop])

  useEffect(() => {
    if (typeof window === "undefined" || isInitialized) return

    isMounted.current = true

    try {
      const fromCountry = searchParams.get("from") || ""
      const toCountry = searchParams.get("to") || ""
      const stepSlug = searchParams.get("step") || ""
      const isRetry = searchParams.get("retry") === "true"

      // Check for payment retry
      if (isRetry && stepSlug === "payment") {
        setPaymentError("Your previous payment was not completed. Please try again.")
      }

      let savedData: Partial<WizardFormData> = {}
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
            savedData.employmentStatus ||
            savedData.destination ||
            savedData.nationality
          )
        } catch (e) {
          console.error("Failed to parse saved form data:", e)
        }
      }

      if (hasPreviousProgress) {
        setPendingSavedData(savedData)
        setShowResumeModal(true)
        setFormData({
          ...defaultFormData,
          ...(fromCountry && { nationality: fromCountry }),
          ...(toCountry && { destination: toCountry }),
        })
      } else {
        setFormData({
          ...defaultFormData,
          ...savedData,
          ...(fromCountry && { nationality: fromCountry }),
          ...(toCountry && { destination: toCountry }),
        })
      }

      if (stepSlug && isValidStep(stepSlug)) {
        const stepNumber = getStepNumber(stepSlug)
        setCurrentStep(stepNumber)
      } else if (stepSlug) {
        // Invalid step, redirect to personal step
        const slug = getStepSlug(1)
        if (isMounted.current) {
          router.replace(
            `/apply?step=${slug}${fromCountry ? `&from=${fromCountry}` : ""}${toCountry ? `&to=${toCountry}` : ""}`,
          )
        }
      } else {
        // No step in URL, set default
        const slug = getStepSlug(1)
        if (isMounted.current) {
          router.replace(
            `/apply?step=${slug}${fromCountry ? `&from=${fromCountry}` : ""}${toCountry ? `&to=${toCountry}` : ""}`,
          )
        }
      }

      setIsInitialized(true)
    } catch (error) {
      console.error("Error initializing form:", error)
      setIsInitialized(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const steps = useMemo(() => {
    const shouldShowSpouseStep = formData.maritalStatus === "married" && formData.spouseAccompanying === "yes"

    if (shouldShowSpouseStep) {
      return [
        { number: 1, title: "Personal Information", description: "Profile & contact details" },
        { number: 2, title: "Spouse Information", description: "Spouse details" },
        { number: 3, title: "Employment", description: "Work & income details" },
        { number: 4, title: "Trip Details", description: "Travel intent & preferences" },
        { number: 5, title: "Documents", description: "Required documents" },
        { number: 6, title: "Review & Payment", description: "Confirm & complete payment" },
      ]
    }

    return [
      { number: 1, title: "Personal Information", description: "Profile & contact details" },
      { number: 3, title: "Employment", description: "Work & income details" },
      { number: 4, title: "Trip Details", description: "Travel intent & preferences" },
      { number: 5, title: "Documents", description: "Required documents" },
      { number: 6, title: "Review & Payment", description: "Confirm & complete payment" },
    ]
  }, [formData.maritalStatus, formData.spouseAccompanying])

  const totalSteps = steps.length
  const currentVisualStep = Math.max(1, steps.findIndex((s) => s.number === currentStep) + 1)
  const progressPercentage = ((currentVisualStep - 1) / (totalSteps - 1)) * 100

  useEffect(() => {
    if (!isInitialized || isUpdatingUrl.current || !isMounted.current) return

    const currentSlug = searchParams.get("step")
    const expectedSlug = getStepSlug(currentStep)

    if (currentSlug !== expectedSlug) {
      isUpdatingUrl.current = true
      const fromCountry = searchParams.get("from") || ""
      const toCountry = searchParams.get("to") || ""

      const params = new URLSearchParams()
      params.set("step", expectedSlug)
      if (fromCountry) params.set("from", fromCountry)
      if (toCountry) params.set("to", toCountry)

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
      case "employment":
        return (
          <EmploymentStep
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
      case "documents":
        return (
          <DocumentsStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isTransitioning}
          />
        )
      case "payment":
        return <PaymentStep formData={formData} onBack={handleBack} isLoading={isTransitioning} paymentError={paymentError} />
      default:
        return null
    }
  }

  const updateFormData = useCallback((data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

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

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className="flex-1 relative overflow-hidden bg-background">
        {/* Aurora Mesh Gradient Background - Lighter */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated gradient orbs */}
          <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-400/15 via-indigo-400/10 to-purple-400/5 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-violet-400/12 via-blue-300/8 to-cyan-300/5 blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute top-[60%] right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-400/10 via-blue-400/8 to-primary/5 blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
          
          {/* Mesh overlay for texture */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_50%)] opacity-40" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-15" />
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
                <span>
                  Step {currentVisualStep} of {totalSteps}
                </span>
                <span>{Math.round(progressPercentage)}% complete</span>
              </div>
              <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.3)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>

          <div className="mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8" style={{ maxWidth: '1312px' }}>
            <div className="w-full lg:w-80 shrink-0">
              {/* Desktop: Title, Progress, and Steps in Left Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block mb-6"
              >
                <h1 className="text-3xl text-foreground mb-2 font-medium tracking-tight">Visa Application</h1>
                
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>
                      Step {currentVisualStep} of {totalSteps}
                    </span>
                    <span>{Math.round(progressPercentage)}% complete</span>
                  </div>
                  <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.3)] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
              
              {/* Mobile: Dropdown steps */}
              <div className="lg:hidden mb-4">
                <div
                  onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                  className="flex items-center justify-between p-4 rounded-xl bg-background/80 border border-border/80 shadow-md backdrop-blur-md cursor-pointer transition-all duration-200 hover:bg-background/95"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-blue-600 text-white shadow-sm ring-4 ring-blue-500/10 shrink-0">
                      {currentVisualStep}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{steps.find((s) => s.number === currentStep)?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {steps.find((s) => s.number === currentStep)?.description}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isMobileDropdownOpen ? "rotate-180" : ""}`} />
                </div>

                <AnimatePresence>
                  {isMobileDropdownOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mt-2 space-y-1 bg-background/95 backdrop-blur-md rounded-xl shadow-lg border border-border/80 p-1"
                    >
                      {steps.map((step, index) => (
                        <div
                          key={step.number}
                          onClick={() => handleStepClick(step.number)}
                          className={`flex items-start gap-4 p-3 rounded-lg transition-all ${
                            currentStep === step.number
                                ? "bg-muted/65 text-foreground font-medium"
                                : currentStep > step.number
                                  ? "cursor-pointer hover:bg-muted/40"
                                  : "cursor-not-allowed opacity-50"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                              currentStep === step.number
                                ? "bg-blue-600 text-white"
                                : currentStep > step.number
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-muted text-muted-foreground/60 border border-border/60"
                            }`}
                          >
                            {currentStep > step.number ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{step.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop: Vertical steps sidebar */}
              <div className="hidden lg:block space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    onClick={() => handleStepClick(step.number)}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                      currentStep === step.number
                        ? "bg-background/80 backdrop-blur-md border border-border shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-foreground font-medium scale-[1.02] relative pl-5 after:absolute after:left-0 after:top-3 after:bottom-3 after:w-1 after:bg-blue-600 after:rounded-r-md"
                        : currentStep > step.number
                          ? "bg-background/40 backdrop-blur-sm border border-border/40 cursor-pointer hover:bg-background/60 hover:scale-[1.01] text-foreground/80 hover:shadow-sm"
                          : "bg-muted/10 border border-transparent cursor-not-allowed opacity-50 text-muted-foreground/50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 transition-all ${
                        currentStep === step.number
                          ? "bg-blue-600 text-white shadow-sm ring-4 ring-blue-500/10"
                          : currentStep > step.number
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground/50 border border-border/60"
                      }`}
                    >
                      {currentStep > step.number ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-8">
              <Card className="border border-border/50 bg-card/45 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden transition-all duration-300">
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

      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl rounded-3xl p-6 md:p-8 max-w-md w-full animate-in zoom-in-95 duration-200 flex flex-col gap-5">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Continue Application?</h3>
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ApplyPageContent />
    </Suspense>
  )
}
