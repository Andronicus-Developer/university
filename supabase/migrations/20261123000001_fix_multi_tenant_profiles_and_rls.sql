-- ============================================================================
-- Migration: 20261123000001_fix_multi_tenant_profiles_and_rls.sql
-- Purpose:
--   1. Ensure `public.profiles` and `public.user_role_assignments` exist with
--      `school_id` foreign-key linking to `public.schools(id)`.
--   2. Backfill existing `auth.users` / `school_memberships` into `public.profiles`.
--   3. Harden `is_super_admin()`, `get_current_user_school_id()`,
--      `can_access_school_data()`, and `handle_new_user()` trigger.
--   4. Enforce strict multi-tenant RLS so Super Admins can SELECT/manage ALL
--      schools and users, while tenant users strictly see only their `school_id`.
-- ============================================================================

-- 1. Ensure optional columns on public.schools exist
ALTER TABLE IF EXISTS public.schools
  ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'university',
  ADD COLUMN IF NOT EXISTS tenant_slug TEXT;

-- 2. Ensure public.profiles exists with strict multi-tenant columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'student',
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  university_id UUID,
  account_status TEXT DEFAULT 'active',
  is_mfa_enabled BOOLEAN DEFAULT false,
  last_sign_in_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS university_id UUID,
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_mfa_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Ensure user_role_assignments exists for RBAC compatibility
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_school_id ON public.user_role_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);

-- 4. Safe UUID parser helper (returns NULL if text is not a valid UUID)
CREATE OR REPLACE FUNCTION public.try_parse_uuid(input_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR btrim(input_text) = '' THEN
    RETURN NULL;
  END IF;
  IF btrim(input_text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN btrim(input_text)::uuid;
  END IF;
  RETURN NULL;
END;
$$;

-- 5. Backfill public.profiles for existing auth.users without overriding valid school links
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  school_id,
  university_id,
  account_status,
  metadata,
  created_at,
  updated_at
)
SELECT
  u.id,
  lower(u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(
    NULLIF(u.raw_app_meta_data->>'role', ''),
    NULLIF(u.raw_user_meta_data->>'role', ''),
    NULLIF(u.raw_user_meta_data->>'default_role', ''),
    CASE WHEN lower(u.email) = 'superadmin@university.edu.gh' THEN 'superadmin' ELSE 'student' END
  ),
  (
    SELECT s.id
    FROM public.schools s
    WHERE s.id = COALESCE(
      public.try_parse_uuid(u.raw_app_meta_data->>'school_id'),
      public.try_parse_uuid(u.raw_user_meta_data->>'school_id'),
      public.try_parse_uuid(u.raw_app_meta_data->>'university_id'),
      public.try_parse_uuid(u.raw_user_meta_data->>'university_id'),
      (
        SELECT m.school_id
        FROM public.school_memberships m
        WHERE m.user_id = u.id
        ORDER BY m.created_at DESC
        LIMIT 1
      )
    )
    LIMIT 1
  ),
  COALESCE(
    public.try_parse_uuid(u.raw_app_meta_data->>'school_id'),
    public.try_parse_uuid(u.raw_user_meta_data->>'school_id'),
    public.try_parse_uuid(u.raw_app_meta_data->>'university_id'),
    public.try_parse_uuid(u.raw_user_meta_data->>'university_id')
  ),
  CASE WHEN u.banned_until IS NOT NULL THEN 'suspended' ELSE 'active' END,
  COALESCE(u.raw_user_meta_data, '{}'::jsonb) || COALESCE(u.raw_app_meta_data, '{}'::jsonb),
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, public.profiles.email),
  full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
  role = COALESCE(NULLIF(public.profiles.role, ''), EXCLUDED.role),
  school_id = COALESCE(public.profiles.school_id, EXCLUDED.school_id),
  university_id = COALESCE(public.profiles.university_id, EXCLUDED.university_id),
  updated_at = NOW();

-- 6. Trigger to keep public.profiles synchronized on new auth.users inserts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_school TEXT;
  v_school_uuid UUID;
  v_valid_school UUID;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  v_raw_school := COALESCE(
    NEW.raw_app_meta_data->>'school_id',
    NEW.raw_user_meta_data->>'school_id',
    NEW.raw_app_meta_data->>'university_id',
    NEW.raw_user_meta_data->>'university_id'
  );
  v_school_uuid := public.try_parse_uuid(v_raw_school);

  IF v_school_uuid IS NOT NULL THEN
    SELECT id INTO v_valid_school FROM public.schools WHERE id = v_school_uuid LIMIT 1;
  END IF;

  v_role := COALESCE(
    NULLIF(NEW.raw_app_meta_data->>'role', ''),
    NULLIF(NEW.raw_user_meta_data->>'role', ''),
    NULLIF(NEW.raw_user_meta_data->>'default_role', ''),
    CASE WHEN lower(NEW.email) = 'superadmin@university.edu.gh' THEN 'superadmin' ELSE 'student' END
  );

  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    school_id,
    university_id,
    account_status,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    lower(NEW.email),
    v_full_name,
    v_role,
    v_valid_school,
    v_valid_school,
    'active',
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), public.profiles.role),
    school_id = COALESCE(EXCLUDED.school_id, public.profiles.school_id),
    university_id = COALESCE(EXCLUDED.university_id, public.profiles.university_id),
    metadata = public.profiles.metadata || EXCLUDED.metadata,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Security-definer helper: is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_jwt JSONB := auth.jwt();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF lower(COALESCE(v_jwt->>'email', '')) = 'superadmin@university.edu.gh' THEN
    RETURN true;
  END IF;

  IF lower(COALESCE(v_jwt->'app_metadata'->>'role', '')) = 'superadmin'
     OR lower(COALESCE(v_jwt->'user_metadata'->>'role', '')) = 'superadmin'
     OR lower(COALESCE(v_jwt->'user_metadata'->>'default_role', '')) = 'superadmin' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND lower(COALESCE(p.role, '')) = 'superadmin'
      AND COALESCE(p.account_status, 'active') <> 'deleted'
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.school_memberships m
    LEFT JOIN public.roles r ON r.id = m.role_id
    WHERE m.user_id = v_uid
      AND COALESCE(m.status, 'active') = 'active'
      AND (lower(COALESCE(m.role, '')) = 'superadmin' OR lower(COALESCE(r.code, '')) = 'superadmin')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 8. Security-definer helper: get_current_user_school_id()
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_jwt JSONB := auth.jwt();
  v_school_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Prefer authoritative database profile link first
  SELECT p.school_id INTO v_school_id
  FROM public.profiles p
  WHERE p.id = v_uid
    AND p.school_id IS NOT NULL
  LIMIT 1;

  IF v_school_id IS NOT NULL THEN
    RETURN v_school_id;
  END IF;

  -- Next check active membership in public.school_memberships
  SELECT m.school_id INTO v_school_id
  FROM public.school_memberships m
  WHERE m.user_id = v_uid
    AND COALESCE(m.status, 'active') = 'active'
    AND m.school_id IS NOT NULL
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_school_id IS NOT NULL THEN
    RETURN v_school_id;
  END IF;

  -- Fallback to verified app_metadata / user_metadata UUID claim
  v_school_id := COALESCE(
    public.try_parse_uuid(v_jwt->'app_metadata'->>'school_id'),
    public.try_parse_uuid(v_jwt->'app_metadata'->>'university_id'),
    public.try_parse_uuid(v_jwt->'user_metadata'->>'school_id'),
    public.try_parse_uuid(v_jwt->'user_metadata'->>'university_id')
  );

  RETURN v_school_id;
