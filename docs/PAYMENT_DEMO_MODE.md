# Payment Demo Mode Implementation

## Overview
The payment system is configured in **demo mode** for testing and development. This allows you to test the complete payment flow without processing real transactions.

## Current Configuration

### Demo Mode Settings
- **Location**: `/app/api/create-payment/route.ts`
- **Parameter**: `test: true`
- **Payment Provider**: Ziina Payment Gateway
- **Currency**: AED (United Arab Emirates Dirham)

\`\`\`typescript
const response = await fetch("/api/create-payment", {
  body: JSON.stringify({
    amount: paymentAmount,
    currency: currency.code,
    success_url: `${window.location.origin}/payment-success`,
    cancel_url: `${window.location.origin}/payment-failed`,
    test: true, // Demo mode enabled
  }),
})
\`\`\`

## Payment Flow

### Success Flow
1. User completes application wizard
2. Clicks "Proceed to Payment"
3. System creates payment intent with `test: true`
4. User redirects to Ziina payment gateway (demo mode)
5. User completes test payment
6. Redirects to `/payment-success`
7. Success email sent to client
8. Application data cleared from session storage

### Failure Flow
1. User completes application wizard
2. Clicks "Proceed to Payment"
3. System creates payment intent with `test: true`
4. User redirects to Ziina payment gateway (demo mode)
5. User cancels or payment fails
6. Redirects to `/payment-failed`
7. Shows error message with retry option
8. Application data preserved in session storage
9. "Retry Payment" button redirects to `/apply?step=payment&retry=true`
10. Payment step shows error banner with previous failure reason
11. User can retry payment immediately

## Features

### 1. Automatic State Preservation
- Application data saved in `sessionStorage` before payment redirect
- Data structure includes:
  \`\`\`typescript
  {
    ...formData,
    paymentAmount: number,
    currency: string,
    currencySymbol: string,
  }
  \`\`\`
- Data persists across payment failure/retry cycles
- Cleared only on successful payment

### 2. Error Display
- Payment failure shows dedicated error page at `/payment-failed`
- Error reasons displayed:
  - Insufficient funds
  - Card declined by bank
  - Payment cancelled by user
  - Network connection issue
- Helpful support contact information provided

### 3. Retry Mechanism
- "Retry Payment" button available when application data exists
- Redirects to wizard payment step with error context
- URL pattern: `/apply?step=payment&retry=true`
- Error banner displays at top of payment step
- Full form data maintained for immediate retry

### 4. Email Notifications
When application is submitted (before payment):
- Admin notification sent to `ezvisa.net@gmail.com`
- Client confirmation sent to applicant's email
- Uses Resend API with verified domain `ezvisa.net`

When payment succeeds:
- Success email sent to client with payment details
- Includes next steps and support information

## URL Parameters

### Payment Step with Retry
\`\`\`
/apply?step=payment&retry=true
\`\`\`
- `step=payment` - Directly navigates to payment step
- `retry=true` - Triggers error banner display
- Preserves all form data from previous attempt

## Testing Demo Mode

### Test Successful Payment
1. Complete application wizard
2. Click "Proceed to Payment"
3. On Ziina demo page, use test card: **4242 4242 4242 4242**
4. Complete payment
5. Verify redirect to success page
6. Check email for confirmation

### Test Failed Payment
1. Complete application wizard
2. Click "Proceed to Payment"
3. On Ziina demo page, click "Cancel" or use declined test card
4. Verify redirect to failure page
5. Check "Retry Payment" button appears
6. Click retry and verify return to payment step
7. Verify error banner displays
8. Complete retry with successful test card

### Test Card Numbers (Demo Mode)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Insufficient Funds**: 4000 0000 0000 9995
- **Expired**: 4000 0000 0000 0069

## Switching to Production Mode

When ready to process real payments:

1. **Update test parameter**:
   \`\`\`typescript
   // In /components/apply/payment-step.tsx
   body: JSON.stringify({
     test: false, // Change to production mode
   })
   \`\`\`

2. **Verify Ziina API credentials**:
   - Ensure production API key in environment variables
   - Confirm domain whitelist includes your production domain

3. **Update monitoring**:
   - Set up payment webhook listeners
   - Configure Ziina webhooks for payment status updates
   - Enable production error logging

4. **Test production flow**:
   - Use small real amount (e.g., 1 AED) for testing
   - Verify success and failure flows
   - Confirm email notifications work correctly
   - Test refund process if applicable

## Files Modified

### Core Payment Files
- `/components/apply/payment-step.tsx` - Main payment component
- `/app/api/create-payment/route.ts` - Payment intent creation
- `/app/payment-success/page.tsx` - Success page with email
- `/app/payment-failed/page.tsx` - Failure page with retry

### Email System
- `/app/api/send-email/route.ts` - Resend email API
- `/lib/email-templates.ts` - Email HTML templates

### Wizard State
- `/app/apply/page.tsx` - Main wizard with retry detection

## Monitoring & Debugging

All payment operations log with `[v0]` prefix:
\`\`\`
[v0] Payment validation PASSED - proceeding to payment
[v0] Payment amount validated successfully
[v0] Creating payment intent...
[v0] Payment API response status: 200
[v0] Redirecting to payment page: https://...
\`\`\`

Check browser console for detailed flow information.

## Support

For payment issues or questions:
- Email: ezvisa.net@gmail.com
- Check console logs for detailed error information
- Verify Ziina API key is correctly configured
- Ensure demo mode test cards are used correctly
