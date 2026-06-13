# Email System Documentation

Complete email automation system using Resend API for EZVisa.net visa applications.

## Overview

The email system automatically sends emails at critical points in the application journey:

1. **Application Submission** → Admin notification + Client confirmation
2. **Payment Success** → Client success email with next steps
3. **Payment Failure** → Client retry email with payment link

## Configuration

### Environment Variables

Add to your Vercel project or `.env.local`:

\`\`\`env
RESEND_API_KEY=re_WbXrEuBs_ArhgCnADWTtxbVQ3Lz3MRZLj
NEXT_PUBLIC_SITE_URL=https://ezvisa.net
\`\`\`

### Email Sender

Update the `FROM_EMAIL` in `/app/api/send-email/route.ts`:

\`\`\`typescript
const FROM_EMAIL = "EZVisa <noreply@yourdomain.com>"
\`\`\`

**Note**: You need to verify your domain in Resend dashboard. Until then, emails will be sent from `onboarding@resend.dev`.

## Email Flow

### 1. Application Submission

**Trigger**: When user completes wizard and clicks "Proceed to Payment"

**Emails Sent**:
- ✉️ **Admin Notification** → `ezvisa.net@gmail.com`
  - Contains full application details
  - Client contact information
  - Travel details
  - Document status
  
- ✉️ **Client Confirmation** → User's email
  - Application received confirmation
  - Next steps overview
  - Document upload reminder (if applicable)

**Code Location**: `/components/apply/payment-step.tsx` line 102-152

### 2. Payment Success

**Trigger**: When user completes payment and lands on `/payment-success` page

**Email Sent**:
- ✉️ **Payment Success** → User's email
  - Payment confirmation
  - Application summary
  - Next steps in visa processing
  - Document upload link (if needed)
  - Support contact information

**Code Location**: `/app/payment-success/page.tsx` line 16-66

### 3. Payment Retry

**Trigger**: Can be called manually or automated based on payment status check

**Email Sent**:
- ✉️ **Payment Retry** → User's email
  - Reminder to complete payment
  - Direct payment link
  - Application details recap
  - What they'll get after payment

**API Endpoint**: `POST /api/payment-retry`

**Example Usage**:
\`\`\`typescript
const response = await fetch('/api/payment-retry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'client@example.com',
    firstName: 'John',
    lastName: 'Doe',
    nationality: 'United States',
    destination: 'France',
    travelStartDate: '2024-06-01',
    travelEndDate: '2024-06-15',
    paymentLink: 'https://payment.ziina.com/xyz123'
  })
})
\`\`\`

## API Endpoints

### Send Email (Core)

`POST /api/send-email`

**Request Body**:
\`\`\`json
{
  "to": "user@example.com",
  "subject": "Your Visa Application",
  "html": "<html>...</html>",
  "type": "admin_notification|client_confirmation|payment_success|payment_retry"
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "message": "Email sent successfully",
  "emailId": "abc123"
}
\`\`\`

### Payment Retry

`POST /api/payment-retry`

See example usage above.

## Email Templates

All email templates are in `/lib/email-templates.ts`:

1. `getAdminNotificationEmail()` - New lead notification for admin
2. `getClientConfirmationEmail()` - Application received confirmation
3. `getPaymentSuccessEmail()` - Payment success notification
4. `getPaymentRetryEmail()` - Payment retry reminder

### Template Structure

Each template returns:
\`\`\`typescript
{
  subject: string
  html: string
}
\`\`\`

### Customizing Templates

Templates use inline CSS for maximum email client compatibility. To customize:

1. Edit the HTML in `/lib/email-templates.ts`
2. Test with different email clients
3. Use tables for layout (email best practice)
4. Keep styles inline

## Automated Payment Retry System

To implement automated retry emails for failed payments, you can:

### Option 1: Webhook-based (Recommended)

Set up Ziina webhook to notify your system of payment failures:

\`\`\`typescript
// app/api/webhooks/payment/route.ts
export async function POST(request: Request) {
  const { event, payment_intent } = await request.json()
  
  if (event === 'payment.failed') {
    // Send retry email
    await fetch('/api/payment-retry', {
      method: 'POST',
      body: JSON.stringify({
        email: payment_intent.customer_email,
        // ... other details
        paymentLink: payment_intent.retry_url
      })
    })
  }
}
\`\`\`

### Option 2: Scheduled Check (Cron)

Create a cron job to check payment status:

\`\`\`typescript
// app/api/cron/check-payments/route.ts
export async function GET() {
  // Get pending payments from database
  // Check status with Ziina API
  // Send retry emails for failed payments
}
\`\`\`

Add to `vercel.json`:
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/check-payments",
    "schedule": "0 */6 * * *"
  }]
}
\`\`\`

## Testing

### Test Email Sending

1. Complete a visa application
2. Check admin email: `ezvisa.net@gmail.com`
3. Check client email for confirmation
4. Complete payment to test success email
5. Use payment retry API to test retry email

### Debug Logs

All email operations are logged with `[v0]` prefix:
- `[v0] Sending email via Resend...`
- `[v0] Email sent successfully: {emailId}`
- `[v0] Email sending error: {error}`

Check browser console and server logs for email status.

## Best Practices

1. **Non-blocking**: Email sending doesn't block payment flow
2. **Error handling**: Failures are logged but don't stop the process
3. **User feedback**: Success page shows email sent confirmation
4. **Retry logic**: Built-in support for payment retry emails
5. **Responsive design**: All emails work on mobile devices

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify domain in Resend dashboard
3. Check email quota (Resend free tier: 100 emails/day)
4. Check browser console for error logs
5. Check Resend dashboard for delivery status

### Emails going to spam

1. Verify your domain with SPF/DKIM records
2. Use a professional "from" address
3. Avoid spam trigger words in subject lines
4. Include unsubscribe link (for marketing emails)

### Template not rendering

1. Use inline CSS only
2. Test with Litmus or Email on Acid
3. Avoid modern CSS features
4. Use tables for layout

## Future Enhancements

- [ ] Email templates in multiple languages
- [ ] Email preferences management
- [ ] Email analytics and tracking
- [ ] Automated reminder emails for document upload
- [ ] SMS notifications integration
- [ ] Email queue system for high volume

## Support

For issues with the email system:
1. Check server logs for `[v0]` email errors
2. Verify Resend API key and quota
3. Test with Resend API directly
4. Contact support@ezvisa.net

---

Last Updated: ${new Date().toISOString().split('T')[0]}
