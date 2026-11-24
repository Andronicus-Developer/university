-- =============================================================================
-- Migration: 20261124000012_teacher_grades_rls_and_avatars.sql
-- Purpose:
--   1. Add `avatar_url` to `profiles`, `students`, `staff_profiles`, and
--      `parent_guardians`.
--   2. Create public `avatars` Storage bucket + user-scoped RLS policies.
--   3. Create `public.student_assessments` for High School Teachers (Classwork,
--      Assignment, Quiz, Exam) and add breakdown columns to `report_card_scores`.
--   4. Safely backfill High School `students.programme_id` where NULL.
--   5. Ensure explicit Teacher/Staff SELECT RLS across core academic/parent
--      tables and own-profile UPDATE policy on `public.profiles`.
-- =============================================================================

-- 1. Universal `avatar_url` Columns
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE IF EXISTS public.staff_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE IF EXISTS public.parent_guardians
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Public `avatars` Storage Bucket & Policies (2 MB limit, JPG/PNG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. `public.student_assessments` & `report_card_scores` breakdown columns
CREATE TABLE IF NOT EXISTS public.student_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('classwork', 'assignment', 'quiz', 'exam')),
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 20,
  remarks TEXT,
  graded_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_assessments_unique
  ON public.student_assessments (
    school_id,
    student_id,
    subject_id,
    COALESCE(term_id, '00000000-0000-0000-0000-000000000000'::uuid),
    assessment_type
  );

CREATE INDEX IF NOT EXISTS idx_student_assessments_scope
  ON public.student_assessments (school_id, class_id, subject_id, term_id);

ALTER TABLE IF EXISTS public.report_card_scores
  ADD COLUMN IF NOT EXISTS classwork_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignment_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

-- 4. Safe Backfill of High School `students.programme_id` when NULL
DO $$
BEGIN
  -- 4a. Restore programme_id from student metadata->>'programme_id' if valid in same school
  UPDATE public.students st
  SET programme_id = p.id,
      updated_at = now()
  FROM public.programmes p
  WHERE st.programme_id IS NULL
    AND st.metadata ? 'programme_id'
    AND (st.metadata->>'programme_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND p.id = (st.metadata->>'programme_id')::uuid
    AND p.school_id = st.school_id;

  -- 4b. If a high_school tenant has exactly 1 active programme/class, assign unassigned students to it
  UPDATE public.students st
  SET programme_id = single_prog.prog_id,
      updated_at = now()
  FROM (
    SELECT p.school_id, (ARRAY_AGG(p.id))[1] AS prog_id
    FROM public.programmes p
    JOIN public.schools sc ON sc.id = p.school_id
    WHERE lower(coalesce(sc.school_type, '')) IN ('high_school', 'high school', 'secondary')
      AND coalesce(p.is_active, true) = true
    GROUP BY p.school_id
    HAVING COUNT(*) = 1
  ) single_prog
  WHERE st.school_id = single_prog.school_id
    AND st.programme_id IS NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- 5. RLS Policies for Teachers / Academic Staff, Students, Parents & Self Profiles
DO $$
DECLARE
  t TEXT;
  teacher_read_tables TEXT[] := ARRAY[
    'students',
    'parent_guardians',
    'parent_guardian_students',
    'programmes',
    'subjects',
    'terms',
    'academic_years'
  ];
BEGIN
  FOREACH t IN ARRAY teacher_read_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated;', t);
      EXECUTE format('DROP POLICY IF EXISTS "Staff SELECT own school %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Staff SELECT own school %I" ON public.%I FOR SELECT TO authenticated USING (public.is_super_admin() OR (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()));',
        t, t
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_assessments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_assessments TO authenticated;

DROP POLICY IF EXISTS "Super Admin full access on student_assessments" ON public.student_assessments;
CREATE POLICY "Super Admin full access on student_assessments"
  ON public.student_assessments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Staff manage own school student_assessments" ON public.student_assessments;
CREATE POLICY "Staff manage own school student_assessments"
  ON public.student_assessments
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  );

DROP POLICY IF EXISTS "Student SELECT own student_assessments" ON public.student_assessments;
CREATE POLICY "Student SELECT own student_assessments"
  ON public.student_assessments
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND student_id = public.get_current_student_id()
  );

DROP POLICY IF EXISTS "Parent SELECT linked wards student_assessments" ON public.student_assessments;
CREATE POLICY "Parent SELECT linked wards student_assessments"
  ON public.student_assessments
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.parent_guardians pg
        WHERE pg.school_id = public.student_assessments.school_id
          AND pg.user_id = auth.uid()
          AND pg.student_id = public.student_assessments.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.parent_guardians pg
        JOIN public.parent_guardian_students pgs ON pgs.parent_guardian_id = pg.id
        WHERE pg.school_id = public.student_assessments.school_id
          AND pg.user_id = auth.uid()
          AND pgs.student_id = public.student_assessments.student_id
      )
    )
  );

-- Allow authenticated users to update their own profile (e.g. avatar_url / phone)
DROP POLICY IF EXISTS "Users UPDATE own profile" ON public.profiles;
CREATE POLICY "Users UPDATE own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
