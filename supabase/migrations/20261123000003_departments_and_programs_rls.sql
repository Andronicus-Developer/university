-- ============================================================================
-- Migration: 20261123000003_departments_and_programs_rls.sql
-- Purpose:
--   1. Create `public.is_school_admin()` helper for multi-tenant admin RLS.
--   2. Ensure `public.departments` and `public.programmes` exist with strict
--      `school_id` foreign keys and per-school unique codes `UNIQUE (school_id, code)`.
--   3. Apply Super Admin global CRUD + School Admin scoped CRUD + School member
--      scoped SELECT RLS policies on both `public.departments` and `public.programmes`.
-- ============================================================================

-- 1. Helper: identifies School / Institutional Admins authorized to manage academic entities
CREATE OR REPLACE FUNCTION public.is_school_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_jwt JSONB := auth.jwt();
  v_admin_roles TEXT[] := ARRAY[
    'system_admin',
    'school_admin',
    'admin',
    'registrar',
    'dean',
    'head_of_department',
    'academic_affairs_officer'
  ];
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF lower(COALESCE(v_jwt->'app_metadata'->>'role', '')) = ANY(v_admin_roles)
     OR lower(COALESCE(v_jwt->'user_metadata'->>'role', '')) = ANY(v_admin_roles)
     OR lower(COALESCE(v_jwt->'user_metadata'->>'default_role', '')) = ANY(v_admin_roles) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND lower(COALESCE(p.role, '')) = ANY(v_admin_roles)
      AND COALESCE(p.account_status, 'active') = 'active'
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.school_memberships m
    LEFT JOIN public.roles r ON r.id = m.role_id
    WHERE m.user_id = v_uid
      AND COALESCE(m.status, 'active') = 'active'
      AND (
        lower(COALESCE(m.role, '')) = ANY(v_admin_roles)
        OR lower(COALESCE(r.code, '')) = ANY(v_admin_roles)
      )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Ensure public.departments exists with multi-tenant school_id linkage
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  faculty_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  head_of_department TEXT,
  hod_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_department_school_code UNIQUE (school_id, code)
);

ALTER TABLE IF EXISTS public.departments
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS faculty_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS head_of_department TEXT,
  ADD COLUMN IF NOT EXISTS hod_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Drop global unique constraint on code alone if present, enforce per-school uniqueness
ALTER TABLE IF EXISTS public.departments DROP CONSTRAINT IF EXISTS departments_code_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_department_school_code'
  ) THEN
    ALTER TABLE public.departments ADD CONSTRAINT unique_department_school_code UNIQUE (school_id, code);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_departments_school_id ON public.departments(school_id);

-- 3. Ensure public.programmes exists with multi-tenant school_id and department_id
CREATE TABLE IF NOT EXISTS public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  degree_level TEXT NOT NULL DEFAULT 'undergraduate',
  duration_years INTEGER NOT NULL DEFAULT 4 CHECK (duration_years > 0),
  total_credits_required INTEGER NOT NULL DEFAULT 120 CHECK (total_credits_required > 0),
  total_credits INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_programme_school_code UNIQUE (school_id, code)
);

ALTER TABLE IF EXISTS public.programmes
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS degree_level TEXT NOT NULL DEFAULT 'undergraduate',
  ADD COLUMN IF NOT EXISTS duration_years INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS total_credits_required INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS total_credits INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.programmes DROP CONSTRAINT IF EXISTS programmes_code_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_programme_school_code'
  ) THEN
    ALTER TABLE public.programmes ADD CONSTRAINT unique_programme_school_code UNIQUE (school_id, code);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_programmes_school_id ON public.programmes(school_id);
CREATE INDEX IF NOT EXISTS idx_programmes_department_id ON public.programmes(department_id);

-- 4. Grant authenticated access and enforce strict multi-tenant RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programmes TO authenticated;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

-- Policies for public.departments
DROP POLICY IF EXISTS "Super Admin full access on departments" ON public.departments;
DROP POLICY IF EXISTS "School Admin full CRUD on own school departments" ON public.departments;
DROP POLICY IF EXISTS "School members read own school departments" ON public.departments;
DROP POLICY IF EXISTS "Strict tenant isolation on departments" ON public.departments;

CREATE POLICY "Super Admin full access on departments"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin full CRUD on own school departments"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (school_id = public.get_current_user_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_admin());

CREATE POLICY "School members read own school departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());

-- Policies for public.programmes
DROP POLICY IF EXISTS "Super Admin full access on programmes" ON public.programmes;
DROP POLICY IF EXISTS "School Admin full CRUD on own school programmes" ON public.programmes;
DROP POLICY IF EXISTS "School members read own school programmes" ON public.programmes;
DROP POLICY IF EXISTS "Strict tenant isolation on programmes" ON public.programmes;

CREATE POLICY "Super Admin full access on programmes"
  ON public.programmes
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin full CRUD on own school programmes"
  ON public.programmes
  FOR ALL
  TO authenticated
  USING (school_id = public.get_current_user_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_admin());

CREATE POLICY "School members read own school programmes"
  ON public.programmes
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());
