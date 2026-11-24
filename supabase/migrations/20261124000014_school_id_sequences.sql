-- =============================================================================
-- Migration: 20261124000014_school_id_sequences.sql
-- Purpose:
--   1. Create `public.school_id_sequences` for per-school, per-entity custom ID
--      numbering formats and atomic sequence counters.
--   2. Apply strict multi-tenant RLS (`is_super_admin()` + `is_school_admin()` +
--      school member read access).
--   3. Create `public.generate_next_school_id(p_school_id, p_entity_type)` RPC
--      using row-level locking (`FOR UPDATE`) to prevent duplicate IDs under
--      concurrent creation or record deletion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.school_id_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'student',
      'trainee',
      'lecturer',
      'teacher',
      'instructor',
      'registrar',
      'finance',
      'staff'
    )
  ),
  prefix TEXT NOT NULL DEFAULT 'ID',
  separator TEXT NOT NULL DEFAULT '-' CHECK (separator IN ('-', '/', '')),
  include_year BOOLEAN NOT NULL DEFAULT true,
  year_format TEXT NOT NULL DEFAULT 'YYYY' CHECK (year_format IN ('YYYY', 'YY')),
  padding_length INTEGER NOT NULL DEFAULT 4 CHECK (padding_length BETWEEN 2 AND 8),
  next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_school_id_sequences_school_entity
  ON public.school_id_sequences (school_id, entity_type);

ALTER TABLE public.school_id_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_id_sequences_super_admin_all" ON public.school_id_sequences;
CREATE POLICY "school_id_sequences_super_admin_all"
  ON public.school_id_sequences
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "school_id_sequences_school_admin_all" ON public.school_id_sequences;
CREATE POLICY "school_id_sequences_school_admin_all"
  ON public.school_id_sequences
  FOR ALL
  TO authenticated
  USING (
    public.is_school_admin()
    AND school_id = public.get_current_user_school_id()
  )
  WITH CHECK (
    public.is_school_admin()
    AND school_id = public.get_current_user_school_id()
  );

DROP POLICY IF EXISTS "school_id_sequences_member_select" ON public.school_id_sequences;
CREATE POLICY "school_id_sequences_member_select"
  ON public.school_id_sequences
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());

CREATE OR REPLACE FUNCTION public.generate_next_school_id(
  p_school_id UUID,
  p_entity_type TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity TEXT := lower(trim(COALESCE(p_entity_type, 'staff')));
  v_default_prefix TEXT;
  v_seq RECORD;
  v_num INTEGER;
  v_sep TEXT;
  v_prefix TEXT;
  v_year_part TEXT := '';
  v_num_part TEXT;
  v_parts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_school_id IS NULL THEN
    RAISE EXCEPTION 'p_school_id cannot be null';
  END IF;

  v_default_prefix := CASE v_entity
    WHEN 'student' THEN 'STU'
    WHEN 'trainee' THEN 'TRN'
    WHEN 'lecturer' THEN 'LEC'
    WHEN 'teacher' THEN 'TCH'
    WHEN 'instructor' THEN 'INS'
    WHEN 'registrar' THEN 'REG'
    WHEN 'finance' THEN 'FIN'
    ELSE 'STF'
  END;

  IF v_entity NOT IN (
    'student',
    'trainee',
    'lecturer',
    'teacher',
    'instructor',
    'registrar',
    'finance',
    'staff'
  ) THEN
    v_entity := 'staff';
    v_default_prefix := 'STF';
  END IF;

  -- Ensure a sequence row exists before acquiring a row-level lock
  INSERT INTO public.school_id_sequences (
    school_id,
    entity_type,
    prefix,
    separator,
    include_year,
    year_format,
    padding_length,
    next_number
  ) VALUES (
    p_school_id,
    v_entity,
    v_default_prefix,
    '-',
    true,
    'YYYY',
    4,
    1
  )
  ON CONFLICT (school_id, entity_type) DO NOTHING;

  -- Row-level lock guarantees atomic, collision-free increment across concurrent callers
  SELECT *
    INTO v_seq
    FROM public.school_id_sequences
   WHERE school_id = p_school_id
     AND entity_type = v_entity
   FOR UPDATE;

  v_num := GREATEST(COALESCE(v_seq.next_number, 1), 1);

  UPDATE public.school_id_sequences
     SET next_number = v_num + 1,
         updated_at = now()
   WHERE id = v_seq.id;

  v_sep := COALESCE(v_seq.separator, '-');
  v_prefix := upper(trim(COALESCE(v_seq.prefix, '')));

  IF v_prefix <> '' THEN
    v_parts := array_append(v_parts, v_prefix);
  END IF;

  IF COALESCE(v_seq.include_year, true) THEN
    IF COALESCE(v_seq.year_format, 'YYYY') = 'YY' THEN
      v_year_part := to_char(CURRENT_DATE, 'YY');
    ELSE
      v_year_part := to_char(CURRENT_DATE, 'YYYY');
    END IF;
    v_parts := array_append(v_parts, v_year_part);
  END IF;

  v_num_part := lpad(v_num::TEXT, LEAST(GREATEST(COALESCE(v_seq.padding_length, 4), 2), 8), '0');
  v_parts := array_append(v_parts, v_num_part);

  RETURN upper(array_to_string(v_parts, v_sep));
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_next_school_id(UUID, TEXT) TO authenticated, service_role;
