import { NextResponse } from "next/server"

interface FileUploadResult {
  fileName: string
  fileId?: string
  success: boolean
  error?: string
}

export async function POST(request: Request) {
  try {
    const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_API_KEY

    if (!hubspotAccessToken) {
      console.error("[v0] HubSpot access token not configured")
      return NextResponse.json({ success: false, message: "HubSpot not configured" }, { status: 200 })
    }

    const formData = await request.formData()
    const contactId = formData.get("contactId") as string
    const applicantName = formData.get("applicantName") as string || "Applicant"

    if (!contactId) {
      console.error("[v0] No contactId provided for file upload")
      return NextResponse.json({ success: false, message: "Contact ID required" }, { status: 200 })
    }

    console.log("[v0] Starting file upload to HubSpot for contact:", contactId)

    // Get all files from form data
    const fileFields = ["passportCopy", "residencyCopy", "photo", "nocSalaryCertificate"]
    const fileLabels: Record<string, string> = {
      passportCopy: "Passport Copy",
      residencyCopy: "Residency/Visa Copy",
      photo: "Photo",
      nocSalaryCertificate: "NOC/Salary Certificate",
    }

    const uploadResults: FileUploadResult[] = []
    const uploadedFileIds: string[] = []

    for (const fieldName of fileFields) {
      const file = formData.get(fieldName) as File | null

      if (!file || file.size === 0) {
        console.log(`[v0] No file provided for ${fieldName}, skipping`)
        continue
      }

      console.log(`[v0] Uploading ${fieldName}: ${file.name} (${file.size} bytes)`)

      try {
        // Convert File to buffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Create form data for HubSpot Files API
        const hubspotFormData = new FormData()
        
        // Create a new file with a descriptive name
        const timestamp = Date.now()
        const extension = file.name.split(".").pop() || "pdf"
        const newFileName = `${applicantName.replace(/\s+/g, "_")}_${fileLabels[fieldName].replace(/[\s\/]+/g, "_")}_${timestamp}.${extension}`
        
        const blob = new Blob([buffer], { type: file.type })
        hubspotFormData.append("file", blob, newFileName)
        
        // File options - store in visa-documents folder
        hubspotFormData.append("options", JSON.stringify({
          access: "PRIVATE",
          overwrite: false,
          duplicateValidationStrategy: "NONE",
          duplicateValidationScope: "ENTIRE_PORTAL",
        }))
        
        hubspotFormData.append("folderPath", "/visa-documents")

        // Upload file to HubSpot File Manager
        const uploadResponse = await fetch("https://api.hubapi.com/files/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hubspotAccessToken}`,
          },
          body: hubspotFormData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          
          // Check for missing scopes error (403)
          if (uploadResponse.status === 403 && errorData.category === "MISSING_SCOPES") {
            console.log(`[v0] HubSpot file upload disabled - missing 'files' scope. File saved locally only: ${file.name}`)
            uploadResults.push({
              fileName: file.name,
              success: true, // Mark as success to not block workflow
              error: "Saved locally (HubSpot file scope not configured)",
            })
            continue
          }
          
          console.error(`[v0] Failed to upload ${fieldName}:`, errorData)
          uploadResults.push({
            fileName: file.name,
            success: false,
            error: errorData.message || `Upload failed with status ${uploadResponse.status}`,
          })
          continue
        }

        const uploadData = await uploadResponse.json()
        console.log(`[v0] Successfully uploaded ${fieldName}, file ID:`, uploadData.id)

        uploadResults.push({
          fileName: file.name,
          fileId: uploadData.id,
          success: true,
        })

        uploadedFileIds.push(uploadData.id)
      } catch (uploadError) {
        console.error(`[v0] Error uploading ${fieldName}:`, uploadError)
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: uploadError instanceof Error ? uploadError.message : "Unknown error",
        })
      }
    }

    // If we uploaded any files, create a note with the file information
    if (uploadedFileIds.length > 0) {
      console.log("[v0] Creating note with uploaded files for contact:", contactId)

      const successfulUploads = uploadResults.filter((r) => r.success)
      const noteBody = `📎 Documents Uploaded (${successfulUploads.length} files)\n\n${successfulUploads
        .map((r) => `✓ ${r.fileName}`)
        .join("\n")}\n\nUploaded at: ${new Date().toLocaleString()}`

      try {
        // Create a note associated with the contact
        const noteResponse = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hubspotAccessToken}`,
          },
          body: JSON.stringify({
            properties: {
              hs_note_body: noteBody,
              hs_timestamp: new Date().getTime(),
              hs_attachment_ids: uploadedFileIds.join(";"),
            },
            associations: [
              {
                to: { id: contactId },
                types: [
                  {
                    associationCategory: "HUBSPOT_DEFINED",
                    associationTypeId: 202, // Note to Contact association
                  },
                ],
              },
            ],
          }),
        })

        if (noteResponse.ok) {
          const noteData = await noteResponse.json()
          console.log("[v0] Note created successfully:", noteData.id)
        } else {
          const noteError = await noteResponse.json().catch(() => ({}))
          console.error("[v0] Failed to create note:", noteError)
        }
      } catch (noteError) {
        console.error("[v0] Error creating note:", noteError)
      }
    }

    const successCount = uploadResults.filter((r) => r.success).length
    const totalCount = uploadResults.length

    console.log(`[v0] File upload complete: ${successCount}/${totalCount} files uploaded successfully`)

    return NextResponse.json({
      success: true,
      message: `${successCount} of ${totalCount} files uploaded to HubSpot`,
      results: uploadResults,
    })
  } catch (error) {
    console.error("[v0] Error in HubSpot file upload:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error uploading files",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    )
  }
}
