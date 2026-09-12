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
