-- Mutated only via the consume_credit / refund_credit / reset_credits RPCs
-- (0016_credit_rpc_functions.sql) — never written to directly by the client.
create table public.credits_balance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null, -- a user id (solo plan) or a team id (team plan) — the "wallet" key
  is_team boolean not null default false,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  image_credits_remaining int not null default 0,
  text_credits_remaining int not null default 0,
  cycle_start timestamptz not null,
  cycle_end timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (subscription_id)
);

create index credits_balance_owner_id_idx on public.credits_balance(owner_id);
