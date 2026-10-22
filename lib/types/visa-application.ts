import type { ApplicationStatus, PaymentStatus } from "@/lib/shared/wizard-contract"

export interface VisaApplication {
  id?: string

  // Personal Information
  full_name: string
  email: string
  phone: string
  nationality: string
  passport_number?: string | null
  date_of_birth?: string | null

  // Travel Details
  destination_country: string
  travel_purpose: string
  entry_date?: string | null
  exit_date?: string | null
  travel_start_date?: string
  travel_end_date?: string
  duration_days?: number | null

  // Documents Status
  has_passport?: boolean | null
  has_photos?: boolean | null
  has_bank_statements?: boolean | null
  has_employment_proof?: boolean | null
  has_accommodation?: boolean | null
  has_travel_insurance?: boolean | null
  has_flight_booking?: boolean | null

  // Additional Information
  previous_schengen_visa?: boolean | null
  previous_rejections?: boolean | null
  rejection_details?: string | null
  /** JSON text, see ApplicationNotes in lib/shared/wizard-contract.ts */
  additional_notes?: string | null

  // Payment & Status (plain text columns; the vocabulary is shared with the app)
  payment_status?: PaymentStatus | (string & {}) | null
  payment_amount?: number | null
  payment_id?: string | null
  application_status?: ApplicationStatus | (string & {}) | null
  /** Not present on every database; the case reference is derived from the id (referenceOf). */
  tracking_token?: string | null
  preferred_language?: string | null

  // Appointment (set by staff)
  appointment_at?: string | null
  appointment_centre?: string | null
  appointment_address?: string | null
  appointment_reference?: string | null

  // Metadata
  submission_ip?: string | null
  user_agent?: string | null
  referrer?: string | null
  created_at?: string | null
  updated_at?: string | null
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
