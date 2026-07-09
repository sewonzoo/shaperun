-- Downloaded copies (original_course_id is not null) must never be public:
-- the original is already public, so publishing the copy would duplicate
-- the same route in the community feed. downloadCourse() already hardcodes
-- is_public: false on insert; this constraint closes the remaining gap where
-- is_public could be flipped to true afterwards through any other path
-- (e.g. a direct update call), regardless of the client.
--
-- IMPORTANT: if any existing downloaded copy currently has is_public = true,
-- this ALTER TABLE will fail — fix those rows first, e.g.:
--   update public.courses set is_public = false where original_course_id is not null and is_public = true;
alter table public.courses
  add constraint courses_downloaded_copy_always_private
  check (original_course_id is null or is_public = false);
