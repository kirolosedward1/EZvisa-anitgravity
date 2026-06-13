# Payment and HubSpot Integration Fixes

## Issues Fixed

### 1. HubSpot Integration Issues

#### Problem 1: Environment Variable Mismatch
**Issue**: Documentation referenced `HUBSPOT_API_KEY` but code used `HUBSPOT_ACCESS_TOKEN`
**Fix**: Updated code to support both variable names for backward compatibility
**Location**: `/app/api/hubspot/create-lead/route.ts`

#### Problem 2: Duplicate Contact Error (409 CONFLICT)
**Issue**: When a contact already exists in HubSpot, the API returns a 409 error, which was being handled but not logged properly
**Fix**: 
- Added detailed logging for conflict scenarios
- Enhanced the search and update flow with better error messages
- Added response data logging for debugging

#### Problem 3: Insufficient Error Logging
**Issue**: Limited visibility into HubSpot API responses
**Fix**:
- Added comprehensive console logging at each step
- Log API response status codes
- Log JSON response data for debugging
- Added success confirmation logs

### 2. Payment Flow Issues

#### Problem 1: Unclear Error Messages
**Issue**: Generic error messages didn't help users understand what went wrong
**Fix**:
- Enhanced error messages with specific details
- Added guidance to refresh page or contact support
- Log error stack traces for debugging

#### Problem 2: Missing Response Validation
**Issue**: Didn't check if payment API returned OK status before parsing JSON
**Fix**:
- Added response.ok check before parsing
- Handle non-200 status codes explicitly
- Parse and log error responses

#### Problem 3: Insufficient Payment Amount Validation
**Issue**: Limited logging around payment amount calculations
**Fix**:
- Log currency details (code, symbol, amount)
- Log amount type and value
- Add validation confirmation log

### 3. Error Handling Improvements

#### Added Console Logs (with [v0] prefix)
All critical operations now log:
- HubSpot API key detection
- Contact creation/update attempts
- Payment amount validation
- Payment API responses
- Error details with stack traces

## Testing Checklist

### HubSpot Integration Tests

1. **New Contact Creation**
   - [ ] Complete wizard with new email
   - [ ] Verify contact created in HubSpot
   - [ ] Check all properties populated
   - [ ] Verify note with visa details attached

2. **Existing Contact Update**
   - [ ] Complete wizard with existing email
   - [ ] Verify contact updated (not duplicated)
   - [ ] Check properties reflect new data
   - [ ] Verify new note attached to existing contact

3. **Error Scenarios**
   - [ ] Test with invalid HubSpot token
   - [ ] Test with HubSpot API down
   - [ ] Verify payment proceeds regardless

### Payment Flow Tests

1. **Valid Payment**
   - [ ] Complete wizard with all fields
   - [ ] Verify currency displayed correctly
   - [ ] Click "Proceed to Payment"
   - [ ] Verify redirect to Ziina payment page
   - [ ] Check console logs for validation steps

2. **Edge Cases**
   - [ ] Test with different currencies (if supported)
   - [ ] Test with married + spouse scenario
   - [ ] Test without documents uploaded
   - [ ] Verify all scenarios reach payment

3. **Error Handling**
   - [ ] Test with invalid payment amount (manual test)
   - [ ] Verify error message is user-friendly
   - [ ] Check console logs show detailed error info

## Monitoring & Debugging

### Console Log Patterns

**Successful HubSpot Flow:**
\`\`\`
[v0] Creating HubSpot lead for: user@example.com
[v0] HubSpot token found, proceeding with API call
[v0] HubSpot lead created successfully: 12345
[v0] Note added to new contact
\`\`\`

**Duplicate Contact Flow:**
\`\`\`
[v0] Creating HubSpot lead for: user@example.com
[v0] HubSpot token found, proceeding with API call
[v0] HubSpot API returned non-OK status: 409
[v0] Response data: {"status":"error","message":"Contact already exists..."}
[v0] Contact exists (409 CONFLICT), attempting to update: user@example.com
[v0] HubSpot contact updated successfully: 12345
[v0] Update response: {...}
[v0] Note added to contact
\`\`\`

**Successful Payment Flow:**
\`\`\`
[v0] Payment validation PASSED - proceeding to payment
[v0] Submitting application to database...
[v0] Application submitted: {...}
[v0] Sending lead to HubSpot...
[v0] HubSpot lead created/updated successfully
[v0] Payment step - currency: AED amount: 99 symbol: AED
[v0] Payment amount type: number value: 99
[v0] Payment amount validated successfully
[v0] Creating payment intent...
[v0] Payment API response status: 200
[v0] Payment API response data: {...}
[v0] Redirecting to payment page: https://...
\`\`\`

### Common Issues & Solutions

**Issue**: "HubSpot access token not configured"
**Solution**: Add either `HUBSPOT_ACCESS_TOKEN` or `HUBSPOT_API_KEY` to environment variables

**Issue**: Payment amount shows as undefined
**Solution**: Check currency selection, verify currency state is set correctly

**Issue**: Payment redirect doesn't happen
**Solution**: Check console for `redirect_url` in response, verify Ziina API key is valid

## Environment Variables Required

\`\`\`bash
# HubSpot (either one works)
HUBSPOT_ACCESS_TOKEN=your_token_here
# OR
HUBSPOT_API_KEY=your_token_here

# Payment Gateway
ZIINA_API_KEY=your_ziina_key_here

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## Code Changes Summary

### Files Modified:

1. **`/app/api/hubspot/create-lead/route.ts`**
   - Support both env variable names
   - Enhanced error logging
   - Better response logging
   - Improved conflict handling

2. **`/components/apply/payment-step.tsx`**
   - Enhanced payment validation logging
   - Added response status checks
   - Improved error messages
   - Better error stack trace logging

## Future Improvements

1. **Retry Logic**: Add automatic retry for transient failures
2. **Queue System**: Queue HubSpot updates if API is down
3. **Webhooks**: Listen to payment webhooks to update application status
4. **Analytics**: Track payment success/failure rates
5. **User Notifications**: Email users on payment success/failure

## Support

If issues persist after these fixes:
1. Check all environment variables are set
2. Review console logs with `[v0]` prefix
3. Verify HubSpot API token permissions
4. Test Ziina API key in isolation
5. Check Supabase connection and schema
