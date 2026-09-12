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
