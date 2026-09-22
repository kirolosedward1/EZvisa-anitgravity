-- Tighten Row Level Security on visa applications and uploaded documents.
--
-- 003 let ANY signed-in user read and update every visa application
-- (`OR auth.role() = 'authenticated'`), and 005 gave any signed-in user full
-- access to every file in the `visa_documents` bucket. Since anyone can create
-- an account via /signup, that exposed all applicants' personal data and
-- passport/bank documents.
--
-- All admin tooling and API routes use the service-role key, which bypasses
-- RLS, so these broad policies are not needed by the app.

-- visa_applications: customers may only read their own rows
DROP POLICY IF EXISTS "Users can view own submissions" ON public.visa_applications;
CREATE POLICY "Users can view own submissions" ON public.visa_applications
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- visa_applications: no client-side updates (service role only)
DROP POLICY IF EXISTS "Only admins can update" ON public.visa_applications;

-- visa_documents bucket: no client-side access (service role only)
DROP POLICY IF EXISTS "Admins have full access to visa_documents" ON storage.objects;
