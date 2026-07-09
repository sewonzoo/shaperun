-- Prevent duplicate downloads: a user can hold at most one copy of a given
-- original course. Rows with original_course_id IS NULL (i.e. not a
-- downloaded copy) are unaffected — Postgres treats each NULL as distinct
-- for uniqueness purposes, so users can still have any number of their own
-- original courses.
--
-- IMPORTANT: run the duplicate-cleanup DELETE statements first — this
-- ALTER TABLE will fail if any existing duplicate (user_id, original_course_id)
-- rows remain.
alter table public.courses
  add constraint courses_user_original_unique unique (user_id, original_course_id);
