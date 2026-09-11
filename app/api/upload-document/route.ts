import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import crypto from "crypto"
import { isDemoToken, getDemoApplicationByToken } from "@/lib/demo-data"

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`upload:${clientIp}`, RATE_LIMITS.standard)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const applicationId = formData.get("applicationId") as string
    const trackingToken = formData.get("trackingToken") as string
    const documentType = formData.get("documentType") as string

    if (!file || !documentType || (!applicationId && !trackingToken)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only PDF, JPG, PNG allowed." }, { status: 400 })
    }

    if (isDemoToken(trackingToken)) {

      const demoApp = getDemoApplicationByToken(trackingToken);
      if (demoApp) {
        const columnMap: Record<string, string> = {
          passportCopy: "has_passport",
          passportFront: "has_passport",
          passportBack: "has_passport",
          residencyCopy: "has_passport",
          photo: "has_photos",
          personalPhoto: "has_photos",
          passportPhoto: "has_photos",
          bankStatement: "has_bank_statements",
          nocCertificate: "has_employment_proof",
          salaryCertificate: "has_employment_proof",
        };
        const col = columnMap[documentType];
        if (col) {
          (demoApp as any)[col] = true;
        }
      }
      return NextResponse.json({ success: true, path: `demo-uploads/${documentType}.pdf` });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify ownership
    let query = supabase.from("visa_applications").select("id");
    if (trackingToken) query = query.eq("tracking_token", trackingToken);
    else query = query.eq("id", applicationId);

    const { data: appData, error: appError } = await query.single();
    if (appError || !appData) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 403 })
    }

    const verifiedAppId = appData.id;

    // We do NOT use the applicant name or PII in the filename
    const fileExtension = file.name.split('.').pop()
    const safeFilename = `${verifiedAppId}/${documentType}_${crypto.randomUUID().substring(0,8)}.${fileExtension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Ensure bucket exists or just upload (Service Role handles it)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("visa_documents")
      .upload(safeFilename, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload to secure storage" }, { status: 500 })
    }

    // Update the boolean flag on the application based on document type
    const columnMap: Record<string, string> = {
      passportCopy: "has_passport",
      passportFront: "has_passport",
      passportBack: "has_passport",
      residencyCopy: "has_passport",
      photo: "has_photos",
      personalPhoto: "has_photos",
      passportPhoto: "has_photos",
      bankStatement: "has_bank_statements",
      nocCertificate: "has_employment_proof",
      salaryCertificate: "has_employment_proof",
    }

    const columnToUpdate = columnMap[documentType];
    if (columnToUpdate) {
      await supabase.from("visa_applications").update({ [columnToUpdate]: true }).eq("id", verifiedAppId);
    }

    return NextResponse.json({ success: true, path: uploadData.path })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Server error during upload" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    if (!token) {
      return NextResponse.json({ error: "Missing tracking token" }, { status: 400 })
    }

    if (isDemoToken(token)) {
      const demoApp = getDemoApplicationByToken(token);
      if (demoApp) {
        return NextResponse.json({ success: true, app: demoApp });
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      const demoApp = getDemoApplicationByToken(token);
      if (demoApp) return NextResponse.json({ success: true, app: demoApp });
      return NextResponse.json({ error: "Storage/Database not configured" }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: appData, error: appError } = await supabase
      .from("visa_applications")
      .select("id, destination_country, full_name, has_passport, has_photos, has_bank_statements, has_employment_proof, application_status, payment_status, tracking_token")
      .eq("tracking_token", token)
      .single()

    if (appError || !appData) {
      const demoApp = getDemoApplicationByToken(token);
      if (demoApp) return NextResponse.json({ success: true, app: demoApp });
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, app: appData })
  } catch (error) {
    return NextResponse.json({ error: "Server error during status check" }, { status: 500 })
  }
}


