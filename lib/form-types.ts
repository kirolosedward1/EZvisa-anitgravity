// Shared form data types for the visa application wizard

export interface FormData {
  // Nationality Step
  nationality: string
  destination: string
  countryOfResidence: string
  cityOfResidence: string
  hasEmiratesId: "yes" | "no" | undefined
  firstName: string
  lastName: string
  email: string
  phone: string
  maritalStatus: "single" | "married" | "divorced" | "widowed" | ""
  spouseAccompanying: "yes" | "no" | undefined
  hasValidPassport: "yes" | "no" | undefined

  // Spouse Step
  spouseFirstName: string
  spouseLastName: string
  spouseHasValidPassport: "yes" | "no" | undefined
  spouseOccupation: string

  // Employment Step
  employmentStatus: "employed" | "business" | "freelancer" | "student" | "unemployed" | "retired" | ""
  jobTitle: string
  companyName: string
  employmentStartDate: string
  monthlySalary: string
  hasNOC: "yes" | "no" | undefined
  industry: string
  yearsOfExperience: string
  averageMonthlyIncome: string

  // Trip Details Step (Expanded)
  purposeOfTrip: string
  travelStartDate: string
  travelEndDate: string
  datesFlexible: string
  isFirstSchengenVisa: string
  previousTravel: string[]
  travelingWith: string
  travelStyle: string
  preferredCities: string[]
  willVisitOtherCountries?: "yes" | "no"
  additionalCountries: CountryVisit[]
  itinerary: string

  // Financial & Accommodation Preferences
  hotelCategory: string
  roomType: string
  preferredLocation: string
  hasBankStatement: string
  balanceRange: string
  fundingSource: string
  previousRefusals: string
  refusalDetails?: string

  // Documents Step
  passportPhoto: File | null
  passportFront: File | null
  passportBack: File | null
  bankStatement: File | null
  nocCertificate: File | null
  salaryCertificate: File | null
  photo: File | null
  spousePassportPhoto: File | null
  spousePassportFront: File | null
  spousePassportBack: File | null
  spouseBankStatement: File | null
  spouseNocCertificate: File | null
  spouseSalaryCertificate: File | null
  spousePhoto: File | null
}

export interface CountryVisit {
  country: string
  arrivalDate: string
  departureDate: string
}

// Helper type for partial form updates
export type FormDataUpdate = Partial<FormData>

// Field value type for validation
export type FieldValue = string | File | null | undefined | "yes" | "no" | CountryVisit[] | string[]
