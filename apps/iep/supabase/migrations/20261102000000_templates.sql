-- IEP Writer accounts: one table, one kind of row.
--
-- A signed-in writer keeps their report template here so it follows them to
-- another browser. One row per writer, discipline and template kind
-- ("overrides" lays edits over the built-in OT template; "pack" is a
-- discipline's own template). The report being written, filled blanks,
-- ratings, recipes and the sentence library are never sent here
-- (apps/iep/src/account/sync.ts reads only the template stores).
--
-- Run once in the Supabase SQL editor (docs/ACCOUNTS.md). Safe to rerun.

create table if not exists public.templates (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  discipline text        not null check (length(discipline) between 1 and 32),
  kind       text        not null check (kind in ('overrides', 'pack')),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, discipline, kind),
  -- A template is a few hundred kilobytes at most; refuse anything that is not one.
  constraint templates_data_size check (pg_column_size(data) <= 2 * 1024 * 1024)
);

comment on table public.templates is 'IEP Writer report templates, one per writer, discipline and kind. Never student data.';

-- Row Level Security: a writer reads and writes only their own rows. The
-- publishable key in the page can do nothing the policies below do not allow.
alter table public.templates enable row level security;
alter table public.templates force row level security;

revoke all on table public.templates from public, anon;
grant select, insert, update, delete on table public.templates to authenticated;

drop policy if exists "templates: own rows (select)" on public.templates;
create policy "templates: own rows (select)" on public.templates
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "templates: own rows (insert)" on public.templates;
create policy "templates: own rows (insert)" on public.templates
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "templates: own rows (update)" on public.templates;
create policy "templates: own rows (update)" on public.templates
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "templates: own rows (delete)" on public.templates;
create policy "templates: own rows (delete)" on public.templates
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- updated_at is set by the database, never trusted from the client.
create or replace function public.templates_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists templates_touch on public.templates;
create trigger templates_touch
  before insert or update on public.templates
  for each row execute function public.templates_touch();
