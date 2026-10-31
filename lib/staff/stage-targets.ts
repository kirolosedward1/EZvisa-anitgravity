/** Status values the Change stage control may set (no visa outcome; payment comes from the payment gateway). */
export const STAGE_TARGETS = {
  awaiting_documents: "Documents",
  reviewing: "Expert review",
  preparation: "Preparation",
  ready: "Ready",
  appointment_booked: "Appointment booked",
  completed: "Completed",
  cancelled: "Cancelled",
} as const
export type StageTarget = keyof typeof STAGE_TARGETS
