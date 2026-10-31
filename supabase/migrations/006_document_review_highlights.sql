-- Document review highlights (admin console, Document viewer board). NOT applied by the app: review, then run once in
-- the SQL editor. Additive only: two nullable columns on document_reviews (supabase/migrations/003).
--
-- highlights   areas a specialist marked on the file when sending it back: [{ "n": 1, "label": "bank stamp",
--              "page": 1, "x": 0.12, "y": 0.40, "w": 0.30, "h": 0.10 }] with x/y/w/h as fractions of the page.
--              The same areas are written into the note the customer reads, so the dashboard needs no change.
-- reviewer_id  the staff_users row of the reviewer (reviewed_by keeps the readable name).
--
-- Until this is applied, decisions still save; the highlights then live only in the note text.

alter table public.document_reviews add column if not exists highlights jsonb;
alter table public.document_reviews add column if not exists reviewer_id uuid references public.staff_users (id) on delete set null;

alter table public.document_reviews drop constraint if exists document_reviews_highlights_size;
alter table public.document_reviews add constraint document_reviews_highlights_size check (highlights is null or pg_column_size(highlights) <= 8192);
