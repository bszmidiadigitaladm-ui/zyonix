-- Fixed-window rate limiter, same shape as the credit RPCs (row-locked via
-- `for update` so concurrent requests for the same key serialize instead of
-- racing). Serverless functions can't share in-memory state across
-- invocations, so this lives in Postgres rather than app memory.
create table public.rate_limits (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies: default-deny for anon/authenticated, same as crisis_flags.
-- Only reachable through check_rate_limit below, which is service_role only.

create or replace function public.check_rate_limit(
  p_key text,
  p_max_requests int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limits%rowtype;
begin
  select * into v_row from public.rate_limits where key = p_key for update;

  if not found then
    insert into public.rate_limits (key, count, window_start) values (p_key, 1, now());
    return true;
  end if;

  if now() - v_row.window_start > (p_window_seconds || ' seconds')::interval then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    return true;
  end if;

  if v_row.count >= p_max_requests then
    return false;
  end if;

  update public.rate_limits set count = count + 1 where key = p_key;
  return true;
end;
$$;

-- Learned the hard way in 0031-0034: Supabase grants EXECUTE to anon,
-- authenticated, AND service_role separately at creation time — there is no
-- single PUBLIC grant to revoke. Lock this down explicitly and immediately,
-- in the same migration that creates it, rather than as a follow-up.
revoke execute on function public.check_rate_limit(text, int, int) from anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
