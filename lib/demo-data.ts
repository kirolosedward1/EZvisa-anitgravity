import type { VisaApplication } from "@/lib/types/visa-application";
import type { Traveller } from "@/lib/shared/wizard-contract";

export type DemoScenario = "ready" | "pending" | "multi";

export interface DemoUserConfig {
  id: DemoScenario;
  email: string;
  name: string;
  title: string;
  description: string;
  badge: string;
  badgeVariant: "emerald" | "amber" | "blue";
  destination: string;
}

export const DEMO_CONFIGS: Record<DemoScenario, DemoUserConfig> = {
  ready: {
    id: "ready",
    email: "demo.ready@ezvisa.net",
    name: "Ahmed Hassan",
    title: "Completed Dossier (France)",
    description: "Paid order with compiled dossier ready for download & A4 printing",
    badge: "Dossier Ready",
    badgeVariant: "emerald",
    destination: "France",
  },
  pending: {
    id: "pending",
    email: "demo.pending@ezvisa.net",
    name: "Sara Al-Mansoor",
    title: "Pending Documents (Spain)",
    description: "Paid order awaiting Passport, Photo, Bank Statement & NOC",
    badge: "Action Required",
    badgeVariant: "amber",
    destination: "Spain",
  },
  multi: {
    id: "multi",
    email: "demo.family@ezvisa.net",
    name: "Marcus Vance",
    title: "Multi-Application Family (Italy & Germany)",
    description: "3 visa files to test the multi-case switcher, including an unpaid draft",
    badge: "3 Applications",
    badgeVariant: "blue",
    destination: "Italy & Germany",
  },
};

export const DEMO_APPLICATIONS: Record<string, VisaApplication[]> = {
  "demo.ready@ezvisa.net": [
    {
      id: "demo-app-ready",
      tracking_token: "ez-demo-ready-fr2026",
      full_name: "Ahmed Hassan",
      email: "demo.ready@ezvisa.net",
      phone: "+971 54 710 9533",
      nationality: "Egyptian",
      destination_country: "France",
      travel_purpose: "Tourism & Exploration",
      entry_date: "2026-05-15",
      exit_date: "2026-05-25",
      duration_days: 11,
      has_passport: true,
      has_photos: true,
      has_bank_statements: true,
      has_employment_proof: true,
      has_accommodation: true,
      has_flight_booking: true,
      has_travel_insurance: true,
      application_status: "ready",
      payment_status: "paid",
      payment_amount: 249,
      file_downloaded_at: "2026-10-20T10:00:00.000Z",
      appointment_at: "2026-11-12T06:30:00.000Z",
      appointment_centre: "TLScontact, Dubai",
      appointment_address: "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai",
      appointment_reference: "TLS-2048",
      created_at: "2026-03-01T10:00:00.000Z",
      updated_at: "2026-03-03T14:30:00.000Z",
    },
  ],
  "demo.pending@ezvisa.net": [
    {
      id: "demo-app-pending",
      tracking_token: "ez-demo-pending-es2026",
      full_name: "Sara Al-Mansoor",
      email: "demo.pending@ezvisa.net",
      phone: "+971 52 987 6543",
      nationality: "Emirati / UAE Resident",
      destination_country: "Spain",
      travel_purpose: "Tourism & Leisure",
      entry_date: "2026-06-10",
      exit_date: "2026-06-22",
      duration_days: 13,
      has_passport: true,
      has_photos: true,
      has_bank_statements: false,
      has_employment_proof: false,
      has_accommodation: false,
      has_flight_booking: false,
      has_travel_insurance: false,
      application_status: "submitted",
      payment_status: "paid",
      payment_amount: 249,
      // Passport and residence visa are in; the photo was sent back (DEMO_DOCUMENT_REVIEWS) and needs a new file.
      additional_notes: JSON.stringify({
        uploads: [
          { type: "passportCopy", path: "demo/passport.pdf", name: "passport-sara.pdf", at: "2026-03-10T10:41:00.000Z" },
          { type: "residencyCopy", path: "demo/residency.jpg", name: "IMG_4471.jpg", at: "2026-03-10T10:43:00.000Z" },
          { type: "photo", path: "demo/photo.jpg", name: "photo.jpg", at: "2026-03-10T10:45:00.000Z" },
        ],
      }),
      created_at: "2026-03-10T08:15:00.000Z",
      updated_at: "2026-03-10T08:15:00.000Z",
    },
  ],
  "demo.family@ezvisa.net": [
    {
      id: "demo-app-multi-1",
      tracking_token: "ez-demo-multi-it2026",
      full_name: "Marcus Vance",
      email: "demo.family@ezvisa.net",
      phone: "+971 55 443 2211",
      nationality: "British / UAE Golden Visa",
      destination_country: "Italy",
      travel_purpose: "Vacation & Culture",
      entry_date: "2026-07-01",
      exit_date: "2026-07-14",
      duration_days: 14,
      has_passport: true,
      has_photos: true,
      has_bank_statements: true,
      has_employment_proof: true,
      has_accommodation: true,
      has_flight_booking: true,
      has_travel_insurance: true,
      application_status: "ready",
      payment_status: "paid",
      payment_amount: 249,
      created_at: "2026-03-05T12:00:00.000Z",
      updated_at: "2026-03-07T16:00:00.000Z",
    },
    {
      id: "demo-app-multi-2",
      tracking_token: "ez-demo-multi-de2026",
      full_name: "Elena Vance",
      email: "demo.family@ezvisa.net",
      phone: "+971 55 443 2211",
      nationality: "Canadian / UAE Resident",
      destination_country: "Germany",
      travel_purpose: "Tourism & Family Visit",
      entry_date: "2026-07-15",
      exit_date: "2026-07-28",
      duration_days: 14,
      has_passport: true,
      has_photos: true,
      has_bank_statements: true,
      has_employment_proof: false,
      has_accommodation: false,
      has_flight_booking: false,
      has_travel_insurance: false,
      application_status: "reviewing",
      payment_status: "paid",
      payment_amount: 249,
      created_at: "2026-03-08T09:30:00.000Z",
      updated_at: "2026-03-09T11:20:00.000Z",
    },
    {
      // Unpaid draft: previews the dashboard's Payment due state.
      id: "demo-app-multi-3",
      tracking_token: "ez-demo-multi-se2026",
      full_name: "Marcus Vance",
      email: "demo.family@ezvisa.net",
      phone: "+971 52 111 2222",
      nationality: "Indian / UAE Resident",
      destination_country: "Sweden",
      travel_purpose: "Tourism",
      has_passport: false,
      has_photos: false,
      has_bank_statements: false,
      has_employment_proof: false,
      has_accommodation: false,
      has_flight_booking: false,
      has_travel_insurance: false,
      application_status: "draft",
      payment_status: "pending",
      payment_amount: 249,
      created_at: "2026-03-10T08:00:00.000Z",
      updated_at: "2026-03-10T08:05:00.000Z",
    },
  ],
};

