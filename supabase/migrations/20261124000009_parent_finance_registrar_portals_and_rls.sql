-- =============================================================================
-- Migration: Parent, Finance/Bursar & Registrar Portals (Additive Tables & Strict Multi-Tenant RLS)
-- Safe & Idempotent: Zero breaking drops; extends existing core tables cleanly.
-- =============================================================================

-- 1. Safe additive columns on existing tables
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS recorded_by UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.terms
  ADD COLUMN IF NOT EXISTS registration_open_date DATE,
  ADD COLUMN IF NOT EXISTS registration_deadline DATE,
  ADD COLUMN IF NOT EXISTS exam_start_date DATE,
  ADD COLUMN IF NOT EXISTS exam_end_date DATE;

CREATE INDEX IF NOT EXISTS idx_invoices_school_student ON public.invoices(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_payments_school_student ON public.payments(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(school_id, receipt_number);

-- 2. New multi-tenant tables for Finance & Registrar Portals
CREATE TABLE IF NOT EXISTS public.school_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'operations',
  vendor TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  receipt_reference TEXT,
  status TEXT NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('recorded', 'approved', 'voided')),
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_expenses_school_date
  ON public.school_expenses(school_id, expense_date DESC);

CREATE TABLE IF NOT EXISTS public.staff_payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  pay_period TEXT NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid')),
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, staff_id, pay_period)
);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_school_period
  ON public.staff_payroll_records(school_id, pay_period DESC);

CREATE TABLE IF NOT EXISTS public.admissions_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  application_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  date_of_birth DATE,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  intake_id UUID REFERENCES public.vocational_intakes(id) ON DELETE SET NULL,
  target_level INTEGER DEFAULT 100,
  entry_term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  previous_school TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'enrolled', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  enrolled_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admissions_applications_school_status
  ON public.admissions_applications(school_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.graduation_clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  cohort_label TEXT,
  academic_cleared BOOLEAN NOT NULL DEFAULT false,
  finance_cleared BOOLEAN NOT NULL DEFAULT false,
  library_cleared BOOLEAN NOT NULL DEFAULT false,
  hostel_cleared BOOLEAN NOT NULL DEFAULT false,
  workshop_cleared BOOLEAN NOT NULL DEFAULT false,
  overall_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (overall_status IN ('pending', 'cleared', 'graduated', 'hold')),
  graduated_at TIMESTAMPTZ,
  certificate_number TEXT,
  remarks TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_graduation_clearances_school_status
  ON public.graduation_clearances(school_id, overall_status);

-- 3. Parent ward lookup helper (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_parent_student_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT sid FROM (
    SELECT pg.student_id AS sid
    FROM public.parent_guardians pg
    WHERE pg.school_id = public.get_current_user_school_id()
      AND pg.student_id IS NOT NULL
      AND (
        pg.user_id = auth.uid()
        OR lower(COALESCE(pg.email, '')) = lower(COALESCE(auth.jwt()->>'email', ''))
      )
    UNION
    SELECT pgs.student_id AS sid
    FROM public.parent_guardian_students pgs
    JOIN public.parent_guardians pg ON pg.id = pgs.parent_guardian_id
    WHERE pg.school_id = public.get_current_user_school_id()
      AND (
        pg.user_id = auth.uid()
        OR lower(COALESCE(pg.email, '')) = lower(COALESCE(auth.jwt()->>'email', ''))
      )
  ) linked
  WHERE sid IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_parent_student_ids() TO authenticated;

-- 4. Enable RLS and enforce strict school_id policies on Finance & Registrar tables
DO $$
DECLARE
  t TEXT;
  finance_tables TEXT[] := ARRAY[
    'school_expenses',
    'staff_payroll_records',
    'fee_structures',
    'invoices',
    'payments'
  ];
  registrar_tables TEXT[] := ARRAY[
    'admissions_applications',
    'graduation_clearances',
    'students',
    'course_enrolments',
    'academic_years',
    'terms',
    'vocational_intakes',
    'trade_certifications'
  ];
BEGIN
  FOREACH t IN ARRAY finance_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

      EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
        t, t
      );

      EXECUTE format('DROP POLICY IF EXISTS "Finance and Admin manage own school %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Finance and Admin manage own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
        t, t
      );
    END IF;
  END LOOP;

  FOREACH t IN ARRAY registrar_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

      EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
        t, t
      );

      EXECUTE format('DROP POLICY IF EXISTS "Registrar and Admin manage own school %I" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "Registrar and Admin manage own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- 5. Parent READ policies scoped strictly to own linked student IDs within school_id
DO $$
DECLARE
  pt TEXT;
  parent_student_scoped_tables TEXT[] := ARRAY[
    'exam_grades',
    'report_card_scores',
    'competency_assessments',
    'trade_certifications',
    'attendance_records',
    'student_conduct_records',
    'invoices',
    'payments'
  ];
BEGIN
  FOREACH pt IN ARRAY parent_student_scoped_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = pt
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Parent SELECT own ward %I" ON public.%I;', pt, pt);
      EXECUTE format(
        'CREATE POLICY "Parent SELECT own ward %I" ON public.%I FOR SELECT TO authenticated USING (school_id = public.get_current_user_school_id() AND student_id IN (SELECT public.get_current_parent_student_ids()));',
        pt, pt
      );
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Parent SELECT own linked students" ON public.students;
CREATE POLICY "Parent SELECT own linked students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND id IN (SELECT public.get_current_parent_student_ids())
  );

DROP POLICY IF EXISTS "Parent SELECT own school events" ON public.school_events;
CREATE POLICY "Parent SELECT own school events"
  ON public.school_events
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "Parent SELECT own school timetable" ON public.timetable_entries;
CREATE POLICY "Parent SELECT own school timetable"
  ON public.timetable_entries
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "Parent SELECT own school attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Parent SELECT own school attendance sessions"
  ON public.attendance_sessions
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());

-- 6. Seed registrar_portal global feature flag safely
INSERT INTO public.platform_feature_flags (
  portal_key,
  scope_type,
  school_id,
  scope_key,
  category,
  label,
  description,
  target_roles,
  route_prefixes,
  is_enabled
)
VALUES (
  'registrar_portal',
  'global',
  NULL,
  'global',
  'portal',
  'Registrar Portal',
  'Academic registry workspace for admissions onboarding, student records, course registrations, academic calendars, transcripts, and graduation clearance.',
  ARRAY['registrar', 'admissions_officer', 'academic_affairs_officer']::TEXT[],
  ARRAY['/registrar']::TEXT[],
  true
)
ON CONFLICT DO NOTHING;
