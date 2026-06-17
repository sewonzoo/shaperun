-- New columns
alter table public.courses
  add column if not exists creator_name    text,
  add column if not exists download_count  integer not null default 0,
  add column if not exists original_course_id uuid references public.courses(id) on delete set null,
  add column if not exists original_user_name text;

-- Indexes
create index if not exists courses_public_created_idx  on public.courses(is_public, created_at desc);
create index if not exists courses_public_download_idx on public.courses(is_public, download_count desc);

-- Allow public courses to be read by everyone (replace old "own read" policy)
drop policy if exists "own read" on public.courses;
create policy "own read" on public.courses for select
  using (is_public = true or auth.uid() = user_id);

-- RPC to safely increment download_count (security definer bypasses RLS)
create or replace function public.increment_download_count(course_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.courses
  set download_count = download_count + 1
  where id = course_id and is_public = true;
$$;
