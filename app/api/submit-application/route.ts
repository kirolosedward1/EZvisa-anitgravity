import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/lib/sanitize"

export async function POST(request: Request) {
  try {
    // Rate limiting (Redis-based)
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`submit-app:${clientIp}`, RATE_LIMITS.standard)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const formData = await request.json()
    
    // Sanitize inputs
    const sanitizedData = {
      ...formData,
      firstName: sanitizeInput(formData.firstName || "", 100),
      lastName: sanitizeInput(formData.lastName || "", 100),
      email: sanitizeEmail(formData.email || ""),
      phone: sanitizePhone(formData.phone || ""),
      nationality: sanitizeInput(formData.nationality || "", 100),
      destination: sanitizeInput(formData.destination || "", 100),
      purposeOfTrip: sanitizeInput(formData.purposeOfTrip || "", 500),
      jobTitle: sanitizeInput(formData.jobTitle || "", 200),
      companyName: sanitizeInput(formData.companyName || "", 200),
    }

    // Support multiple env var naming conventions
    const supabaseUrl = 
      process.env.SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL
    
    const supabaseKey = 
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.SUPABASE_SECRET_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars:", { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      })
      return NextResponse.json({ success: false, message: "Database not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("visa_applications")
      .insert([
        {
          full_name: `${sanitizedData.firstName} ${sanitizedData.lastName}`,
          email: sanitizedData.email,
          phone: sanitizedData.phone,
          nationality: sanitizedData.nationality,
          destination_country: sanitizedData.destination,
          date_of_birth: formData.dateOfBirth || null,
          entry_date: formData.travelStartDate,
          exit_date: formData.travelEndDate,
          travel_purpose: sanitizedData.purposeOfTrip,
          passport_number: formData.passportNumber || null,
          duration_days:
            formData.travelStartDate && formData.travelEndDate
              ? Math.ceil(
                  (new Date(formData.travelEndDate).getTime() - new Date(formData.travelStartDate).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : null,
          has_passport: formData.passportCopy ? true : false,
          has_photos: formData.photo ? true : false,
          has_bank_statements: formData.bankStatement ? true : false,
          has_employment_proof: formData.salaryCertificate ? true : false,
          payment_status: "pending",
          application_status: "submitted",
          additional_notes: JSON.stringify({
            maritalStatus: formData.maritalStatus,
            employmentStatus: formData.employmentStatus,
            jobTitle: sanitizedData.jobTitle,
            companyName: sanitizedData.companyName,
            monthlySalary: formData.monthlySalary,
            spouseAccompanying: formData.spouseAccompanying,
          }),
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to save application", error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: data[0].id,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error submitting application",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
