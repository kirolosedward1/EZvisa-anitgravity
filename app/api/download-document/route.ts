import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { generateCompleteDossierPack } from "@/lib/documents/templates"
import { isDemoToken, getDemoApplicationByToken } from "@/lib/demo-data"

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`download:${clientIp}`, RATE_LIMITS.standard)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many download attempts." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")
    const format = searchParams.get("format")

    if (!token) {
      return NextResponse.json({ error: "Missing tracking token" }, { status: 400 })
    }

    if (isDemoToken(token)) {
      const demoApp = getDemoApplicationByToken(token);
      if (demoApp) {
        const dossierHtml = generateCompleteDossierPack(demoApp);
        const sanitizedCountry = (demoApp.destination_country || "Schengen").replace(/\s+/g, "_");
        return new NextResponse(dossierHtml, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="EZvisa_Consular_Dossier_${sanitizedCountry}_${token.substring(0, 8).toUpperCase()}.html"`,
          },
        });
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      const demoApp = getDemoApplicationByToken(token);
      if (demoApp) {
        const dossierHtml = generateCompleteDossierPack(demoApp);
        const sanitizedCountry = (demoApp.destination_country || "Schengen").replace(/\s+/g, "_");
        return new NextResponse(dossierHtml, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="EZvisa_Consular_Dossier_${sanitizedCountry}_${token.substring(0, 8).toUpperCase()}.html"`,
          },
        });
      }
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)


    // Verify ownership and status
    const { data: appData, error: appError } = await supabase
      .from("visa_applications")
      .select("*")
      .eq("tracking_token", token)
      .single()

    if (appError || !appData) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (appData.application_status !== "ready") {
      return NextResponse.json({ error: "Documents are not ready for download yet" }, { status: 403 })
    }

    // Direct HTML dossier download requested
    if (format === "html") {
      const dossierHtml = generateCompleteDossierPack(appData)
      const sanitizedCountry = (appData.destination_country || "Schengen").replace(/\s+/g, "_")
      return new NextResponse(dossierHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="EZvisa_Consular_Dossier_${sanitizedCountry}_${token.substring(0, 8).toUpperCase()}.html"`,
        },
      })
    }

    // Generate signed URL (expires in 1 hour)
    // We assume the final file is saved as: {id}/final_package.pdf
    const finalFilePath = `${appData.id}/final_package.pdf`;

    const { data, error } = await supabase.storage
      .from("visa_documents")
      .createSignedUrl(finalFilePath, 3600) // 1 hour expiration

    if (error || !data) {
      // Resilient fallback: deliver generated complete dossier HTML
      const dossierHtml = generateCompleteDossierPack(appData)
      const sanitizedCountry = (appData.destination_country || "Schengen").replace(/\s+/g, "_")
      return new NextResponse(dossierHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="EZvisa_Consular_Dossier_${sanitizedCountry}_${token.substring(0, 8).toUpperCase()}.html"`,
        },
      })
    }

    // Redirect user to the secure signed URL
    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
