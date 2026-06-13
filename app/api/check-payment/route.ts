import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const paymentIntentId = request.nextUrl.searchParams.get("id")

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Payment intent ID is required" }, { status: 400 })
    }

    const apiKey = process.env.ZIINA_API_KEY
    if (!apiKey) {
      console.error("ZIINA_API_KEY environment variable is not set")
      return NextResponse.json({ error: "Payment service configuration error" }, { status: 500 })
    }

    const response = await fetch(`https://api-v2.ziina.com/api/payment_intent/${paymentIntentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Ziina API error:", errorText)
      return NextResponse.json(
        { error: "Failed to check payment status", details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Payment status check error:", error)
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 })
  }
}
