-- Activity Ideas: the reel list.
--
-- One row per Instagram reel or post, known by Instagram's short code. The
-- video, its thumbnail and its caption are never stored: the page shows
-- Instagram's own embed. Visitors read published rows and may add a
-- suggestion, which lands as "pending" and is shown to nobody until an owner
-- publishes it. Owners (rows in ideas_admins) may do everything.
--
-- Run once in the Supabase SQL editor (apps/ideas/README.md). Safe to rerun.

create table if not exists public.ideas_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.ideas_admins enable row level security;
alter table public.ideas_admins force row level security;
revoke all on table public.ideas_admins from public, anon, authenticated;

-- Is the caller an owner? Runs with the definer's rights so it can read
-- ideas_admins, which nobody else can.
create or replace function public.ideas_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ideas_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.ideas_is_admin() from public;
grant execute on function public.ideas_is_admin() to anon, authenticated;

create table if not exists public.ideas_reels (
  code           text        primary key check (code ~ '^[A-Za-z0-9_-]{5,20}$'),
  kind           text        not null default 'reel' check (kind in ('reel', 'p')),
  title          text        not null default '' check (length(title) <= 80),
  how_to         text        not null default '' check (length(how_to) <= 600),
  creator_handle text        not null default '' check (creator_handle ~ '^[A-Za-z0-9._]{0,30}$'),
  skill_areas    text[]      not null default '{}' check (cardinality(skill_areas) <= 8),
  grade_bands    text[]      not null default '{}' check (cardinality(grade_bands) <= 4),
  status         text        not null default 'pending' check (status in ('pending', 'published', 'rejected', 'unpublished')),
  source         text        not null default 'submission' check (source in ('owner', 'submission')),
  submitter_name text        not null default '' check (length(submitter_name) <= 60),
  submitter_note text        not null default '' check (length(submitter_note) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.ideas_reels is 'Activity Ideas reel list: Instagram short codes and tags. Never video, captions or student data.';

alter table public.ideas_reels enable row level security;
alter table public.ideas_reels force row level security;

revoke all on table public.ideas_reels from public, anon, authenticated;
grant select, insert on table public.ideas_reels to anon, authenticated;
grant update, delete on table public.ideas_reels to authenticated;

drop policy if exists "ideas: read published" on public.ideas_reels;
create policy "ideas: read published" on public.ideas_reels
  for select to anon, authenticated
  using (status = 'published' or (select public.ideas_is_admin()));

-- A visitor's suggestion: pending, marked as a submission, and with none of
-- the fields the owner writes.
drop policy if exists "ideas: suggest" on public.ideas_reels;
create policy "ideas: suggest" on public.ideas_reels
  for insert to anon, authenticated
  with check (
    (select public.ideas_is_admin())
    or (status = 'pending' and source = 'submission' and title = '' and how_to = '' and creator_handle = '' and cardinality(grade_bands) = 0 and cardinality(skill_areas) <= 1)
  );

drop policy if exists "ideas: owner update" on public.ideas_reels;
create policy "ideas: owner update" on public.ideas_reels
  for update to authenticated
  using ((select public.ideas_is_admin()))
  with check ((select public.ideas_is_admin()));

drop policy if exists "ideas: owner delete" on public.ideas_reels;
create policy "ideas: owner delete" on public.ideas_reels
  for delete to authenticated
  using ((select public.ideas_is_admin()));

-- The database sets the dates, and caps the waiting list so a flood of
-- suggestions cannot fill the table: past 200 pending rows, new suggestions
-- are refused until the owner clears some.
create or replace function public.ideas_reels_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
    if not public.ideas_is_admin() and (select count(*) from public.ideas_reels where status = 'pending') >= 200 then
      raise exception 'The suggestion list is full for now.';
    end if;
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists ideas_reels_guard on public.ideas_reels;
create trigger ideas_reels_guard
  before insert or update on public.ideas_reels
  for each row execute function public.ideas_reels_guard();

-- Then make yourself the owner, once, by running this with your own sign-in
-- email in place of the placeholder (do not save your email in this file):
--
--   insert into public.ideas_admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
