"use client"

import { DEFAULT_RESIDENCE, coerceResidence } from "@/lib/residence"
import { useState, Suspense, useCallback, useEffect, useRef } from "react"
import { NationalityStep } from "@/components/apply/nationality-step"
import { DestinationStep } from "@/components/apply/destination-step"
import { PaymentStep } from "@/components/apply/payment-step"
import { WizardShell } from "@/components/apply/wizard-shell"
import { WizardAccount } from "@/components/apply/wizard-account"
import { SiteHeader } from "@/components/site-header"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"
import { useSearchParams, useRouter } from "next/navigation"
import { useSiteLocale } from "@/components/locale-provider"
import { localizePath } from "@/lib/route-path"
import { trackEvent } from "@/lib/analytics"
import { getStepSlug, getStepNumber, isValidStep } from "@/lib/wizard-steps"
import { createBrowserClient } from "@/lib/supabase/client"
import { applePersonName } from "@/lib/auth/apple-profile"
import { accountBirthDate } from "@/lib/auth/account-details"
import { toCitizenshipIso } from "@/lib/nationalities"
import { fetchAccountNationality, readRememberedNationality, rememberNationality } from "@/lib/remembered-nationality"
import { TRAVELLER_NONE, applyTravellerToWebForm, isFreshTravellerForm, markTravellerUsed, useTravellers } from "@/lib/travellers-client"
import { defaultTraveller, type Traveller } from "@/lib/shared/wizard-contract"
import { citizenshipName } from "@/lib/nationalities"

import { CHECKOUT_STORAGE_KEY, WIZARD_STORAGE_KEY, WIZARD_STEP_STORAGE_KEY, RESUME_DISMISSED_KEY, announceWizardDraftChange } from "@/lib/wizard-storage"
const AUTO_SAVE_DELAY = 300

interface WizardFormData {
  insurancePreference?: "quote" | "own"
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
  /** Saved traveller the traveller step was filled from ("none" = the customer chose "Someone else"). */
  travellerId?: string
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
  // Filled after payment on /continue. Still sent with the application payload.
  employmentDetails: string
  // Spouse, when married and accompanying
  spouseFirstName: string
  spouseLastName: string
  spouseHasValidPassport: "yes" | "no" | undefined
  spouseOccupation: string
  // Trip
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
  travellerId: "",
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
  const arabic = useSiteLocale() === "ar"
  const localizeApplyPath = (path: string) => localizePath(path, arabic)

  const [formData, setFormData] = useState<WizardFormData>(defaultFormData)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(1)
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

  // Preselect the nationality next time: remember every valid choice on this device.
  useEffect(() => {
    if (formData.nationality) rememberNationality(formData.nationality)
  }, [formData.nationality])

  // Nothing on this device (new browser): use the signed-in customer's latest application, if any.
  useEffect(() => {
    if (!isInitialized) return
    let alive = true
    fetchAccountNationality().then((iso) => {
      if (alive && iso) setFormData((f) => (f.nationality ? f : { ...f, nationality: iso }))
    })
    return () => {
      alive = false
    }
  }, [isInitialized])

