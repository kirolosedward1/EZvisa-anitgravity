"use server"

import { createClient } from "@/lib/supabase/server"
import type { VisaApplication, VisaApplicationForm } from "@/lib/types/visa-application"
import { headers } from "next/headers"

/**
 * Submit a visa application to the database
 */
export async function submitVisaApplication(formData: VisaApplicationForm) {
  try {
    const supabase = await createClient()
    const headersList = await headers()

    // Get metadata
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"
    const referrer = headersList.get("referer") || "direct"

    // Transform form data to database schema
    const applicationData: Omit<VisaApplication, "id" | "created_at" | "updated_at"> = {
      // Personal Info
      full_name: formData.personalInfo.fullName,
      email: formData.personalInfo.email,
      phone: formData.personalInfo.phone,
      nationality: formData.personalInfo.nationality,
      passport_number: formData.personalInfo.passportNumber,
      date_of_birth: formData.personalInfo.dateOfBirth,

      // Travel Details
      destination_country: formData.travelDetails.destinationCountry,
      travel_purpose: formData.travelDetails.travelPurpose,
      entry_date: formData.travelDetails.entryDate,
      exit_date: formData.travelDetails.exitDate,
      duration_days: formData.travelDetails.durationDays,

      // Documents
      has_passport: formData.documents.hasPassport,
      has_photos: formData.documents.hasPhotos,
      has_bank_statements: formData.documents.hasBankStatements,
      has_employment_proof: formData.documents.hasEmploymentProof,
      has_accommodation: formData.documents.hasAccommodation,
      has_travel_insurance: formData.documents.hasTravelInsurance,
      has_flight_booking: formData.documents.hasFlightBooking,

      // Additional Info
      previous_schengen_visa: formData.additionalInfo.previousSchengenVisa,
      previous_rejections: formData.additionalInfo.previousRejections,
      rejection_details: formData.additionalInfo.rejectionDetails,
      additional_notes: formData.additionalInfo.additionalNotes,

      // Metadata
      submission_ip: ip,
      user_agent: userAgent,
      referrer: referrer,

      // Initial status
      payment_status: "pending",
      application_status: "submitted",
      payment_amount: 249, // AED as per your pricing
    }

    const { data, error } = await supabase.from("visa_applications").insert(applicationData).select().single()

    if (error) {
      console.error("[v0] Error submitting visa application:", error)
      return {
        success: false,
        error: "Failed to submit application. Please try again.",
      }
    }

    console.log("[v0] Visa application submitted successfully:", data.id)
    return {
      success: true,
      data: data,
      applicationId: data.id,
    }
  } catch (error) {
    console.error("[v0] Unexpected error submitting visa application:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

/**
 * Get application by ID
 */
export async function getVisaApplication(id: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("visa_applications").select("*").eq("id", id).single()

    if (error) {
      return { success: false, error: "Application not found" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("[v0] Error fetching visa application:", error)
    return { success: false, error: "Failed to fetch application" }
  }
}

/**
 * Update payment status after successful payment
 */
export async function updatePaymentStatus(
  applicationId: string,
  paymentId: string,
  status: "paid" | "processing" | "completed",
) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("visa_applications")
      .update({
        payment_status: status,
        payment_id: paymentId,
        application_status: "reviewing",
      })
      .eq("id", applicationId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating payment status:", error)
      return { success: false, error: "Failed to update payment status" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("[v0] Unexpected error updating payment:", error)
    return { success: false, error: "Failed to update payment" }
  }
}

/**
 * Get applications by email (for user to track their submissions)
 */
export async function getApplicationsByEmail(email: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("visa_applications")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: "Failed to fetch applications" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("[v0] Error fetching applications by email:", error)
    return { success: false, error: "Failed to fetch applications" }
  }
}
