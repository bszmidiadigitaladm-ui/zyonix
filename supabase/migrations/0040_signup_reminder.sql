-- One-time reminder for people who created an account but never picked a plan
-- (src/app/api/cron/signup-reminder). Three columns on profiles:
--   marketing_opt_out        set when the person uses the unsubscribe link; no
--                            marketing email is sent to them again.
--   signup_reminder_sent_at  makes the reminder strictly once per account, and is
--                            claimed BEFORE sending so overlapping runs can't double-send.
--   unsubscribe_token        unguessable per-account token used in the unsubscribe link
--                            (no login needed to opt out). gen_random_uuid() is volatile,
--                            so every existing row gets its own value.
-- profiles already has RLS (own row only), and these columns carry nothing sensitive:
-- a person can already read their own row, and opting out for themselves is harmless.

alter table public.profiles
  add column if not exists marketing_opt_out boolean not null default false,
  add column if not exists signup_reminder_sent_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_key
  on public.profiles (unsubscribe_token);
