// Amounts shown by the app design (canvas note "Placeholders to confirm"), confirmed by the owner on 2026-10-30.
// None is ever charged by the app: the server (website app/api/create-payment) charges only the EZvisa
// service fee from the contract (lib/wizard.ts PRICE_AED × travellers). Screens read every other amount from here,
// so confirming a number is a one-line change.

/** insurance quote per traveller, in AED. Insurance is quoted separately and never added to "Due now". */
export const INSURANCE_AED_PER_TRAVELLER = 90;

/** referral credit, in AED, for the friend's first application and the referrer's next one. No backend yet. */
export const REFERRAL_CREDIT_AED = 50;

/** Schengen visa fee per adult in EUR, paid at the appointment, never to EZvisa. */
export const VISA_FEE_EUR = 90;

/** rough AED value of the visa fee per adult, shown as "about …". Not an exchange-rate feed. */
export const VISA_FEE_AED_ESTIMATE = 360;

/** visa centre service fee per adult in AED, paid at the appointment, shown as "about …". */
export const CENTRE_FEE_AED_ESTIMATE = 130;

/** VAT rate shown as "VAT 5% included" on the price breakdown. Confirm EZvisa's VAT registration first. */
export const VAT_RATE = 0.05;

/** Fees paid at the appointment for `travellers` adults (estimates only). */
export const appointmentFeesAed = (travellers: number) => ({
  visa: VISA_FEE_AED_ESTIMATE * travellers,
  centre: CENTRE_FEE_AED_ESTIMATE * travellers,
});

/** VAT already contained in a VAT-inclusive amount, rounded to fils. */
export const vatIncluded = (amountAed: number) => Math.round((amountAed - amountAed / (1 + VAT_RATE)) * 100) / 100;
