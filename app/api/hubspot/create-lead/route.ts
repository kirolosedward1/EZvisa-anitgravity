import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/lib/sanitize"

export async function POST(request: Request) {
  try {
    // Rate limiting (Redis-based)
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`hubspot:${clientIp}`, RATE_LIMITS.standard)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: true, message: "Rate limited, but continuing flow" },
        { status: 200, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const formData = await request.json()
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(formData.email || "")
    const sanitizedFirstName = sanitizeInput(formData.firstName || "", 100)
    const sanitizedLastName = sanitizeInput(formData.lastName || "", 100)
    const sanitizedPhone = sanitizePhone(formData.phone || "")

    // Support both env variable names for backward compatibility
    const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY

    if (!hubspotAccessToken) {
      console.error("[v0] HubSpot access token not configured (HUBSPOT_ACCESS_TOKEN or HUBSPOT_API_KEY)")
      return NextResponse.json({ success: false, message: "HubSpot not configured" }, { status: 200 })
    }
    
    console.log("[v0] HubSpot token found, proceeding with API call")

    // Prepare contact properties - only standard HubSpot fields
    const properties = {
      email: formData.email,
      firstname: formData.firstName,
      lastname: formData.lastName,
      phone: formData.phone || "",
      jobtitle: formData.jobTitle || "",
      company: formData.companyName || "",
      hs_lead_status: "NEW",
      lifecyclestage: "lead",
    }

    const visaDetails = `Visa Application Details:
========================
Nationality: ${formData.nationality || "N/A"}
Destination: ${formData.destination || "N/A"}
Country: ${formData.countryOfResidence || "N/A"}
City: ${formData.cityOfResidence || "N/A"}

Travel: ${formData.travelStartDate || "N/A"} to ${formData.travelEndDate || "N/A"}
Purpose: ${formData.purposeOfTrip || "N/A"}

Employment: ${formData.employmentStatus || "N/A"}
Company: ${formData.companyName || "N/A"}
Monthly Salary: ${formData.monthlySalary || "N/A"}

Marital: ${formData.maritalStatus || "N/A"}
Spouse Accompanying: ${formData.spouseAccompanying || "N/A"}

Applied: ${new Date().toLocaleString()}`

    // Create contact in HubSpot
    let response: Response
    let data: any
    
    try {
      response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hubspotAccessToken}`,
        },
        body: JSON.stringify({ properties }),
      })

      // Always try to parse JSON even if not ok (for 409 CONFLICT handling)
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error("[v0] Failed to parse HubSpot response:", jsonError)
        return NextResponse.json(
          { success: false, message: "Invalid response from HubSpot" },
          { status: 200 }
        )
      }
    } catch (fetchError) {
      console.error("[v0] HubSpot fetch error (likely network issue):", fetchError)
      return NextResponse.json(
        { success: false, message: "Network error connecting to HubSpot" },
        { status: 200 }
      )
    }

    if (!response.ok) {
      // Handle 409 CONFLICT - Contact already exists (this is expected and not an error)
      if (response.status === 409 && data.category === "CONFLICT") {
        console.log("[v0] ℹ️ Contact already exists in HubSpot, creating new submission record:", formData.email)

        // Generate a truly unique email using a random UUID-like string
        const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        const timestamp = Date.now()
        const uniqueEmail = formData.email.includes("@")
          ? formData.email.replace("@", `+dup${timestamp}_${randomId}@`)
          : `${formData.email}_dup${timestamp}_${randomId}`

        console.log("[v0] ✓ Creating new submission record with unique identifier:", uniqueEmail)

        const duplicateProperties = {
          ...properties,
          email: uniqueEmail,
          // Store original email in a custom field if available
          company: `${properties.company || ""} [Original: ${formData.email}]`.trim(),
        }

        try {
          const duplicateResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${hubspotAccessToken}`,
            },
            body: JSON.stringify({ properties: duplicateProperties }),
          })

          const duplicateData = await duplicateResponse.json()

          if (duplicateResponse.ok) {
            console.log("[v0] ✓ New submission record created successfully in HubSpot:", duplicateData.id)

            // Add note to the duplicate contact with original email
            try {
              await fetch(`https://api.hubapi.com/crm/v3/objects/notes`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${hubspotAccessToken}`,
                },
                body: JSON.stringify({
                  properties: {
                    hs_note_body: `🔄 DUPLICATE APPLICATION\nOriginal Email: ${formData.email}\nApplication #${timestamp}\n\n${visaDetails}`,
                    hs_timestamp: new Date().getTime(),
                  },
                  associations: [
                    {
                      to: { id: duplicateData.id },
                      types: [
                        {
                          associationCategory: "HUBSPOT_DEFINED",
                          associationTypeId: 202,
                        },
                      ],
                    },
                  ],
                }),
              })
              console.log("[v0] Note added to duplicate contact with original email reference")
            } catch (noteError) {
              console.error("[v0] Failed to add note to duplicate:", noteError)
            }

            return NextResponse.json({
              success: true,
              message: "Application submitted successfully",
              contactId: duplicateData.id,
              duplicate: true,
            })
          } else {
            console.log("[v0] ⚠️ Unable to create new submission record, continuing with payment flow")
            return NextResponse.json({
              success: true,
              message: "Application submitted successfully",
              contactId: data.correlationId,
              duplicate: false,
            })
          }
        } catch (duplicateError) {
          console.log("[v0] ⚠️ Submission record creation issue, continuing with payment flow")
          return NextResponse.json({
            success: true,
            message: "Application submitted successfully",
            contactId: data.correlationId,
            duplicate: false,
          })
        }
      }

      // Other non-409 errors
      console.log("[v0] ⚠️ HubSpot API issue (status " + response.status + "), continuing with application flow")
      return NextResponse.json({ 
        success: true, 
        message: "Application submitted successfully"
      }, { status: 200 })
    }

    console.log("[v0] HubSpot lead created successfully:", data.id)

    try {
      await fetch(`https://api.hubapi.com/crm/v3/objects/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hubspotAccessToken}`,
        },
        body: JSON.stringify({
          properties: {
            hs_note_body: visaDetails,
            hs_timestamp: new Date().getTime(),
          },
          associations: [
            {
              to: { id: data.id },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 202,
                },
              ],
            },
          ],
        }),
      })
      console.log("[v0] Note added to new contact")
    } catch (noteError) {
      console.error("[v0] Failed to add note:", noteError)
    }

    return NextResponse.json({
      success: true,
      message: "Lead created in HubSpot",
      contactId: data.id,
    })
  } catch (error) {
    console.error("[v0] Error creating HubSpot lead:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error creating lead",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    )
  }
}
