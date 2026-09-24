-- A social post can now use one of the person's own Bible art images as its
-- background, with a short text drawn on the image (separate from the caption).
alter table public.social_post_generations
  add column art_generation_id uuid
    references public.bible_art_generations(id) on delete set null,
  add column overlay_text text;
