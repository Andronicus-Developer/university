-- ==============================================================================
-- 20261029000011_course_cascade_delete_constraints.sql
-- Update course-related foreign key constraints from ON DELETE RESTRICT to ON DELETE CASCADE
-- so administrative course deletion removes dependent curriculum requirements and offerings cleanly.
-- ==============================================================================

ALTER TABLE public.curriculum_requirements
  DROP CONSTRAINT IF EXISTS curriculum_requirements_course_id_fkey,
  ADD CONSTRAINT curriculum_requirements_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.course_offerings
  DROP CONSTRAINT IF EXISTS course_offerings_course_id_fkey,
  ADD CONSTRAINT course_offerings_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.course_enrolments
  DROP CONSTRAINT IF EXISTS course_enrolments_course_offering_id_fkey,
  ADD CONSTRAINT course_enrolments_course_offering_id_fkey
    FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE;

