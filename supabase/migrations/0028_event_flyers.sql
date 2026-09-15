-- Church Admin: AI-generated promotional flyer image for an event, via
-- Runway's gen4_image model (Models surface). Reuses the "image" credit
-- type already shared with the Bible Art generator — no new credit type
-- or plan_limits column needed.
alter table public.church_events add column flyer_image_url text;

-- ai_usage_log.feature is constrained by a check — widen it again (see
-- 0019_message_outlines.sql for the same pattern) to include this feature.
alter table public.ai_usage_log drop constraint ai_usage_log_feature_check;
alter table public.ai_usage_log add constraint ai_usage_log_feature_check
  check (feature in ('bible_art', 'post_caption', 'devotional', 'spiritual_chat', 'message_outline', 'video', 'event_flyer'));
