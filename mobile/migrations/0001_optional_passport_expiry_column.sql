-- NOT APPLIED. Optional, non-destructive. Needs owner approval before running on ezvisa-uae (dravvaykssrbktztmrlj).
-- Phase 1 stores the passport expiry date only inside additional_notes -> wizard JSON (no schema change).
-- If staff want it as a real column (searchable in the admin), add it like this; existing rows stay NULL.
alter table public.visa_applications add column if not exists passport_expiry_date date;
comment on column public.visa_applications.passport_expiry_date is 'Passport expiry; app requires >= return date + 3 months';
