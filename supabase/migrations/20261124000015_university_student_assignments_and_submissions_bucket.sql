-- =============================================================================
-- Migration: 20261124000015_university_student_assignments_and_submissions_bucket.sql
-- Purpose:
--   1. Safely add `course_id` column & composite index on `public.assignment_submissions`
--      for University Coursework submissions.
--   2. Create/configure `submissions` Supabase Storage bucket (10 MB, docs/images/zips)
--      and authenticated upload/read RLS policies.
--   3. Reinforce multi-tenant RLS policies on `public.assignments` and
--      `public.assignment_submissions` so University students can read published
--      assignments for their registered courses and insert/update their own
--      ungraded submissions within their `school_id`.
-- =============================================================================

-- 1. Safe additive column + index on assignment_submissions
ALTER TABLE IF EXISTS public.assignment_submissions
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_course
  ON public.assignment_submissions (school_id, course_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_asg_stu
  ON public.assignment_submissions (school_id, assignment_id, student_id);

-- 2. Storage bucket for student coursework submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "submissions_bucket_public_read" ON storage.objects;
  CREATE POLICY "submissions_bucket_public_read"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'submissions');

  DROP POLICY IF EXISTS "submissions_bucket_authenticated_insert" ON storage.objects;
  CREATE POLICY "submissions_bucket_authenticated_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'submissions');

  DROP POLICY IF EXISTS "submissions_bucket_authenticated_update" ON storage.objects;
  CREATE POLICY "submissions_bucket_authenticated_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'submissions')
    WITH CHECK (bucket_id = 'submissions');
END $$;

-- 3. Strict Multi-Tenant RLS on `public.assignments` and `public.assignment_submissions`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assignments'
  ) THEN
    ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "School Member SELECT own school assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Student SELECT enrolled course or class assignments" ON public.assignments;
    CREATE POLICY "Student SELECT enrolled course or class assignments"
      ON public.assignments
      FOR SELECT
      TO authenticated
      USING (
        school_id = public.get_current_user_school_id()
        AND (
          public.is_super_admin()
          OR public.is_school_staff_or_admin()
          OR (
            status <> 'draft'
            AND (
              course_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM public.course_enrolments ce
                WHERE ce.school_id = assignments.school_id
                  AND ce.student_id = public.get_current_student_id()
                  AND ce.course_id = assignments.course_id
                  AND COALESCE(ce.status, 'registered') NOT IN ('dropped', 'withdrawn')
              )
            )
          )
        )
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assignment_submissions'
  ) THEN
    ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Student self service assignment_submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Student SELECT own assignment_submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Student INSERT own assignment_submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Student UPDATE own ungraded assignment_submissions" ON public.assignment_submissions;

    CREATE POLICY "Student SELECT own assignment_submissions"
      ON public.assignment_submissions
      FOR SELECT
      TO authenticated
      USING (
        school_id = public.get_current_user_school_id()
        AND student_id = public.get_current_student_id()
      );

    CREATE POLICY "Student INSERT own assignment_submissions"
      ON public.assignment_submissions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        school_id = public.get_current_user_school_id()
        AND student_id = public.get_current_student_id()
      );

    CREATE POLICY "Student UPDATE own ungraded assignment_submissions"
      ON public.assignment_submissions
      FOR UPDATE
      TO authenticated
      USING (
        school_id = public.get_current_user_school_id()
        AND student_id = public.get_current_student_id()
        AND status <> 'graded'
      )
      WITH CHECK (
        school_id = public.get_current_user_school_id()
        AND student_id = public.get_current_student_id()
        AND status <> 'graded'
      );
  END IF;
END $$;
