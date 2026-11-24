-- ============================================================================
-- Migration: 20261124000003_school_type_specialized_tables.sql
-- Purpose:
--   1. Safely extend `public.schools` and `public.students` for specialized
--      University, High School, and Vocational portals.
--   2. Create all 17 tenant-scoped specialized tables with `school_id` FKs
--      and indexes.
--   3. Apply strict multi-tenant RLS policies (`is_super_admin()` global CRUD +
--      `is_school_admin()` scoped CRUD + school member scoped SELECT) across
--      all new tables and existing operational tables.
-- ============================================================================

-- 1. Extend existing `public.schools` and `public.students`
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS motto TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS academic_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS profile_id UUID,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS programme_id UUID,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS intake_id UUID,
  ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 100;

-- 2. University & Shared Core Tables (6 tables)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  contact_hours INTEGER NOT NULL DEFAULT 3,
  course_type TEXT NOT NULL DEFAULT 'core' CHECK (course_type IN ('core', 'elective', 'general')),
  semester_number INTEGER DEFAULT 1,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.course_enrolments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'dropped', 'completed', 'withdrawn')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  ca_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade_letter TEXT NOT NULL DEFAULT 'F',
  grade_point NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'moderated', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  gender_policy TEXT NOT NULL DEFAULT 'mixed' CHECK (gender_policy IN ('male', 'female', 'mixed')),
  total_rooms INTEGER NOT NULL DEFAULT 20,
  total_beds INTEGER NOT NULL DEFAULT 80,
  warden_name TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.hostel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  bed_number TEXT,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'occupied' CHECK (status IN ('occupied', 'checked_out', 'reserved')),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tuition',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

-- 3. High School Tables (5 tables)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'core' CHECK (category IN ('core', 'elective', 'extracurricular')),
  weekly_periods INTEGER NOT NULL DEFAULT 4,
  pass_mark INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  day_of_week TEXT NOT NULL DEFAULT 'Monday' CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room TEXT,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_conduct_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_type TEXT NOT NULL DEFAULT 'commendation' CHECK (record_type IN ('commendation', 'warning', 'disciplinary', 'counseling')),
  conduct_grade TEXT DEFAULT 'Good',
  notes TEXT NOT NULL,
  recorded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parent_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'Parent' CHECK (relationship IN ('Mother', 'Father', 'Guardian', 'Sponsor', 'Parent')),
  occupation TEXT,
  address TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  is_primary_contact BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_card_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  ca_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'C4',
  teacher_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Vocational / Technical School Tables (6 tables)
CREATE TABLE IF NOT EXISTS public.vocational_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  practical_hours INTEGER NOT NULL DEFAULT 20,
  theory_hours INTEGER NOT NULL DEFAULT 10,
  credit_units INTEGER NOT NULL DEFAULT 3,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.vocational_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  capacity INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.competency_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.vocational_modules(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES public.vocational_intakes(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  practical_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL DEFAULT 'competent' CHECK (verdict IN ('competent', 'not_yet_competent', 'in_progress')),
  assessor_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.industrial_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  supervisor_name TEXT,
  supervisor_phone TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('pending', 'placed', 'completed', 'terminated')),
  evaluation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workshop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tool' CHECK (category IN ('tool', 'machine', 'consumable', 'safety_gear')),
  quantity INTEGER NOT NULL DEFAULT 1,
  min_stock_threshold INTEGER NOT NULL DEFAULT 2,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'needs_repair', 'out_of_service')),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, item_code)
);

CREATE TABLE IF NOT EXISTS public.trade_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES public.vocational_intakes(id) ON DELETE SET NULL,
  certificate_number TEXT NOT NULL,
  qualification_title TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('pending', 'issued', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, certificate_number)
);

-- 5. Indexes, Grants, & Strict Multi-Tenant RLS for All 17 New Tables + Operational Tables
DO $$
DECLARE
  t TEXT;
  new_tables TEXT[] := ARRAY[
    'courses', 'course_enrolments', 'exam_grades', 'hostels', 'hostel_allocations', 'fee_structures',
    'subjects', 'timetable_entries', 'student_conduct_records', 'parent_guardians', 'report_card_scores',
    'vocational_modules', 'vocational_intakes', 'competency_assessments', 'industrial_attachments', 'workshop_inventory', 'trade_certifications'
  ];
  ops_tables TEXT[] := ARRAY[
    'academic_years', 'terms', 'attendance_sessions', 'attendance_records', 'invoices', 'payments', 'students', 'staff_profiles'
  ];
BEGIN
  FOREACH t IN ARRAY new_tables
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I (school_id);', t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

    EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "School Admin CRUD own school %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "School Admin CRUD own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_admin());',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "School Member SELECT own school %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "School Member SELECT own school %I" ON public.%I FOR SELECT TO authenticated USING (school_id = public.get_current_user_school_id());',
      t, t
    );
  END LOOP;

  FOREACH t IN ARRAY ops_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

      EXECUTE format('DROP POLICY IF EXISTS "Super Admin CRUD on %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Super Admin CRUD on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
        t, t
      );

      EXECUTE format('DROP POLICY IF EXISTS "School Admin CRUD on %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "School Admin CRUD on %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Allow School Admins to update their own row in `public.schools` (profile, logo, academic_settings)
GRANT UPDATE ON public.schools TO authenticated;
DROP POLICY IF EXISTS "School Admin update own school" ON public.schools;
CREATE POLICY "School Admin update own school"
  ON public.schools
  FOR UPDATE
  TO authenticated
  USING (id = public.get_current_user_school_id() AND public.is_school_admin())
  WITH CHECK (id = public.get_current_user_school_id() AND public.is_school_admin());
