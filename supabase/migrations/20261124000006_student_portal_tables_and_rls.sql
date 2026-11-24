-- ============================================================================
-- Migration: 20261124000006_student_portal_tables_and_rls.sql
-- Purpose:
--   1. Security-definer helpers `get_current_student_id()` and
--      `is_school_staff_or_admin()` scoped strictly to caller's `school_id`.
--   2. Safe additive columns on `course_enrolments`, `courses`,
--      `timetable_entries`, and `students` for University, High School, and
--      Vocational student portals.
--   3. Create 6 tenant-scoped student-facing tables:
--      - `course_materials`
--      - `hostel_requests`
--      - `assignments`
--      - `assignment_submissions`
--      - `practical_logbooks`
--      - `attachment_reports`
--   4. Harden student-level RLS so logged-in students only SELECT their own
--      `(school_id, student_id)` records and only INSERT/UPDATE permitted
--      self-service records.
-- ============================================================================

-- 1. Helper: resolve the authenticated user's student.id within their own school
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_school_id UUID := public.get_current_user_school_id();
  v_student_id UUID;
BEGIN
  IF v_uid IS NULL OR v_school_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.id INTO v_student_id
  FROM public.students s
  WHERE s.school_id = v_school_id
    AND (s.profile_id = v_uid OR s.id = v_uid)
  LIMIT 1;

  RETURN v_student_id;
END;
$$;

-- 2. Helper: identify teaching, finance, or administrative staff within school
CREATE OR REPLACE FUNCTION public.is_school_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_school_id UUID := public.get_current_user_school_id();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() OR public.is_school_admin() THEN
    RETURN true;
  END IF;

  IF v_school_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(COALESCE(p.role, '')) INTO v_role
  FROM public.profiles p
  WHERE p.id = v_uid
    AND p.school_id = v_school_id
  LIMIT 1;

  IF v_role IN (
    'system_admin', 'school_admin', 'admin', 'administrator',
    'teacher', 'lecturer', 'instructor', 'staff',
    'finance_officer', 'bursar', 'accountant',
    'registrar', 'dean', 'head_of_department', 'admissions_officer',
    'librarian', 'hostel_officer', 'hr_officer', 'auditor',
    'academic_advisor', 'advisor'
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    WHERE sp.school_id = v_school_id
      AND (sp.user_id = v_uid OR sp.id = v_uid)
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3. Safe additive column extensions on existing tables
ALTER TABLE IF EXISTS public.courses
  ADD COLUMN IF NOT EXISTS lecturer_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 100;

ALTER TABLE IF EXISTS public.course_enrolments
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'registered';

-- Harmonize legacy 20261029000004 constraints so direct course_id registration works
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_enrolments' AND column_name = 'course_offering_id'
  ) THEN
    ALTER TABLE public.course_enrolments ALTER COLUMN course_offering_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_enrolments' AND column_name = 'term_id'
  ) THEN
    ALTER TABLE public.course_enrolments ALTER COLUMN term_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.timetable_entries
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.vocational_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'class',
  ADD COLUMN IF NOT EXISTS exam_date DATE;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 4. New Student-Facing Tenant-Scoped Tables

