-- Church Admin: member contact list, a lightweight event calendar with
-- reminders, and an email-broadcast log — the "Comunicação" module from the
-- original brief. Church Pro only, gated the same way the rest of the team
-- workspace already is (a subscription's team_id is only ever set for
-- church_pro plans).
create table public.church_contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (team_id, email)
);

create index church_contacts_team_id_idx on public.church_contacts(team_id);

create table public.church_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  reminder_days_before int not null default 1,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index church_events_team_id_idx on public.church_events(team_id, event_date);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sent_by uuid not null references auth.users(id),
  subject text not null,
  body text not null,
  template_type text not null default 'custom'
    check (template_type in ('custom', 'sunday_bulletin', 'event_reminder')),
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);

create index communications_team_id_idx on public.communications(team_id, created_at desc);

alter table public.church_contacts enable row level security;
alter table public.church_events enable row level security;
alter table public.communications enable row level security;

-- Any team member can view (transparency); only the team owner can write —
-- same "team_role = 'owner'" exists-check the team_invites_insert_owner
-- policy (0015_rls_policies.sql) already uses.
create policy "church_contacts_select_team" on public.church_contacts
  for select using (team_id = public.current_team_id());

create policy "church_contacts_insert_owner" on public.church_contacts
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_contacts.team_id and team_role = 'owner'
    )
  );

create policy "church_contacts_delete_owner" on public.church_contacts
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_contacts.team_id and team_role = 'owner'
    )
  );

create policy "church_events_select_team" on public.church_events
  for select using (team_id = public.current_team_id());

create policy "church_events_insert_owner" on public.church_events
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_events.team_id and team_role = 'owner'
    )
  );

create policy "church_events_delete_owner" on public.church_events
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = church_events.team_id and team_role = 'owner'
    )
  );

create policy "communications_select_team" on public.communications
  for select using (team_id = public.current_team_id());

create policy "communications_insert_owner" on public.communications
  for insert with check (
    sent_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and team_id = communications.team_id and team_role = 'owner'
    )
  );
-- No update/delete policy: the send log is append-only.
