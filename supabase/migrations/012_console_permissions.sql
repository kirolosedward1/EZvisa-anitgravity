-- Permission matrix edited on the Team board (admin console). Additive: allows the 'permissions' key in
-- console_settings (migration 011). Admin always has every permission and Team and Settings stay admin only; the
-- server validates the stored value (lib/staff/roles.ts cleanMatrix) and falls back to the default if it is invalid.

alter table public.console_settings drop constraint if exists console_settings_key_check;
alter table public.console_settings add constraint console_settings_key_check
  check (key in ('templates', 'sla', 'auto_assign', 'centres', 'permissions'));
