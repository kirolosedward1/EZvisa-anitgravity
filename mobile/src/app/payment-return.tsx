import { Redirect } from "expo-router"

/**
 * Fallback for the payment deep link if it opens the app outside the
 * checkout sheet (e.g. the app was killed during payment). Applications
 * refresh their status from the API when shown.
 */
export default function PaymentReturn() {
  return <Redirect href="/home" />
}
