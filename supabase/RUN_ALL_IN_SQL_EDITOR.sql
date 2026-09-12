-- ============================================================
-- FILE: supabase/migrations/0001_extensions.sql
-- ============================================================
-- gen_random_uuid() and related crypto helpers used throughout the schema.
create extension if not exists "pgcrypto";


-- ============================================================
-- FILE: supabase/migrations/0002_teams.sql
-- ============================================================
-- teams has no FK to subscriptions yet (subscriptions doesn't exist until 0005) —
-- the constraint is added at the end of 0005_subscriptions.sql to avoid a circular
-- forward reference between the two tables.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid,
  created_at timestamptz not null default now()
);

create index teams_owner_id_idx on public.teams(owner_id);


-- ============================================================
-- FILE: supabase/migrations/0003_profiles.sql
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  team_id uuid references public.teams(id) on delete set null,
  team_role text check (team_role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_team_id_idx on public.profiles(team_id);


-- ============================================================
-- FILE: supabase/migrations/0004_plans_and_limits.sql
-- ============================================================
create table public.plans (
  code text primary key,
  display_name text not null,
  stripe_price_id text not null unique,
  monthly_price_usd numeric(6, 2) not null,
  is_team_plan boolean not null default false,
  sort_order int not null
);

-- The single tunable source for credit quantities / caps per plan. The client's
-- brief is explicit that exact numbers are TBD pending real OpenAI cost data —
-- change values here (supabase/seed.sql or a dashboard SQL editor UPDATE), never
-- hardcode limits elsewhere in the app.
create table public.plan_limits (
  plan_code text primary key references public.plans(code) on delete cascade,
  image_credits_per_cycle int not null,
  text_credits_per_cycle int not null,
  spiritual_chat_daily_cap int, -- null = unlimited
  max_output_resolution text not null,
  watermark boolean not null default true,
  allow_carousel_export boolean not null default false,
  allow_seasonal_templates boolean not null default false,
  max_team_seats int, -- null for non-team plans
  updated_at timestamptz not null default now()
);


-- ============================================================
-- FILE: supabase/migrations/0005_subscriptions.sql
-- ============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  plan_code text not null references public.plans(code),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_end timestamptz,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_owner_id_idx on public.subscriptions(owner_id);
create index subscriptions_team_id_idx on public.subscriptions(team_id);

-- One subscription per solo user, one per team — enforced at the DB level.
create unique index subscriptions_owner_solo_unique on public.subscriptions(owner_id) where team_id is null;
create unique index subscriptions_team_unique on public.subscriptions(team_id) where team_id is not null;

alter table public.teams
  add constraint teams_subscription_id_fkey
  foreign key (subscription_id) references public.subscriptions(id) on delete set null;


-- ============================================================
-- FILE: supabase/migrations/0006_credits_balance.sql
-- ============================================================
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


-- ============================================================
-- FILE: supabase/migrations/0007_ai_usage_log.sql
-- ============================================================
-- Per-user AI cost audit trail. Inserted only by server routes using the
-- service-role/admin client — never trust client-supplied cost figures.
create table public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  plan_code text not null references public.plans(code),
  feature text not null check (feature in ('bible_art', 'post_caption', 'devotional', 'spiritual_chat')),
  provider text not null default 'openai',
  model text not null,
  input_tokens int,
  output_tokens int,
  image_count int,
  estimated_cost_usd numeric(10, 4),
  request_id text,
  created_at timestamptz not null default now()
);

create index ai_usage_log_user_id_idx on public.ai_usage_log(user_id, created_at desc);
create index ai_usage_log_plan_code_idx on public.ai_usage_log(plan_code, created_at desc);


-- ============================================================
-- FILE: supabase/migrations/0008_seasonal_templates.sql
-- ============================================================
create table public.seasonal_templates (
  id uuid primary key default gen_random_uuid(),
  occasion text not null, -- 'easter' | 'christmas' | 'mothers_day' | 'verse_of_the_day' | ...
  name text not null,
  preview_url text not null,
  asset_url text not null,
  is_exclusive boolean not null default true, -- true => gated to Creator+ in the API/UI layer
  created_at timestamptz not null default now()
);

create index seasonal_templates_occasion_idx on public.seasonal_templates(occasion);


-- ============================================================
-- FILE: supabase/migrations/0009_generations.sql
-- ============================================================
create table public.bible_art_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null, -- populated when the creator is on a team plan, for the shared library
  verse_reference text,
  theme text,
  style text not null,
  output_format text not null check (output_format in ('square', 'story')),
  prompt_used text not null,
  image_url text not null,
  thumbnail_url text,
  resolution text not null,
  watermarked boolean not null default true,
  created_at timestamptz not null default now()
);

