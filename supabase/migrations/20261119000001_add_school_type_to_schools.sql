-- ==============================================================================
-- Migration: 20261119000001_add_school_type_to_schools.sql
-- Description: Add school_type column to public.schools table
-- Permitted values: 'university', 'high_school', 'vocational_school'
-- ==============================================================================

-- 1. Add school_type column to public.schools table
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'university'
CHECK (school_type IN ('university', 'high_school', 'vocational_school'));

-- 2. Add descriptive comment
COMMENT ON COLUMN public.schools.school_type IS 'Type of educational institution: university, high_school, or vocational_school';

-- 3. Add an index for fast filtering by school_type
CREATE INDEX IF NOT EXISTS idx_schools_school_type ON public.schools(school_type);

-- 4. Backfill any existing records to default 'university' if NULL
UPDATE public.schools
SET school_type = 'university'
WHERE school_type IS NULL;

-- 5. Safe check for universities table (only runs if universities table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'universities'
    ) THEN
        EXECUTE 'ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT ''university'' CHECK (school_type IN (''university'', ''high_school'', ''vocational_school''))';
    END IF;
END $$;
