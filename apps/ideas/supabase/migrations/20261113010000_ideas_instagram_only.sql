-- Activity Ideas: mark reels that only play on Instagram itself.
--
-- Some reels show "Watch on Instagram" in the embed and open Instagram when
-- tapped instead of playing in place. Instagram does not report which ones,
-- so the owner ticks a box; the feed shows those reels last.
--
-- Run once in the Supabase SQL editor, after 20261113000000_ideas.sql. Safe to rerun.

alter table public.ideas_reels
  add column if not exists instagram_only boolean not null default false;
