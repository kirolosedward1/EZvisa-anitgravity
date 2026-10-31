-- Staff notification state (admin console, Notifications board). NOT applied by the app: review, then run once in
-- the SQL editor. Additive only: two nullable columns on staff_users (migration 005).
--
-- notifications_read_at   "Mark all read": items before this time show as read.
-- notification_prefs      per person: { events: { <event>: { in_app, email, push } }, quiet: { on, from, to }, digest }
--                         Saved now; email and push delivery are not connected yet, so only in-app notifications show.

alter table public.staff_users add column if not exists notifications_read_at timestamptz;
alter table public.staff_users add column if not exists notification_prefs jsonb;
alter table public.staff_users drop constraint if exists staff_users_prefs_size;
alter table public.staff_users add constraint staff_users_prefs_size check (notification_prefs is null or pg_column_size(notification_prefs) <= 8192);
