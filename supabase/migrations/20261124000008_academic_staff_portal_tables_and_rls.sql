-- ============================================================================
-- Migration: 20261124000008_academic_staff_portal_tables_and_rls.sql
-- Purpose:
--   1. Create `public.get_current_staff_profile_id()` SECURITY DEFINER helper
--      scoped strictly to the logged-in user's `school_id`.
--   2. Safe additive columns on `staff_profiles`, `course_materials`,
--      `assignments`, `attendance_sessions`, `attendance_records`, and
--      `industrial_attachments` to support University Lecturers, High School
--      Teachers, and Vocational Instructors across the shared database.
--   3. Create 3 tenant-scoped academic staff tables:
--      - `public.student_advising_notes` (University Lecturer Advising)
--      - `public.parent_teacher_messages` (High School Parent Messages)
--      - `public.workshop_equipment_requests` (Vocational Tool/Equipment Requests)
--   4. Enforce strict school_id & staff-level RLS policies across all teaching,
--      grading, attendance, logbook, competency, advising, and messaging tables.
-- ============================================================================

-- 1. Security-definer helper: resolve logged-in staff_profiles.id within caller's school_id
CREATE OR REPLACE FUNCTION public.get_current_staff_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_school_id UUID := public.get_current_user_school_id();
  v_staff_id UUID;
BEGIN
  IF v_uid IS NULL OR v_school_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT sp.id INTO v_staff_id
  FROM public.staff_profiles sp
  WHERE sp.school_id = v_school_id
    AND (sp.user_id = v_uid OR sp.id = v_uid)
  LIMIT 1;

  RETURN v_staff_id;
END;
$$;

-- 2. Safe additive extensions on existing tables
ALTER TABLE IF EXISTS public.staff_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

