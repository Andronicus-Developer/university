-- ============================================================================
-- Migration: 20261124000007_parent_guardians_sync_and_backfill.sql
-- Purpose:
--   1. Make `public.students.gender` and `public.parent_guardians.phone`
--      safely defaulted / nullable so student & parent writes never fail
--      silently on missing gender or blank phone.
--   2. Create `public.parent_guardian_students` join table so siblings can
--      cleanly share one `parent_guardians` record without duplicate email
--      or FK conflicts.
--   3. Reinforce RLS policies on `parent_guardians`,
--      `parent_guardian_students`, and `profiles` so School Admins can view/CRUD
--      all parents and profiles belonging to their `school_id`, Parents can view
--      their own record, and Students can view linked guardians.
--   4. Idempotently backfill existing students and embedded guardians into
--      `public.students`, `public.parent_guardians`, and
--      `public.parent_guardian_students`.
-- ============================================================================

-- 1. Relax `public.students.gender` with a safe default `'other'`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.students ALTER COLUMN gender DROP NOT NULL;
    ALTER TABLE public.students ALTER COLUMN gender SET DEFAULT 'other';
  END IF;
END $$;

-- 2. Relax `public.parent_guardians.phone` and widen relationship CHECK
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'parent_guardians' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.parent_guardians ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE public.parent_guardians ALTER COLUMN phone SET DEFAULT '';
  END IF;

  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'parent_guardians'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%relationship%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.parent_guardians DROP CONSTRAINT IF EXISTS %I;', v_conname);
  END IF;

  ALTER TABLE public.parent_guardians
    ADD CONSTRAINT parent_guardians_relationship_check
    CHECK (relationship IN ('Mother', 'Father', 'Guardian', 'Sponsor', 'Parent', 'Next of Kin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_parent_guardians_school_email_lower
  ON public.parent_guardians (school_id, lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE INDEX IF NOT EXISTS idx_parent_guardians_school_phone
  ON public.parent_guardians (school_id, phone)
  WHERE phone IS NOT NULL AND btrim(phone) <> '';

-- 3. Multi-student / Sibling join table: `public.parent_guardian_students`
CREATE TABLE IF NOT EXISTS public.parent_guardian_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_guardian_id UUID NOT NULL REFERENCES public.parent_guardians(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'Parent',
  is_primary_contact BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, parent_guardian_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_pgs_school_id
  ON public.parent_guardian_students (school_id);
CREATE INDEX IF NOT EXISTS idx_pgs_parent_guardian_id
  ON public.parent_guardian_students (parent_guardian_id);
CREATE INDEX IF NOT EXISTS idx_pgs_student_id
  ON public.parent_guardian_students (student_id);

-- 4. Ensure RLS helper functions exist for standalone migration safety
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

-- 5. Enforce RLS Policies on `parent_guardians`, `parent_guardian_students`, & `profiles`
ALTER TABLE public.parent_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_guardian_students ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.parent_guardians TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_guardians TO authenticated;

GRANT ALL ON public.parent_guardian_students TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_guardian_students TO authenticated;

-- parent_guardians policies
DROP POLICY IF EXISTS "Super Admin full access on parent_guardians" ON public.parent_guardians;
CREATE POLICY "Super Admin full access on parent_guardians"
  ON public.parent_guardians
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "School Admin CRUD own school parent_guardians" ON public.parent_guardians;
CREATE POLICY "School Admin CRUD own school parent_guardians"
  ON public.parent_guardians
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

DROP POLICY IF EXISTS "Staff and Admin SELECT own school parent_guardians" ON public.parent_guardians;
CREATE POLICY "Staff and Admin SELECT own school parent_guardians"
  ON public.parent_guardians
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

DROP POLICY IF EXISTS "Parent SELECT own record" ON public.parent_guardians;
CREATE POLICY "Parent SELECT own record"
  ON public.parent_guardians
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Student SELECT own parent_guardians" ON public.parent_guardians;
CREATE POLICY "Student SELECT own parent_guardians"
  ON public.parent_guardians
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND (
      student_id = public.get_current_student_id()
      OR EXISTS (
        SELECT 1
        FROM public.parent_guardian_students pgs
        WHERE pgs.parent_guardian_id = public.parent_guardians.id
          AND pgs.school_id = public.parent_guardians.school_id
          AND pgs.student_id = public.get_current_student_id()
      )
    )
  );

-- parent_guardian_students policies
DROP POLICY IF EXISTS "Super Admin full access on parent_guardian_students" ON public.parent_guardian_students;
CREATE POLICY "Super Admin full access on parent_guardian_students"
  ON public.parent_guardian_students
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "School Admin CRUD own school parent_guardian_students" ON public.parent_guardian_students;
CREATE POLICY "School Admin CRUD own school parent_guardian_students"
  ON public.parent_guardian_students
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

DROP POLICY IF EXISTS "Parent SELECT own parent_guardian_students" ON public.parent_guardian_students;
CREATE POLICY "Parent SELECT own parent_guardian_students"
  ON public.parent_guardian_students
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND EXISTS (
      SELECT 1
      FROM public.parent_guardians pg
      WHERE pg.id = public.parent_guardian_students.parent_guardian_id
        AND pg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Student SELECT own parent_guardian_students" ON public.parent_guardian_students;
CREATE POLICY "Student SELECT own parent_guardian_students"
  ON public.parent_guardian_students
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND student_id = public.get_current_student_id()
  );

-- Reinforce School Admin SELECT access on `public.profiles` for parents & students in same school_id
DROP POLICY IF EXISTS "School admins read school profiles" ON public.profiles;
CREATE POLICY "School admins read school profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    school_id IS NOT NULL
    AND school_id = public.get_current_user_school_id()
  );

-- 6. Idempotent SQL Backfill
-- A) Ensure any student profile in `public.profiles` missing from `public.students` is synced
DO $$
DECLARE
  p_rec RECORD;
  v_first TEXT;
  v_last TEXT;
  v_meta JSONB;
  v_stu_num TEXT;
  v_stu_id UUID;
BEGIN
  FOR p_rec IN
    SELECT p.*
    FROM public.profiles p
    WHERE lower(COALESCE(p.role, '')) = 'student'
      AND p.school_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.school_id = p.school_id
          AND (s.profile_id = p.id OR lower(COALESCE(s.email, '')) = lower(COALESCE(p.email, '')))
      )
  LOOP
    v_meta := COALESCE(p_rec.metadata->'student_profile', '{}'::jsonb);
    v_first := COALESCE(NULLIF(split_part(COALESCE(p_rec.full_name, ''), ' ', 1), ''), 'Student');
    v_last := COALESCE(
      NULLIF(btrim(substring(COALESCE(p_rec.full_name, '') FROM position(' ' IN COALESCE(p_rec.full_name, '')) + 1)), ''),
      '-'
    );
    IF position(' ' IN COALESCE(btrim(p_rec.full_name), '')) = 0 THEN
      v_last := '';
    END IF;
    v_stu_num := COALESCE(
      NULLIF(btrim(v_meta->>'student_number'), ''),
      'STU-' || upper(left(p_rec.id::text, 8))
    );

    INSERT INTO public.students (
      id,
      school_id,
      profile_id,
      student_number,
      first_name,
      last_name,
      email,
      phone,
      gender,
      status,
      metadata
    ) VALUES (
      p_rec.id,
      p_rec.school_id,
      p_rec.id,
      v_stu_num,
      v_first,
      v_last,
      p_rec.email,
      p_rec.phone,
      COALESCE(NULLIF(lower(v_meta->>'gender'), ''), 'other'),
      'active',
      v_meta
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- B) Backfill `public.parent_guardians` from embedded guardian fields on `public.students`
--    and deduplicate within each school_id, linking `public.parent_guardian_students`
DO $$
DECLARE
  s_rec RECORD;
  v_gname TEXT;
  v_gemail TEXT;
  v_gphone TEXT;
  v_grel TEXT;
  v_pg_id UUID;
  v_p_user_id UUID;
