# HubSpot Integration Guide

## Overview

The visa application wizard now integrates with HubSpot CRM to automatically capture leads when users proceed to payment, regardless of whether the payment succeeds or fails.

## How It Works

1. User completes the visa application wizard
2. When they click "Proceed to Payment", the system:
   - Sends all form data to HubSpot to create/update a contact
   - Proceeds with payment flow regardless of HubSpot success/failure
3. Lead data is captured even if payment fails

## Setup

### 1. Get HubSpot API Key

1. Log in to your HubSpot account
2. Go to Settings → Integrations → Private Apps
3. Create a new private app with these scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
4. Copy the API key

### 2. Add Environment Variable

Add to your Vercel project or `.env.local`:

\`\`\`
# Either variable name works - the system supports both
HUBSPOT_ACCESS_TOKEN=your_hubspot_api_key_here
# OR
HUBSPOT_API_KEY=your_hubspot_api_key_here
\`\`\`

**Note**: The system supports both `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_API_KEY` for backward compatibility.

### 3. Create Custom Properties (Optional)

To store visa-specific data, create these custom properties in HubSpot:

- `nationality` (Single-line text)
- `destination` (Single-line text)
- `country_of_residence` (Single-line text)
- `city_of_residence` (Single-line text)
- `travel_start_date` (Date)
- `travel_end_date` (Date)
- `employment_status` (Dropdown)
- `job_title` (Single-line text)
- `company_name` (Single-line text)
- `monthly_salary` (Number)
- `purpose_of_trip` (Multi-line text)
- `marital_status` (Dropdown)
- `spouse_accompanying` (Dropdown: Yes/No)

## Data Captured

The following information is sent to HubSpot:

### Standard Properties
- Email (required, used as unique identifier)
- First Name
- Last Name
- Phone
- Lead Status: "NEW"
- Lifecycle Stage: "lead"

### Custom Properties
- Nationality
- Destination country
- Country of residence
- City of residence
- Travel dates
- Employment status
- Job title
- Company name
- Monthly salary
- Purpose of trip
- Marital status
- Spouse accompanying

## Behavior

### New Contacts
- Creates a new contact in HubSpot with all provided data

### Existing Contacts
- Searches for contact by email
- Updates existing contact with latest information
- Preserves data integrity

### Error Handling
- HubSpot failures do NOT prevent payment
- Errors are logged but don't show to user
- Payment flow continues normally
- This ensures users aren't blocked if HubSpot is down

## Testing

1. Complete a visa application
2. Click "Proceed to Payment"
3. Check your HubSpot contacts for the new lead
4. Verify all custom properties are populated

## API Endpoint

`POST /api/hubspot/create-lead`

**Request Body:** Complete FormData object

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Lead created in HubSpot",
  "contactId": "12345"
}
\`\`\`

## Monitoring

Check server logs for:
- `[v0] Creating HubSpot lead for: email@example.com`
- `[v0] HubSpot lead created successfully: 12345`
- `[v0] HubSpot contact updated successfully: 12345`

## Troubleshooting

**API Key Issues:**
- Verify `HUBSPOT_API_KEY` is set in environment variables
- Check that the API key has correct scopes
- Ensure the private app is not expired

**Custom Properties Missing:**
- Create custom properties in HubSpot settings
- Use exact property names as shown in setup

**Duplicate Contacts:**
- System automatically handles duplicates by updating existing contacts
- Email is used as unique identifier

## Privacy Compliance

Ensure your privacy policy covers data sharing with HubSpot for CRM purposes.