-- 4a. University: Syllabus & Lecture Notes per Course
CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'lecture_notes'
    CHECK (material_type IN ('syllabus', 'lecture_notes', 'reading', 'lab_guide', 'past_paper')),
  description TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_materials_school ON public.course_materials (school_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON public.course_materials (course_id);

-- 4b. University: Student Hostel Accommodation Requests
CREATE TABLE IF NOT EXISTS public.hostel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  room_preference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hostel_requests_school ON public.hostel_requests (school_id);
CREATE INDEX IF NOT EXISTS idx_hostel_requests_student ON public.hostel_requests (student_id);

-- 4c. High School: Homework & Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date DATE,
  max_score INTEGER NOT NULL DEFAULT 100,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_school ON public.assignments (school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_programme ON public.assignments (programme_id);

-- 4d. High School: Student Homework Submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  response_text TEXT,
  submission_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score NUMERIC(5,2),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school ON public.assignment_submissions (school_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions (student_id);

-- 4e. Vocational: Practical Workshop Logbooks
CREATE TABLE IF NOT EXISTS public.practical_logbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.vocational_modules(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES public.vocational_intakes(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_title TEXT NOT NULL,
  task_description TEXT NOT NULL,
  tools_used TEXT,
  hours_spent NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'signed_off', 'needs_revision')),
  instructor_feedback TEXT,
  signed_off_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practical_logbooks_school ON public.practical_logbooks (school_id);
CREATE INDEX IF NOT EXISTS idx_practical_logbooks_student ON public.practical_logbooks (student_id);

-- 4f. Vocational: Weekly Industrial Attachment Reports
CREATE TABLE IF NOT EXISTS public.attachment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES public.industrial_attachments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL DEFAULT 1,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activities_summary TEXT NOT NULL,
  skills_learned TEXT,
  challenges TEXT,
  hours_worked NUMERIC(5,2) NOT NULL DEFAULT 40.0,
  supervisor_remarks TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachment_reports_school ON public.attachment_reports (school_id);
CREATE INDEX IF NOT EXISTS idx_attachment_reports_student ON public.attachment_reports (student_id);

-- 5. Enable RLS & Enforce Strict Student-Level Policies
DO $$
DECLARE
  t TEXT;
  all_new_tables TEXT[] := ARRAY[
    'course_materials',
    'hostel_requests',
    'assignments',
    'assignment_submissions',
    'practical_logbooks',
    'attachment_reports'
  ];
  school_read_tables TEXT[] := ARRAY[
    'course_materials',
    'assignments'
  ];
  student_private_readonly TEXT[] := ARRAY[
    'exam_grades',
    'hostel_allocations',
    'invoices',
    'payments',
    'attendance_records',
    'student_conduct_records',
    'report_card_scores',
    'parent_guardians',
    'competency_assessments',
    'industrial_attachments',
    'trade_certifications'
  ];
  student_self_service TEXT[] := ARRAY[
    'course_enrolments',
    'hostel_requests',
    'assignment_submissions',
    'practical_logbooks',
    'attachment_reports'
  ];
BEGIN
  -- Setup baseline Admin/Staff/SuperAdmin RLS on all 6 new tables
  FOREACH t IN ARRAY all_new_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

    EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Staff and Admin CRUD own school %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Staff and Admin CRUD own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
      t, t
    );
  END LOOP;

  -- Course materials and assignments are readable by all members of that school
  FOREACH t IN ARRAY school_read_tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "School Member SELECT own school %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "School Member SELECT own school %I" ON public.%I FOR SELECT TO authenticated USING (school_id = public.get_current_user_school_id());',
      t, t
    );
  END LOOP;

  -- Tighten student-private tables so students ONLY see their own student_id within their school_id
  FOREACH t IN ARRAY student_private_readonly
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "School Member SELECT own school %I" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Staff and Admin SELECT own school %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Staff and Admin SELECT own school %I" ON public.%I FOR SELECT TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
        t, t
      );

      EXECUTE format('DROP POLICY IF EXISTS "Student SELECT own %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Student SELECT own %I" ON public.%I FOR SELECT TO authenticated USING (school_id = public.get_current_user_school_id() AND student_id = public.get_current_student_id());',
        t, t
      );
    END IF;
  END LOOP;

  -- Self-service student tables: student can SELECT/INSERT/UPDATE/DELETE only own rows within own school_id
  FOREACH t IN ARRAY student_self_service
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "School Member SELECT own school %I" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Staff and Admin manage own school %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Staff and Admin manage own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
        t, t
      );

      EXECUTE format('DROP POLICY IF EXISTS "Student self service %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Student self service %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND student_id = public.get_current_student_id()) WITH CHECK (school_id = public.get_current_user_school_id() AND student_id = public.get_current_student_id());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Students can view and update contact details only on their own student row
DROP POLICY IF EXISTS "Student SELECT own profile row" ON public.students;
CREATE POLICY "Student SELECT own profile row"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND id = public.get_current_student_id()
  );

DROP POLICY IF EXISTS "Student UPDATE own contact fields" ON public.students;
CREATE POLICY "Student UPDATE own contact fields"
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND id = public.get_current_student_id()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND id = public.get_current_student_id()
  );
