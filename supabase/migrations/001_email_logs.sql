-- Migration for email system
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  language TEXT DEFAULT 'en'
);

-- Idempotency constraint: Prevent sending the same event to the same entity twice
-- e.g. event_type = 'payment.completed', entity_id = 'app_123'
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_idempotency_idx ON email_logs(event_type, entity_id);

-- Alter visa_applications to add tracking token and preferred language
ALTER TABLE visa_applications 
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Create an index for quick tracking lookups
CREATE INDEX IF NOT EXISTS visa_applications_tracking_idx ON visa_applications(tracking_token);