DO $$
DECLARE
  v_conname TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_materials' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE public.course_materials ALTER COLUMN course_id DROP NOT NULL;
  END IF;

  ALTER TABLE IF EXISTS public.course_materials
    ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.vocational_modules(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;

  CREATE INDEX IF NOT EXISTS idx_course_materials_module
    ON public.course_materials (module_id);
  CREATE INDEX IF NOT EXISTS idx_course_materials_subject
    ON public.course_materials (subject_id);

  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'course_materials'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%material_type%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.course_materials DROP CONSTRAINT IF EXISTS %I;', v_conname);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'course_materials'
  ) THEN
    ALTER TABLE public.course_materials
      ADD CONSTRAINT course_materials_material_type_check
      CHECK (
        material_type IN (
          'syllabus',
          'lecture_notes',
          'reading',
          'lab_guide',
          'past_paper',
          'workshop_manual',
          'safety_guide'
        )
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assessment_type TEXT NOT NULL DEFAULT 'assignment',
  ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_assignments_school_course
  ON public.assignments (school_id, course_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_sessions' AND column_name = 'class_group_id'
  ) THEN
    ALTER TABLE public.attendance_sessions ALTER COLUMN class_group_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.attendance_sessions
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.vocational_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS safety_briefing_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS safety_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_school_date
  ON public.attendance_sessions (school_id, session_date DESC);

ALTER TABLE IF EXISTS public.attendance_records
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS ppe_compliant BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.industrial_attachments
  ADD COLUMN IF NOT EXISTS supervisor_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;

-- 3. New Tenant-Scoped Staff Tables

-- 3a. University Lecturer Student Advising / Mentorship Notes
CREATE TABLE IF NOT EXISTS public.student_advising_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  advisor_name TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  advising_type TEXT NOT NULL DEFAULT 'academic'
    CHECK (advising_type IN ('academic', 'project', 'career', 'welfare')),
  topic TEXT NOT NULL,
  notes TEXT NOT NULL,
  action_items TEXT,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advising_notes_school ON public.student_advising_notes (school_id);
CREATE INDEX IF NOT EXISTS idx_advising_notes_student ON public.student_advising_notes (student_id);
CREATE INDEX IF NOT EXISTS idx_advising_notes_staff ON public.student_advising_notes (staff_id);

-- 3b. High School Teacher-Parent Communication Log
CREATE TABLE IF NOT EXISTS public.parent_teacher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_guardian_id UUID NOT NULL REFERENCES public.parent_guardians(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL DEFAULT 'teacher' CHECK (sender_role IN ('teacher', 'parent', 'admin')),
  sender_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'academic' CHECK (category IN ('academic', 'attendance', 'conduct', 'general')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_messages_school ON public.parent_teacher_messages (school_id);
CREATE INDEX IF NOT EXISTS idx_pt_messages_parent ON public.parent_teacher_messages (parent_guardian_id);
CREATE INDEX IF NOT EXISTS idx_pt_messages_staff ON public.parent_teacher_messages (staff_id);

-- 3c. Vocational Workshop Tools & Equipment Requests / Damage Reports
CREATE TABLE IF NOT EXISTS public.workshop_equipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.workshop_inventory(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  request_type TEXT NOT NULL DEFAULT 'tool_request'
    CHECK (request_type IN ('tool_request', 'material_requisition', 'damage_report', 'maintenance')),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_req_school ON public.workshop_equipment_requests (school_id);
CREATE INDEX IF NOT EXISTS idx_workshop_req_staff ON public.workshop_equipment_requests (staff_id);

-- 4. Enable RLS & Enforce Strict School-Scoped Staff Policies
DO $$
DECLARE
  t TEXT;
  new_staff_tables TEXT[] := ARRAY[
    'student_advising_notes',
    'parent_teacher_messages',
    'workshop_equipment_requests'
  ];
  staff_ops_tables TEXT[] := ARRAY[
    'exam_grades',
    'report_card_scores',
    'attendance_sessions',
    'attendance_records',
    'student_conduct_records',
    'competency_assessments',
    'industrial_attachments',
    'workshop_inventory'
  ];
BEGIN
  FOREACH t IN ARRAY new_staff_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

    EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Staff and Admin manage own school %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Staff and Admin manage own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
      t, t
    );
  END LOOP;

  -- Empower Academic Staff within their school_id to record grades, attendance, conduct, competencies, attachments
  FOREACH t IN ARRAY staff_ops_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
      EXECUTE format('DROP POLICY IF EXISTS "Staff manage own school %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Staff manage own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Students can read their own advising notes
DROP POLICY IF EXISTS "Student SELECT own advising notes" ON public.student_advising_notes;
CREATE POLICY "Student SELECT own advising notes"
  ON public.student_advising_notes
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND student_id = public.get_current_student_id()
  );

-- Parents can read & reply to their own parent_teacher_messages
DROP POLICY IF EXISTS "Parent SELECT own teacher messages" ON public.parent_teacher_messages;
CREATE POLICY "Parent SELECT own teacher messages"
  ON public.parent_teacher_messages
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.parent_guardians pg
      WHERE pg.id = public.parent_teacher_messages.parent_guardian_id
        AND pg.school_id = public.parent_teacher_messages.school_id
        AND pg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parent INSERT own reply messages" ON public.parent_teacher_messages;
CREATE POLICY "Parent INSERT own reply messages"
  ON public.parent_teacher_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND sender_role = 'parent'
    AND EXISTS (
      SELECT 1 FROM public.parent_guardians pg
      WHERE pg.id = public.parent_teacher_messages.parent_guardian_id
        AND pg.school_id = public.parent_teacher_messages.school_id
        AND pg.user_id = auth.uid()
    )
  );

-- Staff can read & update their own staff_profiles record within their school_id
DROP POLICY IF EXISTS "Staff SELECT own staff profile" ON public.staff_profiles;
CREATE POLICY "Staff SELECT own staff profile"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND (user_id = auth.uid() OR public.is_school_staff_or_admin())
  );

DROP POLICY IF EXISTS "Staff UPDATE own contact fields" ON public.staff_profiles;
CREATE POLICY "Staff UPDATE own contact fields"
  ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND user_id = auth.uid()
  );
