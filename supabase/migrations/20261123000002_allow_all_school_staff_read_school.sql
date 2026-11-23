-- ============================================================================
-- Migration: 20261123000002_allow_all_school_staff_read_school.sql
-- Purpose:
--   Ensure any authenticated school staff member (finance_officer, bursar,
--   accountant, lecturer, teacher, registrar, student, parent, etc.) whose
--   profile, school_membership, or staff_profile matches `schools.id` can
--   SELECT their own school's name and metadata under Postgres RLS.
-- ============================================================================

-- 1. Include public.staff_profiles in get_current_user_school_id()
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

  -- Next check public.staff_profiles link
  SELECT sp.school_id INTO v_school_id
  FROM public.staff_profiles sp
  WHERE sp.user_id = v_uid
    AND sp.school_id IS NOT NULL
  ORDER BY sp.created_at DESC
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

-- 2. Guarantee baseline table privileges for authenticated Supabase clients
GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.school_memberships TO authenticated;
GRANT SELECT ON public.staff_profiles TO authenticated;

-- 3. Replace restrictive schools SELECT policies with inclusive member-wide tenant read policy
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users read own school" ON public.schools;
DROP POLICY IF EXISTS "Authenticated school members read own school" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users can view their school" ON public.schools;
DROP POLICY IF EXISTS "School admins read own school" ON public.schools;

CREATE POLICY "Authenticated school members read own school"
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = public.get_current_user_school_id()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.school_id = schools.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.school_memberships m
      WHERE m.user_id = auth.uid()
        AND m.school_id = schools.id
        AND COALESCE(m.status, 'active') = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid()
        AND sp.school_id = schools.id
    )
  );

-- 4. Allow staff members to read their own staff_profiles row directly
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own staff profile" ON public.staff_profiles;

CREATE POLICY "Users read own staff profile"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
