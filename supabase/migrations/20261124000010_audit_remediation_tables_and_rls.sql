-- =============================================================================
-- Migration: Full-Project Audit Remediation — Tenant-Scoped Tables & Strict RLS
-- Safe & Idempotent: Additive only; zero existing data or columns touched.
-- =============================================================================

-- 1. Transport Routes & Fleet (School-scoped)
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_code TEXT NOT NULL,
  route_name TEXT NOT NULL,
  departure_location TEXT NOT NULL,
  arrival_location TEXT NOT NULL,
  departure_time TEXT DEFAULT '07:30',
  stops JSONB DEFAULT '[]'::jsonb,
  fare_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  bus_number TEXT DEFAULT 'Unassigned',
  model TEXT DEFAULT 'Standard Campus Shuttle',
  capacity INTEGER NOT NULL DEFAULT 40,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_status TEXT NOT NULL DEFAULT 'active'
    CHECK (vehicle_status IN ('active', 'maintenance', 'inactive')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_routes_school
  ON public.transport_routes(school_id, route_code);

-- 2. Staff Leave Requests (School-scoped)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_school_status
  ON public.leave_requests(school_id, status, created_at DESC);

-- 3. Library Catalog Items (School-scoped)
CREATE TABLE IF NOT EXISTS public.library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  publisher TEXT,
  publication_year INTEGER DEFAULT 2024,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_items_school
  ON public.library_items(school_id, title);

-- 4. Multi-Tenant & Platform Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'success',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created
  ON public.audit_logs(school_id, created_at DESC);

-- 5. Institutional Reports Snapshot Archive (School-scoped)
CREATE TABLE IF NOT EXISTS public.institutional_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'summary',
  period_label TEXT,
  summary TEXT,
  file_url TEXT,
  generated_by UUID,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institutional_reports_school
  ON public.institutional_reports(school_id, created_at DESC);

-- 6. User Notifications (School + User scoped)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_school_user
  ON public.user_notifications(school_id, user_id, is_read, created_at DESC);

-- 7. Strict RLS on all new tables & school_events
DO $$
DECLARE
  t TEXT;
  admin_ops_tables TEXT[] := ARRAY[
    'transport_routes',
    'leave_requests',
    'library_items',
    'institutional_reports'
  ];
BEGIN
  FOREACH t IN ARRAY admin_ops_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);

    EXECUTE format('DROP POLICY IF EXISTS "Super Admin full access on %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Super Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Staff and Admin manage own school %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Staff and Admin manage own school %I" ON public.%I FOR ALL TO authenticated USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin()) WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());',
      t, t
    );
  END LOOP;
END $$;

-- Library READ for students within own school
DROP POLICY IF EXISTS "Students SELECT own school library_items" ON public.library_items;
CREATE POLICY "Students SELECT own school library_items"
  ON public.library_items
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id());

-- Audit logs RLS (Super Admin sees all; School Admin/Staff read own school logs)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.audit_logs TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "Super Admin full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Super Admin full access on audit_logs"
  ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Staff and Admin SELECT own school audit_logs" ON public.audit_logs;
CREATE POLICY "Staff and Admin SELECT own school audit_logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_staff_or_admin()
  );

-- User Notifications RLS (own user within own school)
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;

DROP POLICY IF EXISTS "Super Admin full access on user_notifications" ON public.user_notifications;
CREATE POLICY "Super Admin full access on user_notifications"
  ON public.user_notifications
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "User manage own user_notifications" ON public.user_notifications;
CREATE POLICY "User manage own user_notifications"
  ON public.user_notifications
  FOR ALL
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    school_id = public.get_current_user_school_id()
    AND user_id = auth.uid()
  );

-- School Events: ensure students, parents, and staff within school_id can SELECT notices, and Staff/Admin can manage
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.school_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_events TO authenticated;

DROP POLICY IF EXISTS "Tenant authenticated SELECT school_events" ON public.school_events;
CREATE POLICY "Tenant authenticated SELECT school_events"
  ON public.school_events
  FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Staff and Admin manage own school school_events" ON public.school_events;
CREATE POLICY "Staff and Admin manage own school school_events"
  ON public.school_events
  FOR ALL
  TO authenticated
  USING (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin())
  WITH CHECK (school_id = public.get_current_user_school_id() AND public.is_school_staff_or_admin());
