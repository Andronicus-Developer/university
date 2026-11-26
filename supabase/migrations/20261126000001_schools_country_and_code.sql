-- Additive migration: add standardized country & 2-letter ISO country_code columns to public.schools
-- Safe for live rows; idempotent and backward-compatible.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT;

CREATE INDEX IF NOT EXISTS idx_schools_country_code
  ON public.schools (country_code);

-- Backfill common existing country values if country or address already identifies Ghana
UPDATE public.schools
SET
  country = 'Ghana',
  country_code = 'GH'
WHERE (country_code IS NULL OR btrim(country_code) = '')
  AND (
    lower(btrim(coalesce(country, ''))) IN ('ghana', 'gh', 'republic of ghana')
    OR lower(coalesce(address, '')) LIKE '%ghana%'
  );

-- Normalize country_code uppercase when already present
UPDATE public.schools
SET country_code = upper(btrim(country_code))
WHERE country_code IS NOT NULL
  AND country_code <> upper(btrim(country_code));

COMMENT ON COLUMN public.schools.country IS 'Standardized school country name (e.g., Ghana, Nigeria, Kenya, Other (Outside Africa))';
COMMENT ON COLUMN public.schools.country_code IS 'Uppercase 2-letter ISO-3166-1 alpha-2 country code (e.g., GH, NG, KE) or OTHER';