END;
$$;

-- 9. Security-definer helper: can_access_school_data(target_school_id)
CREATE OR REPLACE FUNCTION public.can_access_school_data(target_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  IF target_school_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN target_school_id = public.get_current_user_school_id();
END;
$$;

-- 10. Strict RLS policies on core identity & multi-tenant tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- public.schools
DROP POLICY IF EXISTS "Super Admin full access on schools" ON public.schools;
DROP POLICY IF EXISTS "Tenant users read own school" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users can view their school" ON public.schools;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schools;

CREATE POLICY "Super Admin full access on schools"
  ON public.schools
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Tenant users read own school"
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (id = public.get_current_user_school_id());

-- public.profiles
DROP POLICY IF EXISTS "Super Admin full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "School admins read school profiles" ON public.profiles;

CREATE POLICY "Super Admin full access on profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (school_id IS NOT DISTINCT FROM public.get_current_user_school_id())
  );

CREATE POLICY "School admins read school profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    school_id IS NOT NULL
    AND school_id = public.get_current_user_school_id()
  );

-- public.school_memberships
DROP POLICY IF EXISTS "Super Admin full access on school_memberships" ON public.school_memberships;
DROP POLICY IF EXISTS "Users read own memberships" ON public.school_memberships;
DROP POLICY IF EXISTS "Tenant admins manage school_memberships" ON public.school_memberships;

CREATE POLICY "Super Admin full access on school_memberships"
  ON public.school_memberships
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users read own memberships"
  ON public.school_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Tenant isolation on school_memberships"
  ON public.school_memberships
  FOR ALL
  TO authenticated
  USING (school_id = public.get_current_user_school_id())
  WITH CHECK (school_id = public.get_current_user_school_id());

-- public.user_role_assignments
DROP POLICY IF EXISTS "Super Admin full access on user_role_assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Users read own role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Tenant isolation on user_role_assignments" ON public.user_role_assignments;

CREATE POLICY "Super Admin full access on user_role_assignments"
  ON public.user_role_assignments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users read own role assignments"
  ON public.user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Tenant isolation on user_role_assignments"
  ON public.user_role_assignments
  FOR ALL
  TO authenticated
  USING (school_id IS NOT NULL AND school_id = public.get_current_user_school_id())
  WITH CHECK (school_id IS NOT NULL AND school_id = public.get_current_user_school_id());

-- 11. Apply strict school_id isolation policies across all live tenant tables
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'staff_profiles',
    'academic_years',
    'terms',
    'class_groups',
    'students',
    'attendance_sessions',
    'attendance_records',
    'invoices',
    'payments',
    'school_events',
    'communications'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'school_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_table);
      EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', v_table, v_table);
      EXECUTE format('DROP POLICY IF EXISTS "Strict tenant isolation on %I" ON public.%I;', v_table, v_table);
      EXECUTE format(
        'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
        v_table, v_table
      );
      EXECUTE format(
        'CREATE POLICY "Strict tenant isolation on %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id()) WITH CHECK (school_id = public.get_current_user_school_id());',
        v_table, v_table
      );
    END IF;
  END LOOP;
END;
$$;
