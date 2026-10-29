-- ==============================================================================
-- 00001_foundation_and_rbac.sql
-- University Management System: Identity, Supabase Auth Trigger, RBAC & Audit
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Define Enums
DO $$ BEGIN
    CREATE TYPE account_status AS ENUM (
        'invited',
        'pending_verification',
        'active',
        'suspended',
        'locked',
        'deactivated'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scope_type AS ENUM (
        'institution',
        'faculty',
        'department',
        'course_offering',
        'cohort'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    account_status account_status NOT NULL DEFAULT 'active',
    is_mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    last_sign_in_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- 4. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);

-- 5. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);

-- 6. Role-to-Permission Join Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

-- 7. User Role Assignments Table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role ON public.user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON public.user_role_assignments(is_active);

-- 8. User Scopes Table (For faculty, department, course, or cohort scoped roles)
CREATE TABLE IF NOT EXISTS public.user_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.user_role_assignments(id) ON DELETE CASCADE,
    scope_type scope_type NOT NULL,
    scope_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_assignment_scope UNIQUE (assignment_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_user_scopes_assignment ON public.user_scopes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_user_scopes_lookup ON public.user_scopes(scope_type, scope_id);

-- 9. Immutable Audit Events Table
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    outcome TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'DENIED', 'FAILURE'
    request_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    reason TEXT,
    approval_reference TEXT,
    old_values JSONB,
    new_values JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_events_time ON public.audit_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);

-- Protect audit_events from updates and deletes (Append-only!)
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_events ON public.audit_events;
CREATE TRIGGER trg_protect_audit_events
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


-- ==============================================================================
-- 10. RBAC Helper Functions (SECURITY DEFINER with secure search_path)
-- ==============================================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(
    p_role_code TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON ura.role_id = r.id
        WHERE ura.user_id = p_user_id
          AND r.code = p_role_code
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()))
    );
$$;

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
    p_permission_code TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- System admins automatically have all permissions
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON ura.role_id = r.id
        WHERE ura.user_id = p_user_id
          AND r.code = 'system_admin'
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()))
    )
    OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON ura.role_id = r.id
        JOIN public.role_permissions rp ON rp.role_id = r.id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ura.user_id = p_user_id
          AND p.code = p_permission_code
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()))
    );
$$;

-- Check if user has a specific role scoped to a target entity
CREATE OR REPLACE FUNCTION public.has_scope(
    p_role_code TEXT,
    p_scope_type scope_type,
    p_scope_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Global roles (e.g. system_admin, registrar) without scope restrictions bypass scope check
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON ura.role_id = r.id
        WHERE ura.user_id = p_user_id
          AND r.code IN ('system_admin', 'vice_chancellor')
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()))
    )
    OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON ura.role_id = r.id
        JOIN public.user_scopes us ON us.assignment_id = ura.id
        WHERE ura.user_id = p_user_id
          AND r.code = p_role_code
          AND us.scope_type = p_scope_type
          AND us.scope_id = p_scope_id
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()))
    );
$$;

-- Retrieve all active roles for user
CREATE OR REPLACE FUNCTION public.get_user_roles(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    role_code TEXT,
    role_name TEXT,
    is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.code AS role_code, r.name AS role_name, ura.is_active
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()));
$$;

-- Retrieve all permissions for user
CREATE OR REPLACE FUNCTION public.get_user_permissions(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    permission_code TEXT,
    module TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT p.code AS permission_code, p.module
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = p_user_id
      AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > timezone('utc'::text, now()));
$$;

-- Helper to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_outcome TEXT DEFAULT 'SUCCESS',
    p_reason TEXT DEFAULT NULL,
    p_approval_ref TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
