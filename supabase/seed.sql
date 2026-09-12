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