create index bible_art_generations_user_id_idx on public.bible_art_generations(user_id, created_at desc);
create index bible_art_generations_team_id_idx on public.bible_art_generations(team_id, created_at desc);

create table public.social_post_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  template_id uuid references public.seasonal_templates(id) on delete set null,
  format text not null check (format in ('feed', 'story', 'carousel')),
  caption_text text,
  verse_reference text,
  export_url text,
  created_at timestamptz not null default now()
);

create index social_post_generations_user_id_idx on public.social_post_generations(user_id, created_at desc);
create index social_post_generations_team_id_idx on public.social_post_generations(team_id, created_at desc);


-- ============================================================
-- FILE: supabase/migrations/0010_devotionals.sql
-- ============================================================
-- Global content, one row per calendar day — shared across all users, not per-user.
create table public.devotionals (
  id uuid primary key default gen_random_uuid(),
  publish_date date not null unique,
  title text not null,
  body text not null,
  scripture_reference text,
  audio_url text, -- reserved for a future TTS enhancement; MVP ships text-only
  created_at timestamptz not null default now()
);

-- Private per-user notes on a devotional.
create table public.devotional_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  devotional_id uuid not null references public.devotionals(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, devotional_id)
);

create index devotional_notes_user_id_idx on public.devotional_notes(user_id);


-- ============================================================
-- FILE: supabase/migrations/0011_spiritual_chat.sql
-- ============================================================
-- Spiritual chat is always private to the individual user, even on a Church Pro
-- team plan — no team_id column here by design. Pastoral/personal disclosures
-- must never become visible to a "team admin".
create table public.spiritual_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'crisis_flagged', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spiritual_chat_conversations_user_id_idx on public.spiritual_chat_conversations(user_id, created_at desc);

-- Immutable audit trail: no update/delete RLS policy is ever granted on this table
-- (see 0015_rls_policies.sql) so history can't be altered after the fact.
create table public.spiritual_chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.spiritual_chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, -- denormalized for simple RLS
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  is_crisis_flagged boolean not null default false,
  moderation_categories jsonb,
  created_at timestamptz not null default now()
);

create index spiritual_chat_messages_conversation_id_idx on public.spiritual_chat_messages(conversation_id, created_at);


-- ============================================================
-- FILE: supabase/migrations/0012_crisis_flags.sql
-- ============================================================
-- Human-reviewable safety log. This table is intentionally invisible to every
-- client role (see 0015_rls_policies.sql, which grants it zero policies) —
-- only a service-role key (webhook/API server code, or an internal admin tool)
-- can read or write it. Never exposed to or used punitively against the user.
create table public.crisis_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.spiritual_chat_conversations(id) on delete cascade,
  message_id bigint not null references public.spiritual_chat_messages(id) on delete cascade,
  detection_source text not null check (detection_source in ('openai_moderation', 'keyword_fallback', 'both')),
  severity text not null check (severity in ('high', 'medium')),
  reviewed boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index crisis_flags_user_id_idx on public.crisis_flags(user_id);
create index crisis_flags_reviewed_idx on public.crisis_flags(reviewed);


-- ============================================================
-- FILE: supabase/migrations/0013_team_invites.sql
-- ============================================================
create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index team_invites_team_id_idx on public.team_invites(team_id);
create index team_invites_email_idx on public.team_invites(email);


-- ============================================================
-- FILE: supabase/migrations/0014_helper_functions.sql
-- ============================================================
-- Returns the calling user's own team_id (or null). Used inside RLS policies on
-- team-shared tables to check "does this row's team_id match mine?" without ever
-- querying other users' rows — avoids the recursive-RLS trap of policies that
-- query the same or another RLS-protected table for membership checks.
create or replace function public.current_team_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_plan_limits_updated_at before update on public.plan_limits
  for each row execute function public.set_updated_at();

create trigger set_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger set_credits_balance_updated_at before update on public.credits_balance
  for each row execute function public.set_updated_at();

create trigger set_devotional_notes_updated_at before update on public.devotional_notes
  for each row execute function public.set_updated_at();

create trigger set_spiritual_chat_conversations_updated_at before update on public.spiritual_chat_conversations
  for each row execute function public.set_updated_at();


