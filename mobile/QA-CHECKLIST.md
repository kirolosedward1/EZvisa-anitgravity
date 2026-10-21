# EZvisa app: real-device QA checklist

Devices: **iPhone 390pt** (iPhone 12/13/14/15/16, 6.1") and **iPhone 430pt** (14/15/16 Plus/Pro Max, 6.7").
Open in Expo Go from the `preview` branch. Run every section on both devices; tick ✅ / ❌ and note the build group ID.

## 0. Setup
- [ ] Expo Go up to date, SDK 57 project opens without a red screen
- [ ] Settings › Face ID enrolled; also test once with Face ID off (passcode only)
- [ ] Test with Wi-Fi + mobile data, then with Airplane Mode

## 1. Layout (both widths)
- [ ] Home, Countries, Applications, Account: nothing clipped at the right edge, no horizontal scroll
- [ ] Last rows of every list clear the floating tab bar
- [ ] Large titles do not overlap the Dynamic Island / status bar
- [ ] Dynamic Type at the largest accessibility size: text wraps, buttons still tappable
- [ ] Keyboard never covers Continue / Save (wizard, Continue application, auth)

## 2. Wizard (pre-payment)
- [ ] Destination → Nationality (visa-required only) → Residence fixed to UAE → City = 7 emirates
- [ ] Valid passport "No" shows the note and blocks Continue; "Yes" asks number + expiry
- [ ] Expiry < return date + 3 months shows the inline error
- [ ] DOB wheel is full width; inline calendars fill their card
- [ ] Return-date quick picks (1w/2w/3w/1m) set the right date
- [ ] No employment questions before payment; step count matches (3 or 4 segments)
- [ ] Review: tap an answer → edit → "Back to review"
- [ ] Kill the app mid-wizard, reopen: same question, answers kept
- [ ] Start a second country from its page: Home shows both drafts; × removes only that draft

## 3. Guest checkout
- [ ] Signed out: review says "No account needed to pay", button "Submit application"
- [ ] Submit → Pay opens Ziina sheet (or WhatsApp fallback message if payment is unavailable)
- [ ] After paying: "Sign in to continue" opens sign-in with the same email prefilled
- [ ] Signing in with that email shows the application with "Continue application"

## 4. After payment
- [ ] Continue application: employment type; employed shows job title + company together (Next → Done), start date, salary, NOC
- [ ] Self-employed: company + income, no NOC; checklist hides NOC
- [ ] Save → application page → documents unlocked
- [ ] Upload PDF / photo / scan (multi-page); file > 5 MB is refused with a clear message
- [ ] Airplane Mode during upload: row shows "Offline · will upload…", resumes alone when back online
- [ ] Bad connection: retry countdown shown, attempts n/6; Retry / Remove work on failed items

## 5. Arabic / RTL
- [ ] Account › Language › العربية: app restarts in RTL, wizard draft still there
- [ ] All screens Arabic (no English leftovers except brand names), chevrons and back arrows mirrored
- [ ] Countries list in Arabic order, search works with Arabic names
- [ ] Switch back to English: LTR again, nothing lost

## 6. Account
- [ ] Account details: name, email, sign-in method, member since
- [ ] Application history lists every application, tap opens it
- [ ] Receipts appear only for paid applications; tap → PDF share sheet with real amount and reference
- [ ] Delete account → sheet → WhatsApp / email open with the request prefilled (no passport data)

## 7. Support
- [ ] Application page "Ask about this application" opens WhatsApp +971 54 710 9533 with the reference only
- [ ] Help (?) button on the application page: WhatsApp and Email

## 8. Appointment card
- [ ] Hidden when the application has no appointment
- [ ] With `additional_notes.appointment` set by staff: date/time, centre, reference shown
- [ ] Add to calendar opens the iOS event sheet with the right time and location
- [ ] Directions opens Apple Maps to the centre

## 9. Face ID lock
- [ ] Account › Security › Unlock with Face ID: turning on asks Face ID once
- [ ] Lock after: Immediately / 1 / 5 / 15 min respected after backgrounding
- [ ] App switcher shows a blurred cover (no personal data visible)
- [ ] Face ID fails → passcode fallback works; Cancel leaves the lock screen with an Unlock button
- [ ] Sign out removes the lock screen

## 10. Regression
- [ ] Notifications screen opens; reminders toggle schedules on device
- [ ] Pull to refresh on Home and application page
- [ ] No red screens / yellow boxes in a full run-through
