# HubSpot Integration Setup

## Credentials Configured

Your HubSpot integration is configured with:

- **Access Token (Private App Token)**: `pat-eu1-YOUR_HUBSPOT_ACCESS_TOKEN`
- **Client Secret**: `YOUR_HUBSPOT_CLIENT_SECRET`
- **Region**: EU (European data center)

## Environment Variables

Add these to your Vercel project environment variables:

\`\`\`bash
HUBSPOT_ACCESS_TOKEN=pat-eu1-YOUR_HUBSPOT_ACCESS_TOKEN
HUBSPOT_CLIENT_SECRET=YOUR_HUBSPOT_CLIENT_SECRET
\`\`\`

### How to Add to Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add both variables:
   - Key: `HUBSPOT_ACCESS_TOKEN`, Value: `pat-eu1-YOUR_HUBSPOT_ACCESS_TOKEN`
   - Key: `HUBSPOT_CLIENT_SECRET`, Value: `YOUR_HUBSPOT_CLIENT_SECRET`
4. Save and redeploy

## API Endpoints

Since your token is from the **EU data center** (`pat-eu1-`), the integration uses:
- Base API URL: `https://api.hubapi.com`

## Contact Properties Created

When a lead clicks "Proceed to Payment", the following data is sent to HubSpot:

**Standard Properties:**
- Email
- First Name
- Last Name
- Phone
- Nationality

**Custom Properties:**
- Visa Destination Country
- Departure Date
- Return Date
- Employment Status
- Marital Status
- Lead Status: "NEW"
- Lifecycle Stage: "lead"

## Testing

After adding environment variables, test by:
1. Fill out the visa application form
2. Click "Proceed to Payment"
3. Check your HubSpot Contacts to see the new lead

## Notes

- The integration handles duplicate contacts by updating existing records
- If HubSpot fails, the payment process continues (won't block users)
- All API calls are logged with `[v0]` prefix for debugging