-- ============================================================
-- FILE: supabase/migrations/0015_rls_policies.sql
-- ============================================================
-- Every table gets RLS enabled and default-deny: only the policies below grant
-- access. Anything not explicitly granted (e.g. no insert/update policy) stays
-- denied for `anon`/`authenticated`. The service-role key bypasses RLS entirely
-- and is used for webhook/cron/admin writes throughout this app.

-- ── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
-- No insert/delete policy: rows are created by the handle_new_user() trigger
-- (0017_auth_trigger.sql), which runs security definer and bypasses RLS.

-- ── teams ───────────────────────────────────────────────────────────────────
alter table public.teams enable row level security;

create policy "teams_select_member_or_owner" on public.teams
  for select using (owner_id = auth.uid() or id = public.current_team_id());

create policy "teams_update_owner" on public.teams
  for update using (owner_id = auth.uid());
-- No insert/delete policy: teams are created by the Stripe webhook handler
-- (service-role client) when a church_pro checkout completes.

-- ── plans / plan_limits ─────────────────────────────────────────────────────
alter table public.plans enable row level security;

create policy "plans_select_all" on public.plans
  for select using (true);
-- No write policy: seeded/updated via migrations or the Supabase SQL editor only.

alter table public.plan_limits enable row level security;

create policy "plan_limits_select_all" on public.plan_limits
  for select using (true);
-- No write policy — this is the one tunable config table; edit via SQL editor/seed.

-- ── subscriptions ───────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own_or_team" on public.subscriptions
  for select using (owner_id = auth.uid() or team_id = public.current_team_id());
-- No write policy: only the Stripe webhook handler (service-role) writes here.

-- ── credits_balance ─────────────────────────────────────────────────────────
alter table public.credits_balance enable row level security;

create policy "credits_balance_select_own_or_team" on public.credits_balance
  for select using (
    (is_team = false and owner_id = auth.uid())
    or (is_team = true and owner_id = public.current_team_id())
  );
-- No write policy: mutated only via the consume_credit/refund_credit/reset_credits
-- RPCs (0016_credit_rpc_functions.sql), which are security definer.

-- ── ai_usage_log ────────────────────────────────────────────────────────────
alter table public.ai_usage_log enable row level security;

create policy "ai_usage_log_select_own" on public.ai_usage_log
  for select using (user_id = auth.uid());
-- No insert policy: written only by server routes via the admin client, so cost
-- figures are always server-computed and never client-supplied.

-- ── bible_art_generations ───────────────────────────────────────────────────
alter table public.bible_art_generations enable row level security;

create policy "bible_art_select_own_or_team" on public.bible_art_generations
  for select using (
    user_id = auth.uid() or (team_id is not null and team_id = public.current_team_id())
  );

create policy "bible_art_insert_own" on public.bible_art_generations
  for insert with check (user_id = auth.uid());

create policy "bible_art_delete_own" on public.bible_art_generations
  for delete using (user_id = auth.uid());

-- ── social_post_generations ─────────────────────────────────────────────────
alter table public.social_post_generations enable row level security;

create policy "social_post_select_own_or_team" on public.social_post_generations
  for select using (
    user_id = auth.uid() or (team_id is not null and team_id = public.current_team_id())
  );

create policy "social_post_insert_own" on public.social_post_generations
  for insert with check (user_id = auth.uid());

create policy "social_post_delete_own" on public.social_post_generations
  for delete using (user_id = auth.uid());

-- ── seasonal_templates ──────────────────────────────────────────────────────
alter table public.seasonal_templates enable row level security;

create policy "seasonal_templates_select_authenticated" on public.seasonal_templates
  for select using (auth.role() = 'authenticated');
-- "is_exclusive" plan-gating (Creator+/Church Pro only) is enforced in the API
-- layer by joining plan_limits.allow_seasonal_templates, not in RLS — this table
-- has no per-tenant data to leak, so a simple authenticated-read policy is enough.

-- ── devotionals / devotional_notes ──────────────────────────────────────────
alter table public.devotionals enable row level security;

create policy "devotionals_select_authenticated" on public.devotionals
  for select using (auth.role() = 'authenticated');
-- No write policy: populated by the daily cron job via the admin client.

alter table public.devotional_notes enable row level security;

create policy "devotional_notes_all_own" on public.devotional_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── spiritual_chat_conversations / messages ─────────────────────────────────
alter table public.spiritual_chat_conversations enable row level security;

create policy "chat_conversations_all_own" on public.spiritual_chat_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.spiritual_chat_messages enable row level security;

create policy "chat_messages_select_own" on public.spiritual_chat_messages
  for select using (user_id = auth.uid());

