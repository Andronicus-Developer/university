-- ============================================================================
-- Migration: 20261124000002_create_platform_feature_flags_table.sql
-- Purpose:
--   Create `public.platform_feature_flags` storing global and optional per-school
--   portal/module visibility toggles managed from the Super Admin panel.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_key TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'school')),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  scope_key TEXT NOT NULL DEFAULT 'global',
  category TEXT NOT NULL DEFAULT 'portal' CHECK (category IN ('portal', 'module')),
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  route_prefixes TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portal_key, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_feature_flags_portal_key
  ON public.platform_feature_flags (portal_key);

CREATE INDEX IF NOT EXISTS idx_platform_feature_flags_scope_key
  ON public.platform_feature_flags (scope_key);

ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.platform_feature_flags TO service_role;
GRANT SELECT ON public.platform_feature_flags TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.platform_feature_flags TO authenticated;

DROP POLICY IF EXISTS "Read platform feature flags"
  ON public.platform_feature_flags;

CREATE POLICY "Read platform feature flags"
  ON public.platform_feature_flags
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Super Admin manage platform feature flags"
  ON public.platform_feature_flags;

CREATE POLICY "Super Admin manage platform feature flags"
  ON public.platform_feature_flags
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Seed default global portal & major module flags (all enabled by default)
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
VALUES
  (
    'admin_portal',
    'global',
    NULL,
    'global',
    'portal',
    'School / System Admin Portal',
    'Institutional administration workspace covering students, staff, academics, timetables, and school governance.',
    ARRAY['system_admin', 'admin', 'administrator', 'vice_chancellor', 'registrar', 'academic_affairs_officer', 'dean', 'head_of_department', 'admissions_officer', 'librarian', 'hostel_officer', 'hr_officer', 'auditor'],
    ARRAY['/admin'],
    true
  ),
  (
    'finance_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Finance & Bursar Portal',
    'Fee schedules, student invoices, payment reconciliation, bursar receipts, waivers, and refunds.',
    ARRAY['finance_officer', 'bursar', 'accountant', 'auditor'],
    ARRAY['/finance', '/bursar'],
    true
  ),
  (
    'lecturer_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Lecturer / Faculty Portal',
    'University and college faculty workspace for courses, attendance, assessments, marks entry, and advising.',
    ARRAY['lecturer'],
    ARRAY['/lecturer'],
    true
  ),
  (
    'teacher_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Teacher / Staff Portal',
    'High school & vocational instructor workspace for class roll call, gradebooks, parent messages, and workshops.',
    ARRAY['teacher'],
    ARRAY['/teacher'],
    true
  ),
  (
    'student_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Student Portal',
    'Student self-service portal for course registration, timetables, attendance, grades, transcripts, and fee statements.',
    ARRAY['student'],
    ARRAY['/student'],
    true
  ),
  (
    'parent_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Parent / Guardian Portal',
    'Family portal for ward attendance tracking, report cards, fee billing visibility, and PTA teacher messages.',
    ARRAY['parent', 'parent_sponsor', 'guardian'],
    ARRAY['/parent'],
    true
  ),
  (
    'applicant_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Admissions & Applicant Portal',
    'Online admissions application tracker, document uploads, admission decisions, and institutional admissions pipeline.',
    ARRAY['applicant', 'admissions_officer'],
    ARRAY['/applicant', '/admin/admissions'],
    true
  ),
  (
    'advisor_portal',
    'global',
    NULL,
    'global',
    'portal',
    'Academic Advisor Portal',
    'Academic advising dashboard for assigned student cohorts, credit loads, progression reviews, and case notes.',
    ARRAY['academic_advisor', 'advisor'],
    ARRAY['/advisor'],
    true
  ),
  (
    'exams_module',
    'global',
    NULL,
    'global',
    'module',
    'Examinations & Grading',
    'Exam scheduling, marks entry, moderation workflows, GPA/CGPA computation, results publishing, and transcripts.',
    ARRAY['system_admin', 'lecturer', 'student', 'registrar'],
    ARRAY['/admin/exams', '/lecturer/marks-entry', '/lecturer/assessments', '/lecturer/moderation', '/student/results', '/student/transcripts'],
    true
  ),
  (
    'library_module',
    'global',
    NULL,
    'global',
    'module',
    'Library Services',
    'Campus book catalog, circulation inventory, student loans, returns, and overdue fine tracking.',
    ARRAY['librarian', 'system_admin', 'student'],
    ARRAY['/admin/library', '/student/library'],
    true
  ),
  (
    'hostels_module',
    'global',
    NULL,
    'global',
    'module',
    'Hostels & Campus Housing',
    'Residence halls, room/bed capacity management, student accommodation requests, allocations, and maintenance.',
    ARRAY['hostel_officer', 'system_admin', 'student'],
    ARRAY['/admin/hostels', '/student/hostel'],
    true
  ),
  (
    'transport_module',
    'global',
    NULL,
    'global',
    'module',
    'Transport & Fleet Logistics',
    'School bus routes, vehicle fleet schedules, boarding passes, and campus transit logs.',
    ARRAY['system_admin', 'staff'],
    ARRAY['/admin/transport', '/admin/transportation'],
    true
  ),
  (
    'lms_module',
    'global',
    NULL,
    'global',
    'module',
    'LMS / E-Learning & Workshops',
    'Digital classrooms, practical vocational workshops, apprenticeship tracking, and online learning materials.',
    ARRAY['system_admin', 'teacher', 'lecturer', 'student'],
    ARRAY['/admin/workshops', '/teacher/workshops'],
    true
  )
ON CONFLICT (portal_key, scope_key) DO NOTHING;
