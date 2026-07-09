-- Auto-create a public.profiles row whenever a new user signs up (via Kakao
-- OAuth or any other future auth method). Today profiles rows only get
-- created lazily when a user visits my-courses and edits their nickname
-- (see MyCourseList.tsx's handleSaveNickname upsert), so anyone who never
-- touched that UI has no profiles row at all — this is why the "live
-- nickname" feature (006) silently falls back to the old creator_name
-- snapshot for most existing users.
--
-- Default nickname priority: Kakao-provided name > "러너"+random suffix.
-- (courses.creator_name is intentionally NOT used here — that's only for
-- the one-time backfill of existing users in 008; a brand-new signup has
-- no courses yet.)
--
-- security definer + a pinned search_path: the trigger fires as part of
-- the auth.users insert, before the new user has an authenticated session,
-- so it must run with elevated privilege to bypass profiles' RLS insert
-- checks. Pinning search_path avoids search_path hijacking on a
-- security-definer function (standard Postgres/Supabase hardening).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, nickname, updated_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      '러너' || substr(new.id::text, 1, 4)
    ),
    now()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
