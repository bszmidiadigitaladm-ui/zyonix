-- Idempotency ledger for the Hotmart webhook. Hotmart retries deliveries and
-- fires both PURCHASE_APPROVED and PURCHASE_COMPLETE for the same purchase, so
-- without this a single payment could send the "create your account" email
-- twice or reset credits twice. The webhook inserts a row keyed by
-- "<transaction>:<activation|cancellation>" before doing any work; a unique
-- violation means the event was already handled.
create table public.hotmart_events (
  dedupe_key text primary key,
  event text not null,
  created_at timestamptz not null default now()
);

-- Service-role only: RLS on with no policies = default deny for every client role.
alter table public.hotmart_events enable row level security;

-- Account deletion fix. These columns reference auth.users with the default
-- NO ACTION, so deleting a team owner failed with "Database error deleting
-- user": the row's team is cascade-deleted along with the user, but Postgres
-- runs the NO ACTION check before that nested cascade has removed the rows.
-- These records belong to the team's lifecycle, so they cascade with the user;
-- a reviewer's deletion just clears the reviewer on the safety flag.
-- Constraint names are looked up rather than assumed.
do $$
declare
  spec record;
  cname text;
begin
  for spec in
    select * from (values
      ('communications',         'sent_by',     'cascade'),
      ('financial_transactions', 'created_by',  'cascade'),
      ('team_invites',           'invited_by',  'cascade'),
      ('crisis_flags',           'reviewed_by', 'set null')
    ) as t(tbl, col, action)
  loop
    select c.conname into cname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.conrelid = ('public.' || spec.tbl)::regclass
      and c.confrelid = 'auth.users'::regclass
      and a.attname = spec.col;

    if cname is not null then
      execute format('alter table public.%I drop constraint %I', spec.tbl, cname);
    end if;

    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references auth.users(id) on delete %s',
      spec.tbl, spec.tbl || '_' || spec.col || '_fkey', spec.col, spec.action
    );
  end loop;
end $$;
