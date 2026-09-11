-- Create a secure bucket for visa documents
insert into storage.buckets (id, name, public)
values ('visa_documents', 'visa_documents', false)
on conflict (id) do nothing;

-- Enable RLS
alter table storage.objects enable row level security;

-- Only admins can read/write via RLS, public users upload via API route (Service Role)
create policy "Admins have full access to visa_documents"
on storage.objects for all
to authenticated
using ( bucket_id = 'visa_documents' )
with check ( bucket_id = 'visa_documents' );