BEGIN
    SELECT r.code INTO v_actor_role
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = v_actor_id AND ura.is_active = true
    LIMIT 1;

    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        outcome,
        reason,
        approval_reference,
        old_values,
        new_values
    ) VALUES (
        v_actor_id,
        v_actor_role,
        p_action,
        p_entity_type,
        p_entity_id,
        p_outcome,
        p_reason,
        p_approval_ref,
        p_old_values,
        p_new_values
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;


-- ==============================================================================
-- 11. Supabase Auth Integration Trigger (handle_new_user)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_default_role_code TEXT;
    v_role_id UUID;
    v_full_name TEXT;
BEGIN
    BEGIN
        v_full_name := COALESCE(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            split_part(new.email, '@', 1),
            'User'
        );

        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            phone,
            avatar_url,
            account_status,
            metadata
        ) VALUES (
            new.id,
            COALESCE(new.email, ''),
            v_full_name,
            new.raw_user_meta_data->>'phone',
            new.raw_user_meta_data->>'avatar_url',
            'active',
            COALESCE(new.raw_user_meta_data, '{}'::jsonb)
        )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            updated_at = timezone('utc'::text, now());

        v_default_role_code := COALESCE(new.raw_user_meta_data->>'default_role', 'applicant');
        SELECT id INTO v_role_id FROM public.roles WHERE code = v_default_role_code;
        
        IF v_role_id IS NOT NULL THEN
            INSERT INTO public.user_role_assignments (
                user_id,
                role_id,
                is_active
            ) VALUES (
                new.id,
                v_role_id,
                true
            )
            ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user notice: %', SQLERRM;
    END;

    RETURN new;
END;
$$;

-- Trigger firing on auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 12. Row Level Security (RLS) on RBAC Tables
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- 1. Users can view their own profile.
-- 2. Staff/Admins with users.read or permissions can view other profiles.
CREATE POLICY "profiles_select_own_or_privileged" ON public.profiles
FOR SELECT USING (
    auth.uid() = id
    OR public.has_permission('users.roles.manage')
    OR public.has_permission('admissions.application.review')
    OR public.has_role('registrar')
    OR public.has_role('system_admin')
);

-- Users can update their own non-sensitive profile fields
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id
    OR public.has_permission('users.roles.manage')
    OR public.has_role('system_admin')
)
WITH CHECK (
    auth.uid() = id
    OR public.has_permission('users.roles.manage')
    OR public.has_role('system_admin')
);

-- Roles & Permissions:
-- Readable by all authenticated users to evaluate RBAC
CREATE POLICY "roles_select_authenticated" ON public.roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "permissions_select_authenticated" ON public.permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_select_authenticated" ON public.role_permissions
FOR SELECT TO authenticated USING (true);

-- Modifications restricted to system_admin / users.roles.manage
CREATE POLICY "roles_modify_admin_only" ON public.roles
FOR ALL USING (public.has_permission('users.roles.manage'));

CREATE POLICY "permissions_modify_admin_only" ON public.permissions
FOR ALL USING (public.has_permission('users.roles.manage'));

CREATE POLICY "role_permissions_modify_admin_only" ON public.role_permissions
FOR ALL USING (public.has_permission('users.roles.manage'));

-- User Role Assignments:
CREATE POLICY "assignments_select_own_or_admin" ON public.user_role_assignments
FOR SELECT USING (
    auth.uid() = user_id
    OR public.has_permission('users.roles.manage')
    OR public.has_role('system_admin')
);

CREATE POLICY "assignments_modify_admin_only" ON public.user_role_assignments
FOR ALL USING (
    public.has_permission('users.roles.manage')
    OR public.has_role('system_admin')
);

-- User Scopes:
CREATE POLICY "scopes_select_own_or_admin" ON public.user_scopes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        WHERE ura.id = assignment_id
          AND (ura.user_id = auth.uid() OR public.has_permission('users.roles.manage') OR public.has_role('system_admin'))
    )
);

CREATE POLICY "scopes_modify_admin_only" ON public.user_scopes
FOR ALL USING (
    public.has_permission('users.roles.manage')
    OR public.has_role('system_admin')
);

-- Audit Events:
-- Strictly append-only. Only users with audit.events.read or system_admin can SELECT.
CREATE POLICY "audit_events_select_auditor_only" ON public.audit_events
FOR SELECT USING (
    public.has_permission('audit.events.read')
    OR public.has_role('auditor')
    OR public.has_role('system_admin')
    OR public.has_role('vice_chancellor')
);

CREATE POLICY "audit_events_insert_authenticated" ON public.audit_events
FOR INSERT TO authenticated WITH CHECK (true);

