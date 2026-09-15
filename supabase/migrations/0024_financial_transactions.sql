-- Financeiro Básico: a simple income/expense ledger for a church, not a real
-- accounting system — no receipts, no bank integration, no reconciliation.
-- Category is free text with UI-suggested options rather than a separate
-- categories table, matching the brief's "categorias simples configuráveis".
create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  category text not null,
  description text,
  occurred_on date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index financial_transactions_team_id_idx
  on public.financial_transactions(team_id, occurred_on desc);

alter table public.financial_transactions enable row level security;

-- Same team-read / owner-write shape as church_contacts/church_events
-- (0023_church_admin.sql) — transparency for the whole team, but only the
-- owner (treasurer) can record or remove transactions.
create policy "financial_transactions_select_team" on public.financial_transactions
  for select using (team_id = public.current_team_id());

create policy "financial_transactions_insert_owner" on public.financial_transactions
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = financial_transactions.team_id and team_role = 'owner'
    )
  );

create policy "financial_transactions_delete_owner" on public.financial_transactions
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = financial_transactions.team_id and team_role = 'owner'
    )
  );
