-- profiles.nickname is displayed as the course author's name on the public
-- community feed and course detail page. Currently RLS on profiles only
-- lets a user read their own row (a typical `auth.uid() = user_id` select
-- policy), which silently blocks everyone else — including anonymous
-- visitors — from resolving anyone else's live nickname. The app code
-- already falls back to the old courses.creator_name snapshot when this
-- happens, so today it *looks* like it works but is actually always
-- serving the stale snapshot for other users' names.
--
-- nickname is not new sensitive exposure: it's already shown to every
-- visitor today via courses.creator_name, just frozen at save time. This
-- policy lets anyone resolve the current value by user_id.
--
-- IMPORTANT: check the profiles table for any other columns before
-- applying — this policy exposes the full row (not just nickname) to
-- public SELECT. If profiles has other, more sensitive columns, consider
-- a public view exposing only (user_id, nickname) instead of this policy.
create policy "profiles_public_read" on public.profiles
  for select
  using (true);
