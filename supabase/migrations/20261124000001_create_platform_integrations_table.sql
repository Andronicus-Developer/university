-- ============================================================================
-- Migration: 20261124000001_create_platform_integrations_table.sql
-- Purpose:
--   Create `public.platform_integrations` to store Super Admin external API
--   and integration configurations (non-secret `config` JSONB + server-masked
--   `secrets` JSONB), protected by RLS for platform Super Admins and
--   service_role mutations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Custom',
  description TEXT NOT NULL DEFAULT '',
  is_custom BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('live', 'test')),
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('connected', 'not_configured', 'disabled')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secrets JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_integrations_slug
  ON public.platform_integrations (slug);

ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.platform_integrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_integrations TO authenticated;

DROP POLICY IF EXISTS "Super Admin full access on platform_integrations"
  ON public.platform_integrations;

CREATE POLICY "Super Admin full access on platform_integrations"
  ON public.platform_integrations
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
