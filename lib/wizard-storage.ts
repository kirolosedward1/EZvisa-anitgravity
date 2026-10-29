/** Browser storage keys shared by the /apply wizard, the payment pages and the resume prompt. */
export const WIZARD_STORAGE_KEY = "visa_wizard_data"
export const WIZARD_STEP_STORAGE_KEY = "visa_wizard_step"
export const WIZARD_DRAFT_EVENT = "ez:wizard-draft-changed"
export const RESUME_DISMISSED_KEY = "ez:resume-notice-dismissed"

export function announceWizardDraftChange() {
  window.dispatchEvent(new Event(WIZARD_DRAFT_EVENT))
}
/** sessionStorage: the application created for checkout in this tab (components/apply/payment-step.tsx). */
export const CHECKOUT_STORAGE_KEY = "ez_checkout_application"

/** After a confirmed payment: forget the draft and the checkout so /apply starts a new application. */
export function clearWizardAfterPayment() {
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
    localStorage.removeItem(WIZARD_STEP_STORAGE_KEY)
  } catch { /* storage unavailable */ }
  announceWizardDraftChange()
  try {
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
    sessionStorage.removeItem("pendingApplication")
  } catch { /* storage unavailable */ }
}
