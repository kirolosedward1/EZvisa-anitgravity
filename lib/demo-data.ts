import type { VisaApplication } from "@/lib/types/visa-application";

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
    description: "2 active visa files to test the multi-case switcher",
    badge: "2 Applications",
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
      phone: "+971 50 123 4567",
      nationality: "Egyptian",
      destination_country: "France",
      travel_purpose: "Tourism & Exploration",
      entry_date: "2026-05-15",
      exit_date: "2026-05-25",
      duration_days: 10,
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
      duration_days: 12,
      has_passport: true,
      has_photos: false,
      has_bank_statements: false,
      has_employment_proof: false,
      has_accommodation: false,
      has_flight_booking: false,
      has_travel_insurance: false,
      application_status: "submitted",
      payment_status: "paid",
      payment_amount: 249,
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
      duration_days: 13,
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
      duration_days: 13,
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
