-- Security fix: profiles_update_own (0015_rls_policies.sql) only checks
-- `id = auth.uid()`, with no restriction on *which* columns change. Since
-- team_id/team_role/stripe_customer_id are plain columns on that row, any
-- authenticated user could PATCH their own profile via Supabase's REST API
-- directly (their own JWT + the public anon key — no app code involved) and
-- set team_role='owner' on any team_id they can learn, or set
-- stripe_customer_id to someone else's real Stripe customer ID. The former
-- grants access to that team's contacts/events/communications/finances (every
-- "team_role = 'owner'" RLS check trusts this row); the latter opens that
-- victim's real Stripe billing portal.
--
-- Every legitimate writer of these three columns already uses the
-- service-role client (Hotmart/Stripe webhooks, team/accept, dev
-- fake-subscription) except stripe/checkout's first-customer-creation path,
-- fixed alongside this migration to also use the service-role client. This
-- trigger is defense in depth: it makes the database itself refuse the
-- change for any writer that isn't service_role, regardless of what the app
-- layer does or doesn't do.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.team_id := old.team_id;
    new.team_role := old.team_role;
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();
