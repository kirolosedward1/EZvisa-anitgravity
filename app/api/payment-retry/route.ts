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

    const retryEmail = getPaymentRetryEmail(emailData, paymentLink)

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/send-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: retryEmail.subject,
          html: retryEmail.html,
          type: "payment_retry",
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Failed to send payment retry email:", data)
      return NextResponse.json({ success: false, message: "Failed to send email", error: data }, { status: 500 })
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
