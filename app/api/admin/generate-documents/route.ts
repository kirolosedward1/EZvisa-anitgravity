import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { 
  generateCoverLetter, 
  generateItinerary,
  generateConsularChecklist,
  generateAppointmentSurvivalGuide,
  generateCompleteDossierPack
} from "@/lib/documents/templates"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.ADMIN_API_SECRET;
    
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, version = 1 } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch source of truth data
    const { data: appData, error: appError } = await supabase
      .from("visa_applications")
      .select("*")
      .eq("id", applicationId)
      .single()

    if (appError || !appData) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // 2. Isolate Case Data - generate exactly from DB record
    const coverLetterHtml = generateCoverLetter(appData)
    const itineraryHtml = generateItinerary(appData)
    const checklistHtml = generateConsularChecklist(appData)
    const survivalGuideHtml = generateAppointmentSurvivalGuide(appData)
    const dossierPackHtml = generateCompleteDossierPack(appData)

    // 3. Versioning - use version prefix to prevent stale caches
    const versionPrefix = `v${version}_${Date.now()}`;
    const coverLetterFilename = `${appData.id}/${versionPrefix}_cover_letter.html`
    const itineraryFilename = `${appData.id}/${versionPrefix}_itinerary.html`
    const checklistFilename = `${appData.id}/${versionPrefix}_checklist.html`
    const dossierFilename = `${appData.id}/${versionPrefix}_complete_dossier.html`

    // Upload to Supabase Storage
    const [coverLetterUpload, itineraryUpload, checklistUpload, dossierUpload] = await Promise.all([
      supabase.storage.from("visa_documents").upload(coverLetterFilename, coverLetterHtml, {
        contentType: 'text/html',
        upsert: true
      }),
      supabase.storage.from("visa_documents").upload(itineraryFilename, itineraryHtml, {
        contentType: 'text/html',
        upsert: true
      }),
      supabase.storage.from("visa_documents").upload(checklistFilename, checklistHtml, {
        contentType: 'text/html',
        upsert: true
      }),
      supabase.storage.from("visa_documents").upload(dossierFilename, dossierPackHtml, {
        contentType: 'text/html',
        upsert: true
      })
    ]);

    if (coverLetterUpload.error || itineraryUpload.error || dossierUpload.error) {
      console.error("Upload errors:", coverLetterUpload.error, itineraryUpload.error, dossierUpload.error)
      return NextResponse.json({ error: "Failed to upload generated documents" }, { status: 500 })
    }

    // 4. Update the DB to reference the latest generated versions
    await supabase.from("visa_applications").update({ 
      updated_at: new Date().toISOString()
    }).eq("id", applicationId);

    return NextResponse.json({ 
      success: true, 
      coverLetterPath: coverLetterUpload.data.path,
      itineraryPath: itineraryUpload.data.path,
      dossierPath: dossierUpload.data?.path || null,
      message: "Complete consulate dossier package successfully generated."
    })
  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json({ error: "Server error during generation" }, { status: 500 })
  }
}
