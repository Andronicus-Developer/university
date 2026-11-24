-- =============================================================================
-- Safe, Additive Schema Extensions for School-Type Personalized Forms
-- Preserves all existing core columns and adds nullable / JSONB metadata columns
-- for University, High School, and Vocational records.
-- =============================================================================

-- 1. Extend public.students with term tracking and structured type-specific metadata
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS entry_term_id uuid,
  ADD COLUMN IF NOT EXISTS cohort_year integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_students_school_entry_term
  ON public.students (school_id, entry_term_id);

-- 2. Extend public.staff_profiles with structured employment & type-specific metadata
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS role_code text,
  ADD COLUMN IF NOT EXISTS salary_grade text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_staff_profiles_school_dept
  ON public.staff_profiles (school_id, department_id);

-- 3. Extend public.subjects with Academic Term link and structured metadata
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES public.terms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_subjects_school_term
  ON public.subjects (school_id, term_id);

-- 4. Extend public.fee_structures with structured school-type fee metadata
ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
