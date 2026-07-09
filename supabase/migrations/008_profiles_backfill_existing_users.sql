-- One-time backfill for users who signed up before 007's trigger existed
-- and never manually set a nickname (14 of 15 existing auth.users had no
-- profiles row as of this writing). Idempotent — safe to re-run: the
-- `not exists` guard plus `on conflict do nothing` mean it only ever
-- inserts rows that are still missing, and never touches an existing row
-- (so nobody's manually-chosen nickname gets overwritten).
--
-- Priority: Kakao-provided name > most recent non-null courses.creator_name
-- for that user > "러너"+random suffix.
insert into public.profiles (user_id, nickname, updated_at)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    (
      select c.creator_name
      from public.courses c
      where c.user_id = u.id and c.creator_name is not null
      order by c.created_at desc
      limit 1
    ),
    '러너' || substr(u.id::text, 1, 4)
  ),
  now()
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
on conflict (user_id) do nothing;
