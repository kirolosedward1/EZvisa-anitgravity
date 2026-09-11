import { NextResponse } from "next/server";
import { EmailService } from "@/lib/email/service";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.ADMIN_API_SECRET;
    
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event, application_id } = await request.json();

    if (!event || !application_id) {
      return NextResponse.json({ error: "Missing event or application_id" }, { status: 400 });
    }

    // Fetch application details
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: app, error } = await supabase
      .from("visa_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (error || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Map database to template data
    const templateData = {
      id: app.id,
      trackingToken: app.tracking_token,
      firstName: app.full_name?.split(" ")[0] || "Customer",
      destination: app.destination_country || "",
      paymentAmount: app.payment_amount || 0,
      currency: "AED", // Or fetch from order if available
    };

    // Update status if it's a ready event
    if (event === "documents.ready") {
      // VERIFY FINAL PACKAGE COMPLETENESS
      const { data: fileList, error: listError } = await supabase.storage.from("visa_documents").list(app.id);
      if (listError) {
        return NextResponse.json({ error: "Failed to verify document storage" }, { status: 500 });
      }
      const hasFinalPackage = fileList.some(f => f.name === "final_package.pdf");
      if (!hasFinalPackage) {
        return NextResponse.json({ 
          error: "Verification failed: final_package.pdf is missing from the case folder. Cannot mark as ready." 
        }, { status: 400 });
      }

      await supabase.from("visa_applications").update({ application_status: "ready" }).eq("id", app.id);
    }

    const result = await EmailService.sendEvent({
      event: event as any,
      entityId: app.id,
      recipient: app.email,
      language: app.preferred_language || "en",
      data: templateData
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
