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
