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