BEGIN
  FOR s_rec IN
    SELECT s.id AS student_id, s.school_id, s.metadata
    FROM public.students s
    WHERE s.school_id IS NOT NULL
      AND NULLIF(btrim(COALESCE(s.metadata->>'guardian_name', s.metadata->>'parent_name', s.metadata->>'next_of_kin_name', '')), '') IS NOT NULL
  LOOP
    v_gname := btrim(COALESCE(s_rec.metadata->>'guardian_name', s_rec.metadata->>'parent_name', s_rec.metadata->>'next_of_kin_name', ''));
    v_gemail := lower(NULLIF(btrim(COALESCE(s_rec.metadata->>'guardian_email', s_rec.metadata->>'parent_email', '')), ''));
    v_gphone := COALESCE(btrim(COALESCE(s_rec.metadata->>'guardian_phone', s_rec.metadata->>'parent_phone', s_rec.metadata->>'next_of_kin_phone', '')), '');
    v_grel := COALESCE(NULLIF(btrim(COALESCE(s_rec.metadata->>'guardian_relationship', s_rec.metadata->>'parent_relationship', '')), ''), 'Parent');
    IF v_grel NOT IN ('Mother', 'Father', 'Guardian', 'Sponsor', 'Parent', 'Next of Kin') THEN
      v_grel := 'Guardian';
    END IF;

    v_p_user_id := NULL;
    IF v_gemail IS NOT NULL THEN
      SELECT pr.id INTO v_p_user_id
      FROM public.profiles pr
      WHERE pr.school_id = s_rec.school_id
        AND lower(COALESCE(pr.email, '')) = v_gemail
        AND lower(COALESCE(pr.role, '')) = 'parent'
      LIMIT 1;
    END IF;

    v_pg_id := NULL;
    IF v_gemail IS NOT NULL THEN
      SELECT pg.id INTO v_pg_id
      FROM public.parent_guardians pg
      WHERE pg.school_id = s_rec.school_id
        AND lower(COALESCE(pg.email, '')) = v_gemail
      LIMIT 1;
    END IF;

    IF v_pg_id IS NULL AND v_gphone <> '' THEN
      SELECT pg.id INTO v_pg_id
      FROM public.parent_guardians pg
      WHERE pg.school_id = s_rec.school_id
        AND btrim(COALESCE(pg.phone, '')) = v_gphone
      LIMIT 1;
    END IF;

    IF v_pg_id IS NULL THEN
      INSERT INTO public.parent_guardians (
        school_id,
        user_id,
        full_name,
        email,
        phone,
        relationship,
        student_id,
        is_primary_contact,
        status
      ) VALUES (
        s_rec.school_id,
        v_p_user_id,
        v_gname,
        v_gemail,
        v_gphone,
        v_grel,
        s_rec.student_id,
        true,
        'active'
      )
      RETURNING id INTO v_pg_id;
    ELSE
      UPDATE public.parent_guardians
      SET
        user_id = COALESCE(user_id, v_p_user_id),
        email = COALESCE(NULLIF(btrim(email), ''), v_gemail),
        phone = CASE WHEN btrim(COALESCE(phone, '')) = '' THEN v_gphone ELSE phone END,
        student_id = COALESCE(student_id, s_rec.student_id),
        updated_at = now()
      WHERE id = v_pg_id;
    END IF;

    IF v_pg_id IS NOT NULL THEN
      INSERT INTO public.parent_guardian_students (
        school_id,
        parent_guardian_id,
        student_id,
        relationship,
        is_primary_contact
      ) VALUES (
        s_rec.school_id,
        v_pg_id,
        s_rec.student_id,
        v_grel,
        true
      )
      ON CONFLICT (school_id, parent_guardian_id, student_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Also mirror any direct parent_guardians.student_id rows into parent_guardian_students
  INSERT INTO public.parent_guardian_students (
    school_id,
    parent_guardian_id,
    student_id,
    relationship,
    is_primary_contact
  )
  SELECT
    pg.school_id,
    pg.id,
    pg.student_id,
    pg.relationship,
    pg.is_primary_contact
  FROM public.parent_guardians pg
  WHERE pg.student_id IS NOT NULL
  ON CONFLICT (school_id, parent_guardian_id, student_id) DO NOTHING;
END $$;
