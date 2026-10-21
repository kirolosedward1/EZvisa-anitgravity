-- NOT APPLIED. Needs [DB] approval. Real appointment fields for the app's appointment card.
-- Until applied, the app reads additional_notes.appointment = {at, centre, address, lat, lng, reference} if staff set it.
alter table public.visa_applications
  add column if not exists appointment_at timestamptz,
  add column if not exists appointment_centre text,
  add column if not exists appointment_address text,
  add column if not exists appointment_lat double precision,
  add column if not exists appointment_lng double precision,
  add column if not exists appointment_reference text;
