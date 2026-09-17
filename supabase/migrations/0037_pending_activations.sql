-- Holds a purchase whose buyer email doesn't match any existing profile yet
-- (checkout is open to anyone, no signup required first — see README). The
-- Hotmart webhook writes here instead of silently dropping the activation;
-- /onboarding/plan checks this table for the signed-in user's email and
-- applies it the moment they finish signing up, regardless of how long that
-- takes. No RLS policies: default-deny for anon/authenticated, same as
-- crisis_flags — only ever read/written via the service-role admin client.
create table public.pending_activations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan_code text not null,
  is_annual boolean not null default false,
  transaction_code text,
  subscriber_code text,
  created_at timestamptz not null default now()
);

create index pending_activations_email_idx on public.pending_activations(email);

alter table public.pending_activations enable row level security;
