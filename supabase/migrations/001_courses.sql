create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  distance_m  integer not null default 0,
  duration_s  integer not null default 0,
  waypoints   jsonb not null default '[]',
  segments    jsonb not null default '[]',
  loop_closed boolean not null default false,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses(user_id);

alter table public.courses enable row level security;

create policy "own read"   on public.courses for select using (auth.uid() = user_id);
create policy "own insert" on public.courses for insert with check (auth.uid() = user_id);
create policy "own delete" on public.courses for delete using (auth.uid() = user_id);
