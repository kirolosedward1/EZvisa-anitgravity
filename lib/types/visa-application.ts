export interface VisaApplication {
  id?: string

  // Personal Information
  full_name: string
  email: string
  phone: string
  nationality: string
  passport_number?: string
  date_of_birth?: string

  // Travel Details
  destination_country: string
  travel_purpose: string
  entry_date?: string
  exit_date?: string
  duration_days?: number

  // Documents Status
  has_passport?: boolean
  has_photos?: boolean
  has_bank_statements?: boolean
  has_employment_proof?: boolean
  has_accommodation?: boolean
  has_travel_insurance?: boolean
  has_flight_booking?: boolean

  // Additional Information
  previous_schengen_visa?: boolean
  previous_rejections?: boolean
  rejection_details?: string
  additional_notes?: string

  // Payment & Status
  payment_status?: "pending" | "paid" | "processing" | "completed"
  payment_amount?: number
  payment_id?: string
  application_status?: "submitted" | "reviewing" | "approved" | "rejected"

  // Metadata
  submission_ip?: string
  user_agent?: string
  referrer?: string
  created_at?: string
  updated_at?: string
}

export interface VisaApplicationForm {
  // Step 1: Personal Info
  personalInfo: {
    fullName: string
    email: string
    phone: string
    nationality: string
    passportNumber?: string
    dateOfBirth?: string
  }

  // Step 2: Travel Details
  travelDetails: {
    destinationCountry: string
    travelPurpose: string
    entryDate?: string
    exitDate?: string
    durationDays?: number
  }

  // Step 3: Documents
  documents: {
    hasPassport: boolean
    hasPhotos: boolean
    hasBankStatements: boolean
    hasEmploymentProof: boolean
    hasAccommodation: boolean
    hasTravelInsurance: boolean
    hasFlightBooking: boolean
  }

  // Step 4: Additional Info
  additionalInfo: {
    previousSchengenVisa: boolean
    previousRejections: boolean
    rejectionDetails?: string
    additionalNotes?: string
  }
}