  const handleContinuePrevious = useCallback(() => {
    if (pendingSavedData) {
      const fromCountry = searchParams.get("from") || searchParams.get("nationality") || ""
      const toCountry = searchParams.get("to") || searchParams.get("destination") || ""
      const travelStartDate = searchParams.get("travelStartDate") || ""
      const travelEndDate = searchParams.get("travelEndDate") || ""
      
      setFormData({
        ...defaultFormData,
        ...pendingSavedData,
        nationality: pendingSavedData.nationality || readRememberedNationality(),
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
    localStorage.removeItem(WIZARD_STEP_STORAGE_KEY)
    announceWizardDraftChange()
    // A new application must not pay the one this tab created earlier.
    try { sessionStorage.removeItem(CHECKOUT_STORAGE_KEY) } catch { /* storage unavailable */ }
    const fromCountry = searchParams.get("from") || searchParams.get("nationality") || ""
    const toCountry = searchParams.get("to") || searchParams.get("destination") || ""
    const travelStartDate = searchParams.get("travelStartDate") || ""
    const travelEndDate = searchParams.get("travelEndDate") || ""
    
    setFormData({
      ...defaultFormData,
      nationality: readRememberedNationality(),
      ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
      ...(toCountry && { destination: toCountry }),
      ...(travelStartDate && { travelStartDate }),
      ...(travelEndDate && { travelEndDate }),
    })
    
    const slug = getStepSlug(1)
    setCurrentStep(1)
    router.replace(
      localizeApplyPath(`/apply?step=${slug}${fromCountry ? `&from=${encodeURIComponent(fromCountry)}` : ""}${toCountry ? `&to=${encodeURIComponent(toCountry)}` : ""}`),
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
    const nextStep = currentStep <= 1 ? 2 : 4
    setDirection(1)
    setCurrentStep(nextStep)
    scrollToWizardTop()
  }, [currentStep, formData.destination, scrollToWizardTop])

  const handleBack = useCallback(() => {
    setDirection(-1)
    setCurrentStep((prevStep) => prevStep >= 4 ? 2 : 1)
    scrollToWizardTop()
  }, [scrollToWizardTop])

  const editTrip = useCallback(() => {
    setDirection(-1)
    setCurrentStep(1)
    scrollToWizardTop()
  }, [scrollToWizardTop])

  const editTraveller = useCallback(() => {
    setDirection(-1)
    setCurrentStep(2)
    scrollToWizardTop()
  }, [scrollToWizardTop])

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
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) savedData = parsed
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

      if (hasPreviousProgress && searchParams.get("resume") === "1") {
        // The website's Continue box is an explicit choice to restore this device's saved answers.
        setFormData({ ...defaultFormData, ...savedData, nationality: savedData.nationality || readRememberedNationality() })
      } else if (hasPreviousProgress) {
        setPendingSavedData(savedData)
        setShowResumeModal(true)
        setFormData({
          ...defaultFormData,
          nationality: readRememberedNationality(),
          ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
          ...(toCountry && { destination: toCountry }),
          ...(travelStartDate && { travelStartDate }),
          ...(travelEndDate && { travelEndDate }),
        })
      } else {
        setFormData({
          ...defaultFormData,
          ...savedData,
          nationality: savedData.nationality || readRememberedNationality(),
          ...(toCitizenshipIso(fromCountry) ? { nationality: toCitizenshipIso(fromCountry) } : {}),
          ...(toCountry && { destination: toCountry }),
          ...(travelStartDate && { travelStartDate }),
          ...(travelEndDate && { travelEndDate }),
        })
      }

      if (stepSlug && isValidStep(stepSlug)) {
        setCurrentStep(getStepNumber(stepSlug))
      } else if (stepSlug) {
        // Dropped slugs (employment, documents) and anything else start on Destination.
        const slug = getStepSlug(1)
        if (isMounted.current) {
          router.replace(
            localizeApplyPath(`/apply?step=${slug}${fromCountry ? `&from=${encodeURIComponent(fromCountry)}` : ""}${toCountry ? `&to=${encodeURIComponent(toCountry)}` : ""}`),
          )
        }
      } else {
        // No step in URL, set default
        const slug = getStepSlug(1)
        if (isMounted.current) {
          router.replace(
            localizeApplyPath(`/apply?step=${slug}${fromCountry ? `&from=${encodeURIComponent(fromCountry)}` : ""}${toCountry ? `&to=${encodeURIComponent(toCountry)}` : ""}`),
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

  // Saved travellers of the signed-in customer (lib/travellers.ts): the "Who is travelling?" drop-down.
  const { travellers, email: accountEmail, loaded: travellersLoaded, error: travellersError, refresh: refreshTravellers } = useTravellers()
  const [travellerNotice, setTravellerNotice] = useState<{ nationality: string } | null>(null)
  const initialTravellerChecked = useRef(false)

  /** Fill the traveller step from a saved traveller (null = "Someone else"). Every field stays editable. */
  const pickTraveller = useCallback((t: Traveller | null) => {
    if (!t) {
      setTravellerNotice(null)
      setFormData((prev) => ({ ...prev, travellerId: TRAVELLER_NONE }))
      return
    }
    const next = applyTravellerToWebForm(formData, t)
    setTravellerNotice(formData.nationality && next.nationality !== formData.nationality ? { nationality: citizenshipName(next.nationality) || next.nationality } : null)
    setFormData(next)
    markTravellerUsed(t.id)
    trackEvent("traveller_picked", { source: "saved", count: travellers.length })
  }, [formData, travellers.length])

  // Signed in, nothing typed yet: preselect a saved traveller (the one marked "You", else the most recently used).
  // A resumed draft that already has a name, or a form where "Someone else" was chosen, is never touched.
  useEffect(() => {
    if (!isInitialized || showResumeModal || !travellersLoaded || initialTravellerChecked.current) return
    // Prefill only when already signed in on arrival. In-wizard sign-in leaves the draft alone until a choice is made.
    initialTravellerChecked.current = true
    if (!travellers.length) return
    setFormData((prev) => {
      if (!isFreshTravellerForm(prev) || prev.travellerId === TRAVELLER_NONE || (prev.travellerId && travellers.some((t) => t.id === prev.travellerId))) return prev
      const t = defaultTraveller(travellers)
      return t ? applyTravellerToWebForm(prev, t) : prev
    })
  }, [isInitialized, showResumeModal, travellers, travellersLoaded])

  // No saved travellers: fill name, email and phone from the account's profile, as before.
  useEffect(() => {
    if (!travellersLoaded || !accountEmail) return
    setFormData((prev) => (prev.email ? prev : { ...prev, email: accountEmail }))
    if (travellers.length) return
    const loadAuthenticatedUser = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          const person = applePersonName(user.user_metadata, user.email, user.identities)
          setFormData((prev) => ({
            ...prev,
            email: prev.email || user.email || "",
            firstName: prev.firstName || person?.first || "",
            lastName: prev.lastName || person?.last || "",
            dateOfBirth: prev.dateOfBirth || (prev.travellerId !== TRAVELLER_NONE && ((!prev.firstName && !prev.lastName) || (prev.firstName === person?.first && prev.lastName === person?.last)) ? accountBirthDate(user.user_metadata?.date_of_birth) : ""),
            phone: prev.phone || (user.user_metadata?.phone || ""),
          }))
        }
      } catch {
        // Non-blocking
      }
    }
    loadAuthenticatedUser()
  }, [travellersLoaded, accountEmail, travellers.length])

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

      router.replace(localizeApplyPath(`/apply?${params.toString()}`), { scroll: false })

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
      return <div className="p-8 text-center text-muted-foreground"><Msg id="apply.loading" /></div>
    }

    const stepSlug = getStepSlug(currentStep)

    switch (stepSlug) {
      case "personal":
        return (
          <NationalityStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            isLoading={isTransitioning}
            travellers={travellers}
            onPickTraveller={pickTraveller}
            travellerNotice={travellerNotice}
          />
        )
      case "destination":
        return (
          <DestinationStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            isLoading={isTransitioning}
          />
        )
      case "payment":
        return (
          <PaymentStep
            formData={formData}
            onBack={handleBack}
            onEditTrip={editTrip}
            onEditTraveller={editTraveller}
            isLoading={isTransitioning}
            paymentError={paymentError}
          />
        )
      default:
        return null
    }
  }

  const updateFormData = useCallback((data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

  useEffect(() => {
    // While "Continue your application?" is open, the saved draft is the only copy: don't overwrite it with
    // the empty form underneath (a reload before choosing used to lose the draft).
    if (!isInitialized || showResumeModal) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(formData))
        localStorage.setItem(WIZARD_STEP_STORAGE_KEY, getStepSlug(currentStep))
        sessionStorage.removeItem(RESUME_DISMISSED_KEY)
        announceWizardDraftChange()
      } catch (error) {
        console.error("Failed to save form data:", error)
      }
    }, AUTO_SAVE_DELAY)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formData, currentStep, isInitialized, showResumeModal])

  return (
    <div className="min-h-[100dvh] bg-[#FFFFFF]" ref={wizardContainerRef}>
      <SiteHeader wizardAccount={<WizardAccount travellers={travellers} loaded={travellersLoaded} error={travellersError} refresh={refreshTravellers} value={formData.travellerId ?? ""} onChoose={traveller => {
        pickTraveller(traveller)
        // A different traveller must review their details before returning to payment.
        if (currentStep >= 4) editTraveller()
      }} />} />
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-[100dvh]"><Msg id="apply.loading" /></div>}>
      <ApplyPageContent />
    </Suspense>
  )
}
