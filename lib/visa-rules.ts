export interface VisaFee {
  eur: number;
  aed: number;
  note: string;
}

export interface ProcessingTime {
  minDays: number;
  maxDays: number;
  note: string;
}

export interface ProviderConfig {
  default: string;
  overrides: Record<string, string>;
}

export interface VisaRulesConfig {
  lastReviewed: string;
  schengen: {
    standardFee: VisaFee;
    processingTime: ProcessingTime;
    stayDuration: string;
    providers: ProviderConfig;
  };
}

export const VISA_RULES: VisaRulesConfig = {
  lastReviewed: "2026-09-10",
  schengen: {
    standardFee: {
      eur: 90,
      aed: 360, // approximate conversion or typical fee
      note: "Standard adult fee paid at the center. Under 6 years free.",
    },
    processingTime: {
      minDays: 1,
      maxDays: 2,
      note: "We prepare your application in 1–2 days. The embassy decision takes longer and depends on the embassy.",
    },
    stayDuration: "Up to 90 days in a 180-day window",
    providers: {
      default: "VFS Global Center",
      overrides: {
        france: "TLScontact",
        switzerland: "VFS Global",
        germany: "VFS Global",
        italy: "VFS Global",
        spain: "BLS International",
        greece: "VFS Global",
        netherlands: "VFS Global",
        austria: "VFS Global",
      },
    },
  },
};

/**
 * Helper to get the correct visa center provider for a specific destination slug.
 */
export function getProviderForDestination(slug: string): string {
  const normalizedSlug = slug.toLowerCase();
  return VISA_RULES.schengen.providers.overrides[normalizedSlug] || VISA_RULES.schengen.providers.default;
}