create policy "chat_messages_insert_own" on public.spiritual_chat_messages
  for insert with check (user_id = auth.uid());
-- Deliberately no update/delete policy — chat history is immutable once written,
-- which matters for crisis-review audit integrity.

-- ── crisis_flags ─────────────────────────────────────────────────────────────
alter table public.crisis_flags enable row level security;
-- Deliberately zero policies granted to `authenticated`/`anon`. This table is
-- invisible to every client role; only the service-role key (used by the chat
-- API route and any future internal admin/review tooling) can read or write it.

-- ── team_invites ─────────────────────────────────────────────────────────────
alter table public.team_invites enable row level security;

create policy "team_invites_select_owner_or_member" on public.team_invites
  for select using (invited_by = auth.uid() or team_id = public.current_team_id());

create policy "team_invites_insert_owner" on public.team_invites
  for insert with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = team_invites.team_id and team_role = 'owner'
    )
  );
-- Accepting an invite is handled by a server route with the service-role client
-- (validates the token, then updates profiles) — no client update policy needed.


-- ============================================================
-- FILE: supabase/migrations/0016_credit_rpc_functions.sql
-- ============================================================
-- Atomic check-and-decrement. `for update` row-locks the wallet row, so
-- concurrent calls for the same owner_id (notably a shared Church Pro team
-- wallet, where multiple members can generate simultaneously) serialize at the
-- database level instead of racing on a read-then-write in application code.
create or replace function public.consume_credit(
  p_owner_id uuid,
  p_credit_type text,
  p_amount int default 1
) returns table (success boolean, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credits_balance%rowtype;
begin
  if p_credit_type not in ('image', 'text') then
    raise exception 'invalid credit type: %', p_credit_type;
  end if;

  select * into v_row
  from public.credits_balance
  where owner_id = p_owner_id
  for update;

  if not found then
    return query select false, 0;
    return;
  end if;

  if p_credit_type = 'image' then
    if v_row.image_credits_remaining < p_amount then
      return query select false, v_row.image_credits_remaining;
      return;
    end if;

    update public.credits_balance
      set image_credits_remaining = image_credits_remaining - p_amount,
          updated_at = now()
      where id = v_row.id;

    return query select true, v_row.image_credits_remaining - p_amount;
  else
    if v_row.text_credits_remaining < p_amount then
      return query select false, v_row.text_credits_remaining;
      return;
    end if;

    update public.credits_balance
      set text_credits_remaining = text_credits_remaining - p_amount,
          updated_at = now()
      where id = v_row.id;

    return query select true, v_row.text_credits_remaining - p_amount;
  end if;
end;
$$;

grant execute on function public.consume_credit(uuid, text, int) to authenticated, service_role;

-- Additive counterpart, called when a generation fails *after* a credit was
-- already consumed, so users aren't charged credits for failed AI calls.
create or replace function public.refund_credit(
  p_owner_id uuid,
  p_credit_type text,
  p_amount int default 1
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credit_type not in ('image', 'text') then
    raise exception 'invalid credit type: %', p_credit_type;
  end if;

  if p_credit_type = 'image' then
    update public.credits_balance
      set image_credits_remaining = image_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  else
    update public.credits_balance
      set text_credits_remaining = text_credits_remaining + p_amount,
          updated_at = now()
      where owner_id = p_owner_id;
  end if;
end;
$$;

grant execute on function public.refund_credit(uuid, text, int) to authenticated, service_role;

-- Seeds/resets a subscription's credit wallet from plan_limits for a new cycle.
-- Called by the Stripe webhook handler (service-role only — never exposed to
-- `authenticated`) on checkout.session.completed and on every invoice.payment_succeeded
-- renewal, which is the single place recurring credit resets happen.
create or replace function public.reset_credits(
  p_subscription_id uuid,
  p_cycle_start timestamptz,
  p_cycle_end timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_limits public.plan_limits%rowtype;
  v_owner uuid;
  v_is_team boolean;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if not found then
    raise exception 'subscription % not found', p_subscription_id;
  end if;

  select * into v_limits from public.plan_limits where plan_code = v_sub.plan_code;
  if not found then
    raise exception 'plan_limits for % not found', v_sub.plan_code;
  end if;

  v_owner := coalesce(v_sub.team_id, v_sub.owner_id);
  v_is_team := v_sub.team_id is not null;

  insert into public.credits_balance (
    owner_id, is_team, subscription_id,
    image_credits_remaining, text_credits_remaining,
    cycle_start, cycle_end
  ) values (
    v_owner, v_is_team, p_subscription_id,
    v_limits.image_credits_per_cycle, v_limits.text_credits_per_cycle,
    p_cycle_start, p_cycle_end
  )
  on conflict (subscription_id) do update set
    owner_id = excluded.owner_id,
    is_team = excluded.is_team,
    image_credits_remaining = excluded.image_credits_remaining,
    text_credits_remaining = excluded.text_credits_remaining,
    cycle_start = excluded.cycle_start,
    cycle_end = excluded.cycle_end,
    updated_at = now();
end;
$$;

-- Deliberately service_role only — this resets a wallet to full and must never
-- be callable directly by a signed-in user.
grant execute on function public.reset_credits(uuid, timestamptz, timestamptz) to service_role;


-- ============================================================
-- FILE: supabase/migrations/0017_auth_trigger.sql
-- ============================================================
-- Creates a profiles row automatically whenever Supabase Auth creates a user
-- (email/password signup, Google OAuth, etc). security definer + owned by the
-- migration role lets this insert bypass profiles' RLS (which otherwise has no
-- insert policy for authenticated/anon).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- FILE: supabase/seed.sql
-- ============================================================
-- Seed data for local dev / initial deploy. Re-run safe (upserts on conflict).
--
-- IMPORTANT: replace the stripe_price_id placeholders below with the real
-- Price IDs from your Stripe Dashboard (Products) before going live — see
-- docs/ENV_VARS.md. The credit quantities in plan_limits are explicit
-- placeholders per the brief ("definir número após medir custo real de API");
-- tune them after measuring actual OpenAI cost per generation.

insert into public.plans (code, display_name, stripe_price_id, monthly_price_usd, is_team_plan, sort_order)
values
  ('starter', 'Starter', 'price_starter_REPLACE_ME', 9.90, false, 1),
  ('creator', 'Creator', 'price_creator_REPLACE_ME', 19.90, false, 2),
  ('church_pro', 'Church Pro', 'price_church_pro_REPLACE_ME', 29.90, true, 3)
on conflict (code) do update set
  display_name = excluded.display_name,
  stripe_price_id = excluded.stripe_price_id,
  monthly_price_usd = excluded.monthly_price_usd,
  is_team_plan = excluded.is_team_plan,
  sort_order = excluded.sort_order;

insert into public.plan_limits (
  plan_code, image_credits_per_cycle, text_credits_per_cycle, spiritual_chat_daily_cap,
  max_output_resolution, watermark, allow_carousel_export, allow_seasonal_templates, max_team_seats
)
values
  ('starter', 15, 30, 10, 'standard', true, false, false, null),
  ('creator', 60, 120, null, 'high', false, true, true, null),
  ('church_pro', 150, 300, null, 'high', false, true, true, 10)
on conflict (plan_code) do update set
  image_credits_per_cycle = excluded.image_credits_per_cycle,
  text_credits_per_cycle = excluded.text_credits_per_cycle,
  spiritual_chat_daily_cap = excluded.spiritual_chat_daily_cap,
  max_output_resolution = excluded.max_output_resolution,
  watermark = excluded.watermark,
  allow_carousel_export = excluded.allow_carousel_export,
  allow_seasonal_templates = excluded.allow_seasonal_templates,
  max_team_seats = excluded.max_team_seats;

insert into public.seasonal_templates (occasion, name, preview_url, asset_url, is_exclusive)
values
  ('verse_of_the_day', 'Verse of the Day — Classic', 'https://placehold.co/600x600?text=Verse+of+the+Day', 'https://placehold.co/1080x1080?text=Verse+of+the+Day', false),
  ('easter', 'Easter — He Is Risen', 'https://placehold.co/600x600?text=Easter', 'https://placehold.co/1080x1080?text=Easter', true),
  ('christmas', 'Christmas — Emmanuel', 'https://placehold.co/600x600?text=Christmas', 'https://placehold.co/1080x1080?text=Christmas', true),
  ('mothers_day', 'Mother''s Day Blessing', 'https://placehold.co/600x600?text=Mothers+Day', 'https://placehold.co/1080x1080?text=Mothers+Day', true)
on conflict do nothing;

insert into public.devotionals (publish_date, title, body, scripture_reference)
values (
  current_date,
  'Walking in Faith Today',
  'Sample devotional body for local development — replace with real generated/curated content. '
  || 'Trust in the Lord with all your heart, and lean not on your own understanding.',
  'Proverbs 3:5'
)
on conflict (publish_date) do nothing;


