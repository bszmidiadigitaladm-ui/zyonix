-- Admin panel foundations.
--
-- * admin_users: who may open /admin. No client policy exists, so only the
--   service role can read or write it — there is no way to become an admin
--   through the app, only by inserting a row here from the SQL editor.
-- * admin_audit_log: append-only record of every administrative access or
--   action (LGPD art. 6 X / art. 37 accountability). No FK to auth.users on
--   purpose: the record must survive the deletion of the person it concerns.
-- * subscriptions.source: tells apart plans paid through Hotmart from ones an
--   admin granted (complimentary), so revenue numbers stay honest.

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  admin_email text not null,
  action text not null,
  target_user_id uuid,
  target_email text,
  reason text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log(target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Append-only, even for the service role: an audit trail that can be edited
-- is not an audit trail.
create or replace function public.admin_audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

create trigger admin_audit_log_no_update
  before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_immutable();

alter table public.subscriptions
  add column source text not null default 'hotmart' check (source in ('hotmart', 'admin_grant'));

-- First administrator. Runs against the account that already exists for this
-- email; if it doesn't exist yet, sign up once and re-run just this INSERT.
insert into public.admin_users (user_id, note)
select id, 'founder'
from auth.users
where email = 'feliperomaldoschmidt@gmail.com'
on conflict (user_id) do nothing;
