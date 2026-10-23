/** Browser storage keys shared by the /apply wizard, the payment pages and the resume prompt. */
export const WIZARD_STORAGE_KEY = "visa_wizard_data"
/** sessionStorage: the application created for checkout in this tab (components/apply/payment-step.tsx). */
export const CHECKOUT_STORAGE_KEY = "ez_checkout_application"

/** After a confirmed payment: forget the draft and the checkout so /apply starts a new application. */
export function clearWizardAfterPayment() {
  try { localStorage.removeItem(WIZARD_STORAGE_KEY) } catch { /* storage unavailable */ }
  try {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
    sessionStorage.removeItem("pendingApplication")
  } catch { /* storage unavailable */ }
}
