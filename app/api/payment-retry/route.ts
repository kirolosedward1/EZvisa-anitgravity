import { NextResponse } from "next/server"
import { getPaymentRetryEmail } from "@/lib/email-templates"

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, nationality, destination, travelStartDate, travelEndDate, paymentLink } =
      await request.json()

    console.log("[v0] Sending payment retry email to:", email)

    if (!email || !paymentLink) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const emailData = {
      firstName: firstName || "",
      lastName: lastName || "",
      email,
      phone: "",
      nationality: nationality || "",
      destination: destination || "",
      travelStartDate: travelStartDate || "",
      travelEndDate: travelEndDate || "",
    }

    const { EmailService } = await import("@/lib/email/service");

    const result = await EmailService.sendEvent({
      event: "payment.failed", // use the same failed/retry template
      entityId: `retry_${Date.now()}`, // fallback since we don't have id here
      recipient: email,
      language: "en", // fallback
      data: {
        firstName: firstName || "Customer",
        destination: destination || "",
        trackingToken: paymentLink.split("retry=true")[0] // Just fallback logic
      }
    });

    if (!result.success) {
      console.error("[v0] Failed to send payment retry email");
      return NextResponse.json({ success: false, message: "Failed to send email" }, { status: 500 })
    }

    console.log("[v0] Payment retry email sent successfully")
    return NextResponse.json({ success: true, message: "Retry email sent successfully" })
  } catch (error) {
    console.error("[v0] Payment retry error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error sending retry email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
