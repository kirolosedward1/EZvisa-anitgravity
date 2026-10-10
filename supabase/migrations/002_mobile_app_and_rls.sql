-- 002: Mobile (iOS) app support + RLS hardening for visa_applications
--
-- Safe to run more than once. Run AFTER 001_email_logs.sql (it re-adds the 001
-- columns defensively in case 001 was never applied to this database).
--
-- What this does:
--   1. Links applications to Supabase Auth users (user_id) so web + iOS see the
--      same applications for the same account.
--   2. Adds server-side wizard drafts (wizard_data / current_step / version) so a
--      draft started on the phone can be finished on the web and vice versa.
--   3. Adds application_documents (one row per uploaded file) and
--      application_status_history (timeline shown in the app).
--   4. Replaces the existing visa_applications policies. The old SELECT/UPDATE
--      policies allowed ANY signed-in user to read and modify EVERY application.
--      All server routes use the service role, so they are unaffected.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wizard_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

UPDATE public.visa_applications SET tracking_token = gen_random_uuid() WHERE tracking_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS visa_applications_tracking_token_key ON public.visa_applications(tracking_token);
CREATE INDEX IF NOT EXISTS visa_applications_user_id_idx ON public.visa_applications(user_id);
CREATE INDEX IF NOT EXISTS visa_applications_email_lower_idx ON public.visa_applications(lower(email));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visa_applications_source_check') THEN
    ALTER TABLE public.visa_applications
      ADD CONSTRAINT visa_applications_source_check CHECK (source IN ('web', 'ios', 'android', 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visa_applications_application_status_check') THEN
    ALTER TABLE public.visa_applications
      ADD CONSTRAINT visa_applications_application_status_check
      CHECK (application_status IN ('draft', 'submitted', 'reviewing', 'approved', 'ready', 'rejected'));
  END IF;
END $$;

-- Drafts have no name/email/etc yet.
ALTER TABLE public.visa_applications
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN nationality DROP NOT NULL,
  ALTER COLUMN destination_country DROP NOT NULL,
  ALTER COLUMN travel_purpose DROP NOT NULL;

-- updated_at + optimistic-concurrency version bump
CREATE OR REPLACE FUNCTION public.visa_applications_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.wizard_data IS DISTINCT FROM OLD.wizard_data THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS visa_applications_touch ON public.visa_applications;
CREATE TRIGGER visa_applications_touch
  BEFORE UPDATE ON public.visa_applications
  FOR EACH ROW EXECUTE FUNCTION public.visa_applications_touch();

-- ---------------------------------------------------------------------------
-- 2. Status history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.visa_applications(id) ON DELETE CASCADE,
  application_status TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_status_history_app_idx
  ON public.application_status_history(application_id, created_at);

CREATE OR REPLACE FUNCTION public.visa_applications_log_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.application_status IS DISTINCT FROM OLD.application_status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.application_status_history (application_id, application_status, payment_status)
    VALUES (NEW.id, NEW.application_status, NEW.payment_status);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS visa_applications_log_status ON public.visa_applications;
CREATE TRIGGER visa_applications_log_status
  AFTER INSERT OR UPDATE OF application_status, payment_status ON public.visa_applications
  FOR EACH ROW EXECUTE FUNCTION public.visa_applications_log_status();

-- ---------------------------------------------------------------------------
-- 3. Uploaded documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.visa_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  original_name TEXT,
  uploaded_via TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_documents_app_idx ON public.application_documents(application_id);

-- Private bucket used by the existing upload/download routes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('visa_documents', 'visa_documents', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
-- Ownership rule shared by every policy: the row is linked to this auth user,
-- or (for applications submitted on the web before the user had an account)
-- the application email equals the signed-in user's email.
CREATE OR REPLACE FUNCTION public.owns_application(app public.visa_applications)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    app.user_id = auth.uid()
    OR (app.user_id IS NULL AND app.email IS NOT NULL
        AND lower(app.email) = lower(auth.jwt() ->> 'email'))
  )
$$;

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.visa_applications;
DROP POLICY IF EXISTS "Only admins can update" ON public.visa_applications;
DROP POLICY IF EXISTS "Allow public submissions" ON public.visa_applications;
DROP POLICY IF EXISTS "visa_applications_select_own" ON public.visa_applications;

-- Read-only for clients. All writes go through server routes (service role),
-- which enforce validation, pricing and status rules.
CREATE POLICY "visa_applications_select_own" ON public.visa_applications
  FOR SELECT TO authenticated
  USING (public.owns_application(visa_applications));

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_history_select_own" ON public.application_status_history;
CREATE POLICY "status_history_select_own" ON public.application_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.visa_applications a
    WHERE a.id = application_id AND public.owns_application(a)
  ));

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_select_own" ON public.application_documents;
CREATE POLICY "documents_select_own" ON public.application_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.visa_applications a
    WHERE a.id = application_id AND public.owns_application(a)
  ));

-- email_logs is server-only.
ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;
