# Wizard Debugging Guide

## Issue Resolution Summary

### Problem Identified
The payment step was validating against **outdated spouse fields** that no longer exist in the FormData interface after the wizard simplification. This caused the error "Please complete spouse information before proceeding to payment" even when all information was correctly provided.

### Root Cause
When the spouse step was simplified (removing email, phone, date of birth, passport number, and passport expiry), the payment step validation logic was not updated to reflect these changes. The payment step was still checking for:
- `spouseEmail`
- `spousePhone`
- `spouseDateOfBirth`
- `spousePassportNumber`
- `spousePassportExpiry`

These fields no longer exist in the form data structure.

### Solution Implemented

#### 1. Updated FormData Interface (`/app/apply/page.tsx`)
Added the correct spouse fields to the main FormData interface:
\`\`\`typescript
// Spouse Information (if married and accompanying)
spouseFirstName?: string
spouseLastName?: string
spouseHasValidPassport?: "yes" | "no" | undefined
spouseOccupation?: string
\`\`\`

#### 2. Fixed Payment Step Validation (`/components/apply/payment-step.tsx`)
Updated the spouse validation logic to check only the fields that exist:
\`\`\`typescript
const hasSpouseData =
  formData.spouseFirstName &&
  formData.spouseLastName &&
  formData.spouseHasValidPassport
\`\`\`

#### 3. Updated Payment Step Props Interface
Corrected the interface to include only valid spouse fields:
\`\`\`typescript
spouseFirstName: string
spouseLastName: string
spouseHasValidPassport: "yes" | "no" | undefined
\`\`\`

## Wizard Flow Validation

### Step 1: Personal Information (NationalityStep)
**Required Fields:**
- Nationality
- Destination country
- Country of residence
- City of residence
- First name
- Last name
- Email (validated format)
- Phone (validated: 8-15 digits)
- Valid passport status (yes/no)
- Marital status
- Spouse accompanying (if married)

**Validation:** ✅ All fields properly validated

### Step 2: Spouse Information (SpouseStep - Conditional)
**Only shown if:** `maritalStatus === "married" && spouseAccompanying === "yes"`

**Required Fields:**
- Spouse first name
- Spouse last name
- Spouse valid passport status (yes/no)

**Optional Fields:**
- Spouse occupation

**Validation:** ✅ Correctly validates simplified fields

### Step 3: Employment (EmploymentStep)
**Required Fields:**
- Employment status
- Fields based on employment type (job title, company, etc.)
- Employment start date (for employed)

**Validation:** ✅ Conditional validation based on employment status

### Step 4: Trip Details (TripDetailsStep)
**Required Fields:**
- Purpose of trip
- Additional countries (with arrival/departure dates)
- Travel itinerary

**Validation:** ✅ Date validation and country selection working

### Step 5: Documents (DocumentsStep)
**Required Actions:**
- Upload documents OR select "Upload Later"

**Validation:** ✅ Allows progression with upload later option

### Step 6: Payment (PaymentStep - Final Step)
**Pre-Payment Validation:**
- If spouse is accompanying: validates spouse information
- Checks for uploaded documents (warns if missing)
- Verifies form completeness

**Validation:** ✅ Now correctly validates against current form structure

## Testing Checklist

### Single Applicant Flow (No Spouse)
- [x] Step 1: Personal info validation
- [x] Step 2: Employment validation
- [x] Step 3: Trip details validation
- [x] Step 4: Documents step
- [x] Step 5: Payment proceeds without spouse validation

### Married Applicant - Spouse Not Accompanying
- [x] Step 1: Personal info with marital status = married, spouse = no
- [x] Step 2: Employment (spouse step skipped)
- [x] Step 3: Trip details
- [x] Step 4: Documents
- [x] Step 5: Payment proceeds without spouse validation

### Married Applicant - Spouse Accompanying
- [x] Step 1: Personal info with marital status = married, spouse = yes
- [x] Step 2: Spouse information (only 3 required fields)
- [x] Step 3: Employment
- [x] Step 4: Trip details
- [x] Step 5: Documents
- [x] Step 6: Payment validates spouse fields correctly

## Data Flow Architecture

### State Management
\`\`\`
localStorage (WIZARD_STORAGE_KEY)
    ↓
FormData State (React useState)
    ↓
Individual Step Components
    ↓
updateFormData callback
    ↓
Auto-save to localStorage (300ms debounce)
\`\`\`

### Step Navigation
\`\`\`
URL Params (?step=personal)
    ↔
currentStep (React state)
    ↓
renderStepContent() conditional rendering
    ↓
Step-specific component
\`\`\`

### Conditional Step Logic
The wizard dynamically adjusts total steps based on marital status:
- **Without spouse:** 5 steps total
- **With spouse:** 6 steps total (spouse step inserted at position 2)

## Common Issues and Solutions

### Issue: "Please complete spouse information" error
**Cause:** Payment step checking for non-existent fields
**Solution:** ✅ FIXED - Updated validation to match current FormData structure

### Issue: Date picker not opening
**Cause:** showPicker() wrapped in complex onClick handlers with hidden calendar indicators
**Solution:** ✅ FIXED - Removed wrapper divs and made date inputs work naturally

### Issue: Steps not clickable
**Cause:** Missing click handlers on completed steps
**Solution:** ✅ FIXED - Added handleStepClick function with navigation logic

### Issue: Form data not persisting
**Cause:** Missing fields in defaultFormData
**Solution:** ✅ FIXED - Added all spouse fields to default state

## Validation Flow Diagram

\`\`\`
User fills form
    ↓
onChange updates formData
    ↓
isFormValid computed (real-time)
    ↓
User clicks "Continue"
    ↓
handleSubmit checks isFormValid
    ↓
  YES → onNext() advances to next step
  NO  → showErrors = true, display validation messages
\`\`\`

## Future Maintenance Notes

### When Adding New Fields:
1. Add to FormData interface in `/app/apply/page.tsx`
2. Add to defaultFormData object
3. Add to form-types.ts if shared
4. Update step component validation logic
5. Update payment step validation if required for payment

### When Removing Fields:
1. Remove from FormData interface
2. Remove from defaultFormData
3. **IMPORTANT:** Check payment step validation
4. Check all step validations
5. Grep for field references across codebase

### When Modifying Step Flow:
1. Update steps array in useMemo
2. Update renderStepContent switch statement
3. Update totalSteps calculation
4. Test both spouse and non-spouse flows

## Performance Optimizations Applied

1. **Auto-save debouncing:** 300ms delay prevents excessive localStorage writes
2. **URL update throttling:** Prevents rapid URL changes during state updates
3. **Memoized step calculations:** useMemo for steps array prevents unnecessary recalculations
4. **Callback memoization:** useCallback for handleNext, handleBack, handleStepClick

## Accessibility Features

1. **Error announcements:** role="alert" and aria-live="polite" for screen readers
2. **Keyboard navigation:** All form fields properly focusable
3. **Descriptive labels:** Clear label associations for all inputs
4. **Progress indicators:** Visual and text-based progress tracking

## Security Considerations

1. **Client-side validation only:** Server-side validation still required
2. **localStorage data:** Temporary storage, cleared after submission
3. **File uploads:** Validated on server, not just client
4. **Payment data:** Never stored in localStorage

---

**Last Updated:** 2025-02-05
**Status:** All known validation issues resolved ✅
