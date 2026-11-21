-- =============================================================================
-- Migration: 20261121000001_multi_tenant_saas_isolation.sql
-- Purpose: Upgrade the database to a Multi-Tenant SaaS architecture with strict
--          per-school data isolation (`school_id`) and Row-Level Security (RLS)
--          so users of School A can ONLY access School A's data.
-- =============================================================================

-- 1. Add SaaS Subscription & Tenant Metadata columns to `public.schools` (and `public.universities` if present)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'schools'
    ) THEN
        ALTER TABLE public.schools
            ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'enterprise'
                CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
            ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
                CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'suspended', 'cancelled')),
            ADD COLUMN IF NOT EXISTS tenant_slug TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'universities'
    ) THEN
        ALTER TABLE public.universities
            ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'enterprise'
                CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
            ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
                CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'suspended', 'cancelled')),
            ADD COLUMN IF NOT EXISTS tenant_slug TEXT;
    END IF;
END $$;

-- 2. Add `school_id UUID` to all tenant-scoped tables in `public`
DO $$
DECLARE
    tbl TEXT;
    tenant_tables TEXT[] := ARRAY[
        'profiles',
        'user_role_assignments',
        'campuses',
        'faculties',
        'departments',
        'programmes',
        'academic_years',
        'terms',
        'courses',
        'course_offerings',
        'staff',
        'employment_records',
        'teaching_assignments',
        'students',
        'course_enrolments',
        'assessment_components',
        'assessment_marks',
        'published_results',
        'grade_scales',
        'grade_scale_items',
        'fee_items',
        'fee_schedules',
        'student_invoices',
        'invoice_lines',
        'payments',
        'payment_allocations',
        'receipts',
        'scholarships',
        'waivers',
        'refund_requests',
        'financial_approvals',
        'settlement_batches',
        'buildings',
        'rooms',
        'timetable_events',
        'timetable_publications',
        'class_sessions',
        'attendance_records',
        'attendance_amendments',
        'leave_requests',
        'announcements',
        'notifications',
        'generated_documents',
        'service_requests',
        'audit_events',
        'residences',
        'hostel_rooms',
        'beds',
        'allocations',
        'maintenance_requests',
        'library_items',
        'item_copies',
        'loans',
        'transport_routes',
        'transport_vehicles',
        'admission_cycles',
        'applications',
        'application_programmes',
        'application_reviews',
        'admission_decisions',
        'offers',
        'support_cases',
        'result_submissions',
        'result_approvals',
        'result_amendments',
        'curriculum_requirements',
        'prerequisites',
        'enrolment_overrides',
        'student_programme_history',
        'student_status_history',
        'institutional_reports'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS school_id UUID;', tbl);
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I (school_id);', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- 3. Helper Function: Resolve the authenticated user's `school_id`
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id UUID;
    v_jwt_school TEXT;
BEGIN
    -- 1. Check JWT user_metadata / app_metadata first
    v_jwt_school := COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'school_id',
        auth.jwt() -> 'app_metadata' ->> 'university_id',
        auth.jwt() -> 'user_metadata' ->> 'school_id',
        auth.jwt() -> 'user_metadata' ->> 'university_id'
    );

    IF v_jwt_school IS NOT NULL AND v_jwt_school ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN v_jwt_school::uuid;
    END IF;

    -- 2. Look up from public.profiles
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        SELECT COALESCE(
            p.school_id,
            CASE
                WHEN (p.metadata ->> 'school_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN (p.metadata ->> 'school_id')::uuid
                WHEN (p.metadata ->> 'university_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN (p.metadata ->> 'university_id')::uuid
                ELSE NULL
            END
        )
        INTO v_school_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
        LIMIT 1;
    END IF;

    RETURN v_school_id;
END;
$$;

-- 4. Helper Function: Check if current user can access a row's `school_id`
CREATE OR REPLACE FUNCTION public.can_access_school_data(target_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Service role has unrestricted backend access
    IF auth.role() = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- Super Admin has cross-tenant governance access
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'has_role'
    ) THEN
        IF public.has_role('superadmin') THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Regular tenant users can ONLY access rows matching their own school_id
    IF target_school_id IS NOT NULL AND target_school_id = public.get_current_user_school_id() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 5. Trigger Function: Automatically stamp `NEW.school_id` on INSERT if omitted by tenant user
CREATE OR REPLACE FUNCTION public.set_row_tenant_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.school_id IS NULL THEN
        NEW.school_id := public.get_current_user_school_id();
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Apply Multi-Tenant RLS Isolation Policies & Triggers across all existing tenant tables
DO $$
DECLARE
    tbl TEXT;
    tenant_tables TEXT[] := ARRAY[
        'campuses',
        'faculties',
        'departments',
        'programmes',
        'academic_years',
        'terms',
        'courses',
        'course_offerings',
        'staff',
        'employment_records',
        'teaching_assignments',
        'students',
        'course_enrolments',
        'assessment_components',
        'assessment_marks',
        'published_results',
        'grade_scales',
        'grade_scale_items',
        'fee_items',
        'fee_schedules',
        'student_invoices',
        'invoice_lines',
        'payments',
        'payment_allocations',
        'receipts',
        'scholarships',
        'waivers',
        'refund_requests',
        'financial_approvals',
        'settlement_batches',
        'buildings',
        'rooms',
        'timetable_events',
        'timetable_publications',
        'class_sessions',
        'attendance_records',
        'attendance_amendments',
        'leave_requests',
        'announcements',
        'notifications',
        'generated_documents',
        'service_requests',
        'residences',
        'hostel_rooms',
        'beds',
        'allocations',
        'maintenance_requests',
        'library_items',
        'item_copies',
        'loans',
        'transport_routes',
        'transport_vehicles',
        'admission_cycles',
        'applications',
        'application_programmes',
        'application_reviews',
        'admission_decisions',
        'offers',
        'support_cases',
        'result_submissions',
        'result_approvals',
        'result_amendments',
        'curriculum_requirements',
        'prerequisites',
        'enrolment_overrides',
        'student_programme_history',
        'student_status_history',
        'institutional_reports'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

            -- Drop old policy if re-running migration
            EXECUTE format('DROP POLICY IF EXISTS saas_tenant_isolation_policy ON public.%I;', tbl);

            -- Create strict Multi-Tenant RLS policy
            EXECUTE format(
                'CREATE POLICY saas_tenant_isolation_policy ON public.%I
                 FOR ALL
                 USING (public.can_access_school_data(school_id))
                 WITH CHECK (public.can_access_school_data(school_id));',
                tbl
            );

            -- Attach BEFORE INSERT trigger to auto-stamp school_id
            EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_school_id ON public.%I;', tbl);
            EXECUTE format(
                'CREATE TRIGGER trg_set_tenant_school_id
                 BEFORE INSERT ON public.%I
                 FOR EACH ROW
                 EXECUTE FUNCTION public.set_row_tenant_school_id();',
                tbl
            );
        END IF;
    END LOOP;
END $$;