/** Review rows of the demo cases (same shape as the document_reviews table). */
export const DEMO_DOCUMENT_REVIEWS: Record<string, { document_type: string; status: string; note: string | null; reviewed_at: string }[]> = {
  "demo-app-pending": [
    { document_type: "passportCopy", status: "approved", note: null, reviewed_at: "2026-03-11T09:00:00.000Z" },
    { document_type: "residencyCopy", status: "checking", note: null, reviewed_at: "2026-03-11T09:05:00.000Z" },
    {
      document_type: "photo",
      status: "rejected",
      note: "The background is not plain white and the photo is cropped at the chin. Please retake it against a white wall, face centred, no glasses.",
      reviewed_at: "2026-03-11T09:10:00.000Z",
    },
  ],
}

/** Saved travellers of the demo accounts (GET /api/travellers never reads or writes the database for them). */
export const DEMO_TRAVELLERS: Record<string, Traveller[]> = {
  "demo.ready@ezvisa.net": [
    { id: "demo-traveller-ready-1", relationship: "self", firstName: "Ahmed", lastName: "Hassan", nationality: "Egypt", dateOfBirth: "1988-04-12", passportNumber: "A12345678", passportExpiry: "2031-06-30", hasValidPassport: "yes", phone: "+971 50 123 4567", phoneCountry: "AE", cityOfResidence: "Dubai", lastUsedAt: "2026-03-01T09:00:00.000Z" },
  ],
  "demo.pending@ezvisa.net": [
    { id: "demo-traveller-pending-1", relationship: "self", firstName: "Sara", lastName: "Al-Mansoor", nationality: "Jordan", dateOfBirth: "1992-11-03", passportNumber: "K98765432", passportExpiry: "2030-01-15", hasValidPassport: "yes", phone: "+971 55 765 4321", phoneCountry: "AE", cityOfResidence: "Abu Dhabi", lastUsedAt: "2026-03-05T09:00:00.000Z" },
  ],
  "demo.family@ezvisa.net": [
    { id: "demo-traveller-family-1", relationship: "self", firstName: "Marcus", lastName: "Vance", nationality: "India", dateOfBirth: "1985-02-20", passportNumber: "Z11223344", passportExpiry: "2032-09-09", hasValidPassport: "yes", phone: "+971 52 111 2222", phoneCountry: "AE", cityOfResidence: "Dubai", lastUsedAt: "2026-03-08T09:00:00.000Z" },
    { id: "demo-traveller-family-2", relationship: "spouse", firstName: "Elena", lastName: "Vance", nationality: "India", dateOfBirth: "1987-07-14", passportNumber: "Z55667788", passportExpiry: "2029-12-01", hasValidPassport: "yes", cityOfResidence: "Dubai", lastUsedAt: "2026-03-08T09:00:00.000Z" },
  ],
};

export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower === "demo.ready@ezvisa.net" ||
    lower === "demo.pending@ezvisa.net" ||
    lower === "demo.family@ezvisa.net" ||
    lower.startsWith("demo@") ||
    lower.includes("demo-")
  );
}

export function isDemoToken(token?: string | null): boolean {
  if (!token) return false;
  return token.startsWith("ez-demo-") || token.startsWith("demo-");
}

export function getDemoApplicationsByEmail(email: string): VisaApplication[] {
  const lower = email.toLowerCase().trim();
  if (DEMO_APPLICATIONS[lower]) {
    return DEMO_APPLICATIONS[lower];
  }
  return DEMO_APPLICATIONS["demo.ready@ezvisa.net"];
}

export function getDemoApplicationByToken(token: string): VisaApplication | null {
  for (const apps of Object.values(DEMO_APPLICATIONS)) {
    const found = apps.find((a) => a.tracking_token === token || a.id === token);
    if (found) return found;
  }
  return null;
}

export function getDemoRelatedApplications(token: string): VisaApplication[] {
  const target = getDemoApplicationByToken(token);
  if (!target) return [];
  return getDemoApplicationsByEmail(target.email);
}
