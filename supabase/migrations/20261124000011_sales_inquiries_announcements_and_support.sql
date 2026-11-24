-- =============================================================================
-- Migration: Public Sales/Demo Inquiries, Platform Announcements & School Support
-- Safe & Idempotent: Additive only; zero existing data or columns touched.
-- =============================================================================

-- 1. Landing Page Leads & Inquiries (Request a Demo + Chat with Sales)
CREATE TABLE IF NOT EXISTS public.sales_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT,
  inquiry_type TEXT NOT NULL
    CHECK (inquiry_type IN ('demo_request', 'sales_chat')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL DEFAULT 'other'
    CHECK (school_type IN ('university', 'high_school', 'vocational', 'other')),
  estimated_students TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  topic TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'in_progress', 'contacted', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_inquiries_status_created
  ON public.sales_inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_inquiries_type_created
  ON public.sales_inquiries (inquiry_type, created_at DESC);

ALTER TABLE public.sales_inquiries ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.sales_inquiries TO service_role;
GRANT INSERT ON public.sales_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.sales_inquiries TO authenticated;

DROP POLICY IF EXISTS "Public insert sales_inquiries" ON public.sales_inquiries;
CREATE POLICY "Public insert sales_inquiries"
  ON public.sales_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) >= 2
    AND position('@' in email) > 1
    AND length(trim(school_name)) >= 2
    AND inquiry_type IN ('demo_request', 'sales_chat')
  );

DROP POLICY IF EXISTS "Super Admin manage sales_inquiries" ON public.sales_inquiries;
CREATE POLICY "Super Admin manage sales_inquiries"
  ON public.sales_inquiries
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 2. Platform-Wide / Targeted School Broadcast Announcements (Super Admin -> School Admins)
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high', 'urgent')),
  target_scope TEXT NOT NULL DEFAULT 'all'
    CHECK (target_scope IN ('all', 'school_type', 'specific_school')),
  target_school_type TEXT
    CHECK (target_school_type IS NULL OR target_school_type IN ('university', 'high_school', 'vocational')),
  target_school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  target_school_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_active_created
  ON public.platform_announcements (is_active, created_at DESC);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.platform_announcements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_announcements TO authenticated;

DROP POLICY IF EXISTS "Super Admin manage platform_announcements" ON public.platform_announcements;
CREATE POLICY "Super Admin manage platform_announcements"
  ON public.platform_announcements
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Tenant read targeted platform_announcements" ON public.platform_announcements;
CREATE POLICY "Tenant read targeted platform_announcements"
  ON public.platform_announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      target_scope = 'all'
      OR (target_scope = 'specific_school' AND target_school_id = public.get_current_user_school_id())
      OR (
        target_scope = 'school_type'
        AND EXISTS (
          SELECT 1
          FROM public.schools s
          WHERE s.id = public.get_current_user_school_id()
            AND (
              CASE
                WHEN lower(coalesce(s.school_type, 'university')) IN ('vocational', 'vocational_school') THEN 'vocational'
                ELSE lower(coalesce(s.school_type, 'university'))
              END
            ) = target_school_type
        )
      )
    )
  );

-- 3. Direct School Admin <-> Super Admin Support Messages
CREATE TABLE IF NOT EXISTS public.school_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  school_type TEXT,
  sender_user_id UUID,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Support',
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high', 'urgent')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'replied', 'resolved')),
  is_read_by_superadmin BOOLEAN NOT NULL DEFAULT false,
  superadmin_reply TEXT,
  replied_by TEXT,
  replied_at TIMESTAMPTZ,
  replies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_support_messages_school
  ON public.school_support_messages (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_support_messages_unread
  ON public.school_support_messages (status, is_read_by_superadmin, created_at DESC);

ALTER TABLE public.school_support_messages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.school_support_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_support_messages TO authenticated;

DROP POLICY IF EXISTS "Super Admin manage school_support_messages" ON public.school_support_messages;
CREATE POLICY "Super Admin manage school_support_messages"
  ON public.school_support_messages
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Tenant Admin read own school_support_messages" ON public.school_support_messages;
CREATE POLICY "Tenant Admin read own school_support_messages"
  ON public.school_support_messages
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  );

DROP POLICY IF EXISTS "Tenant Admin insert own school_support_messages" ON public.school_support_messages;
CREATE POLICY "Tenant Admin insert own school_support_messages"
  ON public.school_support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  );

DROP POLICY IF EXISTS "Tenant Admin update own school_support_messages" ON public.school_support_messages;
CREATE POLICY "Tenant Admin update own school_support_messages"
  ON public.school_support_messages
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  );
