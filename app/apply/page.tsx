"use client"

import { DEFAULT_RESIDENCE, coerceResidence } from "@/lib/residence"
import { useState, Suspense, useCallback, useEffect, useRef } from "react"
import { NationalityStep } from "@/components/apply/nationality-step"
import { TripDetailsStep } from "@/components/apply/trip-details-step"
import { PaymentStep } from "@/components/apply/payment-step"
import { SpouseStep } from "@/components/apply/spouse-step"
import { WizardShell } from "@/components/apply/wizard-shell"
import { SiteHeader } from "@/components/site-header"
import { LangText } from "@/components/lang-text"
import { useSearchParams, useRouter } from "next/navigation"
import { trackEvent } from "@/lib/analytics"
import { getStepSlug, getStepNumber, isValidStep } from "@/lib/wizard-steps"
import { createBrowserClient } from "@/lib/supabase/client"
import { toCitizenshipIso } from "@/lib/nationalities"

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
  whatsappOptIn?: boolean
  dateOfBirth: string
  passportNumber: string
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
  travelMonth: string
  tripLength: string
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
  countryOfResidence: DEFAULT_RESIDENCE,
  cityOfResidence: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  whatsappOptIn: true,
  dateOfBirth: "",
  passportNumber: "",
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
  travelMonth: "",
  tripLength: "",
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
  const [direction, setDirection] = useState(1)
  const [tripScreen, setTripScreen] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const [showResumeModal, setShowResumeModal] = useState(false)
  const [pendingSavedData, setPendingSavedData] = useState<Partial<WizardFormData> | null>(null)

  const isUpdatingUrl = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wizardContainerRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(false)

  // Residence UAE only, city = emirate: coerce restored drafts and links (invalid city is cleared).
  useEffect(() => {
    const c = coerceResidence(formData)
    if (c.countryOfResidence !== formData.countryOfResidence || c.cityOfResidence !== formData.cityOfResidence) setFormData(c)
  }, [formData])

  const handleContinuePrevious = useCallback(() => {
    if (pendingSavedData) {
      const fromCountry = searchParams.get("from") || searchParams.get("nationality") || ""
      const toCountry = searchParams.get("to") || searchParams.get("destination") || ""
      const travelStartDate = searchParams.get("travelStartDate") || ""
      const travelEndDate = searchParams.get("travelEndDate") || ""
      
      setFormData({
        ...defaultFormData,
        ...pendingSavedData,
        ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
        ...(toCountry && { destination: toCountry }),
        ...(travelStartDate && { travelStartDate }),
        ...(travelEndDate && { travelEndDate }),
      })
    }
    setShowResumeModal(false)
  }, [pendingSavedData, searchParams])

  const handleStartFresh = useCallback(() => {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
    const fromCountry = searchParams.get("from") || searchParams.get("nationality") || ""
    const toCountry = searchParams.get("to") || searchParams.get("destination") || ""
    const travelStartDate = searchParams.get("travelStartDate") || ""
    const travelEndDate = searchParams.get("travelEndDate") || ""
    
    setFormData({
      ...defaultFormData,
      ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
      ...(toCountry && { destination: toCountry }),
      ...(travelStartDate && { travelStartDate }),
      ...(travelEndDate && { travelEndDate }),
    })
    
    const slug = getStepSlug(1)
    setCurrentStep(1)
    setTripScreen(0)
    router.replace(
      `/apply?step=${slug}${fromCountry ? `&from=${fromCountry}` : ""}${toCountry ? `&to=${toCountry}` : ""}`,
      { scroll: false }
    )
    
    setShowResumeModal(false)
  }, [router, searchParams])

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
    trackEvent("application_step_completed", { step: currentStep, destination: formData.destination })
    const shouldShowSpouse = formData.maritalStatus === "married" && formData.spouseAccompanying === "yes"
    const tentative = currentStep + 1
    // Employment is asked after payment on /continue/[id]. Skip spouse when they are not travelling.
    const nextStep =
      tentative === 3 || (tentative === 2 && !shouldShowSpouse) ? 4 : Math.min(tentative, 5)
    if (currentStep < 4 && nextStep === 4) setTripScreen(0)
    setDirection(1)
    setCurrentStep(nextStep)
    scrollToWizardTop()
  }, [currentStep, formData.destination, formData.maritalStatus, formData.spouseAccompanying, scrollToWizardTop])

  const handleBack = useCallback(() => {
    setDirection(-1)
    setCurrentStep((prevStep) => {
      const previousStep = prevStep - 1
      const shouldShowSpouse = formData.maritalStatus === "married" && formData.spouseAccompanying === "yes"
      
      // Skip spouse step (step 2) when going back if not needed
      if (previousStep === 3 || (previousStep === 2 && !shouldShowSpouse)) {
        return shouldShowSpouse ? 2 : 1
      }
      
      return Math.max(previousStep, 1)
    })
    scrollToWizardTop()
  }, [formData.maritalStatus, formData.spouseAccompanying, scrollToWizardTop])

  useEffect(() => {
    if (typeof window === "undefined" || isInitialized) return

    isMounted.current = true

    try {
      const fromCountry = searchParams.get("from") || searchParams.get("nationality") || ""
      const toCountry = searchParams.get("to") || searchParams.get("destination") || ""
      const travelStartDate = searchParams.get("travelStartDate") || ""
      const travelEndDate = searchParams.get("travelEndDate") || ""
      
      if (toCountry) {
        trackEvent("application_started", { destination: toCountry })
      }
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
          ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
          ...(toCountry && { destination: toCountry }),
          ...(travelStartDate && { travelStartDate }),
          ...(travelEndDate && { travelEndDate }),
        })
      } else {
        setFormData({
          ...defaultFormData,
          ...savedData,
          ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
          ...(toCountry && { destination: toCountry }),
          ...(travelStartDate && { travelStartDate }),
          ...(travelEndDate && { travelEndDate }),
        })
      }

      if (stepSlug && isValidStep(stepSlug)) {
        const stepNumber = stepSlug === "employment" ? 4 : getStepNumber(stepSlug)
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
      } catch (err) {
        // Non-blocking
      }
    }
    loadAuthenticatedUser()
  }, [])

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
      const stepNumber = stepSlug === "employment" ? 4 : getStepNumber(stepSlug)
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
      case "trip-details":
        return (
          <TripDetailsStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isTransitioning}
            screen={tripScreen}
            onScreenChange={setTripScreen}
          />
        )
      case "payment":
      case "documents":
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
    <div className="min-h-[100dvh] bg-[#FFFFFF]" ref={wizardContainerRef}>
      <SiteHeader />
      <WizardShell step={currentStep} motionKey={String(currentStep)} direction={direction} formData={formData}>
        {renderStepContent()}
      </WizardShell>

      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1F]/40 p-4">
          <div className="flex w-full max-w-md flex-col gap-5 border border-[#E3E7EF] bg-[#FFFFFF] p-6 md:p-8">
            <div className="space-y-2">
              <h2 className="wizard-question text-[#0A0F1F]">
                <LangText en="Continue your application?" ar="هل تتابع طلبك؟" />
              </h2>
              <p className="text-[15px] leading-relaxed text-[#5B6475]">
                <LangText
                  en="We found an application you already started. Restore those details, or start again."
                  ar="وجدنا طلبًا بدأته من قبل. يمكنك استعادة البيانات أو البدء من جديد."
                />
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleStartFresh}
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#E3E7EF] text-[15px] font-medium text-[#0A0F1F]"
              >
                <LangText en="Start again" ar="ابدأ من جديد" />
              </button>
              <button
                type="button"
                onClick={handleContinuePrevious}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#0436DC] text-[15px] font-semibold text-white"
              >
                <LangText en="Restore details" ar="استعد البيانات" />
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
