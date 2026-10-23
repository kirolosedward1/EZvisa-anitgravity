# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

The iOS-native design language (Liquid Glass chrome, system type, iOS controls) is the reference on both iOS and Android. Android mirrors it; it does not switch to Material.

## Users

UAE residents who need a Schengen visa for a trip, mostly expats from Indian, Egyptian, Jordanian, Pakistani and other communities. Their nationality must be one that needs a Schengen visa. They are on their phone, often between other things, and want to get a correct application ready without learning embassy rules themselves. They read English or Arabic.

## Product Purpose

EZvisa (https://www.ezvisa.net) prepares Schengen visa applications. Experts tailor each file to what the embassy expects. The app lets a customer start an application, pay, add their employment details and documents after payment, and follow the case until the file is ready. Success means a complete, paid application with every document uploaded, and the customer always knowing what happens next.

## Positioning

People prepare each file. The app collects only what those people need, in the order they need it, and shows the real state of the case. It is not a template generator or a do-it-yourself form filler.

## Operating Context

- The app and the website share one backend: the same accounts, applications and payments (Supabase project `ezvisa-uae`). An application started on one shows up on the other.
- Flow: a one-question-per-screen wizard → review → payment through Ziina (the website API sets the price) → "Continue application" (employment, then document upload) → status tracking.
- Statuses: draft, submitted, paid, reviewing, file ready, cancelled. Customers can discard unpaid draft or submitted applications, which sets them to cancelled.
- Guest checkout: customers can pay before signing in, then sign in with the same email to continue.
- Support: WhatsApp, email and phone, with the application reference attached.
- Distribution today is Expo Go, through EAS Update on the `preview` channel. App Store and Play listings are still to come.

## Capabilities and Constraints

- Expo SDK 57 with expo-router. The app must keep running in Expo Go, so it can't add new native modules without a planned new build.
- Price: 249 AED, or 498 AED with a spouse. The server sets it; the app never decides the amount.
- Nationality: one choice, limited to nationalities that need a Schengen visa. Country of residence is fixed to the UAE, and the city is one of the 7 emirates (no flags).
- The app asks "Do you have a valid passport?" before the passport number. If the answer is No, the application continues with a note to get the passport and add it later.
- Any "No" to a document question (valid passport, Emirates ID, spouse's passport, NOC) never blocks: the app shows "add it later", lists it under "To get later" on Review and on the application page, and saves it as `additional_notes.missingDocuments` for the team. *(Rule, not yet in the shipped code: see `HANDOFF.md` §0.2.)*
- Self-employed applicants are not asked for a NOC.
- Before payment the app asks only: destination, nationality, city (residence is fixed to the UAE), name (first + last on one page), email + phone (one page; signed-in users only give the phone, the account email is used), marital status and, if married, whether the spouse travels (the price depends on it).
- Everything else comes after payment, one question per screen on "Continue application": trip details, UAE residence visa validity, date of birth, passport (valid?, number, expiry), spouse details, employment (job title and company on one page), then document upload. Travel itinerary, spouse occupation and the Emirates ID question are not asked.
- Home shows all of the user's applications. At most the 10 most recent failed or unpaid ones appear, each with Discard plus a confirmation.
- Languages: English and Arabic, with RTL support; Arabic strings live in `lib/ar.ts`. Dark mode is dropped for now.
- Auth: the website's methods (email + password, magic link, sign-up, password reset), same accounts. Google and Apple stay hidden until enabled on the project (the website doesn't offer them). Signed-out starts show Welcome; "Continue without an account" keeps guest checkout.
- The app uses only the publishable key. It never ships a service-role key.
- Undecided: branding for the Google sign-in screen (a custom domain or a consent-screen logo) before the store release; home-screen widget, MRZ reading and edge-detected scanning, which all need a native build.

## Brand Commitments

- Name: EZvisa. Domain: `ezvisa.net` only.
- Brand blue `#0436DC` is the single accent.
- Voice: plain and calm, with as little text as possible. Questions are the screen titles. No sales copy, no filler, no emoji.
- The look should feel native to iOS, not like a generic AI-made app. No gradients, glows or sparkle icons.

## Evidence on Hand

- Logos, app icons and splash screens: `assets/logo.png`, `assets/logo-dark.png`, `assets/icon.png`, `assets/splash-icon*.png`.
- Destination photos: `assets/countries/`. Flags: `assets/flags/`. Hero image: `assets/hero.jpg`.
- Allowed claim: the money-back guarantee if the visa is denied. The app must not show approval rates, visa counts or testimonials. The website's 98% / 5,000+ figures stay on the website.

## Product Principles

1. Ask only what the experts need, and only when they need it. Anything not needed to pay waits until after payment.
2. Show real state only: real statuses, real timestamps, real appointment data. Nothing is faked or estimated as fact.
3. Keep progress safe. Answers autosave and resume at the exact question on any device, and uploads survive going offline.
4. Treat money plainly. The server sets the price, the guarantee is stated where it matters, and payment problems lead to a human on WhatsApp.
5. Feel native and quiet: one task per screen, motion that responds to touch, and no persuasion.

## Accessibility & Inclusion

- English and Arabic, with full RTL layout.
- Dynamic Type up to the largest accessibility size without clipping. Buttons stay tappable.
- Respect Reduce Motion: every spring animation has a non-motion fallback.
- Optional Face ID lock. A blurred snapshot in the app switcher protects personal data.
