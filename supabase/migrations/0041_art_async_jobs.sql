-- Bible art is now generated in the background: the API inserts a `pending` row,
-- answers immediately, and finishes the row when the image is ready. That way a
-- slow (high quality) image no longer runs into the gateway's response timeout.
--
-- Existing rows are all finished images, so they default to 'completed'.
alter table public.bible_art_generations
  alter column image_url drop not null,
  add column status text not null default 'completed'
    check (status in ('pending', 'completed', 'failed')),
  add column quality text check (quality in ('low', 'medium', 'high')),
  add column source_generation_id uuid
    references public.bible_art_generations(id) on delete set null;

create index bible_art_generations_pending_idx
  on public.bible_art_generations(user_id, created_at)
  where status = 'pending';
