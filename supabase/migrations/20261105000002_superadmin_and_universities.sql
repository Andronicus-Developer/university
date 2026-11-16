-- ==============================================================================
-- 20261105000002_superadmin_and_universities.sql
-- Multi-Tenant University Platform: Super Admin & University Registry Schema
-- 1. roles extension ('superadmin' role)
-- 2. universities (Multi-institution registry)
-- 3. university_system_admins (Maps universities to system administrators)
-- 4. superadmin_modules (Dynamic Super Admin sidebar modules and system features)
-- 5. superadmin_audit_logs (Super administrative event stream)
-- ==============================================================================

-- 1. Ensure 'superadmin' role exists in roles table
INSERT INTO public.roles (code, name, description, is_system_role)
VALUES (
    'superadmin',
    'Super Administrator',
    'Master platform overseer with global multi-university authority, system admin provisioning, and system governance.',
    true
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Grant all permissions to superadmin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'superadmin'
ON CONFLICT DO NOTHING;

-- 2. Universities (Multi-Tenant Master Registry)
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    short_name TEXT,
    country TEXT NOT NULL DEFAULT 'Ghana',
    city TEXT NOT NULL DEFAULT 'Accra',
    address TEXT,
    postal_code TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    motto TEXT,
    logo_url TEXT,
    seal_url TEXT,
    default_currency TEXT NOT NULL DEFAULT 'USD',
    currency_symbol TEXT NOT NULL DEFAULT '$',
    established_year INTEGER,
    accreditation_code TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_universities_code ON public.universities(code);
CREATE INDEX IF NOT EXISTS idx_universities_status ON public.universities(status);

-- 3. University System Admins (Link universities to system administrators)
CREATE TABLE IF NOT EXISTS public.university_system_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    designation TEXT DEFAULT 'Lead System Administrator',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_univ_admin UNIQUE (university_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_univ_sys_admins_univ ON public.university_system_admins(university_id);
CREATE INDEX IF NOT EXISTS idx_univ_sys_admins_user ON public.university_system_admins(user_id);

-- 4. Super Admin Modules & Sidebar Navigation
CREATE TABLE IF NOT EXISTS public.superadmin_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Platform Governance',
    route_path TEXT NOT NULL,
    icon TEXT NOT NULL,
    badge TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default Super Admin Sidebar Modules
INSERT INTO public.superadmin_modules (module_key, label, category, route_path, icon, badge, description, display_order)
VALUES
    ('dashboard', 'Mission Control', 'Core System', '/superadmin/dashboard', 'LayoutDashboard', 'Live', 'System vitals, cross-university KPIs, and infrastructure health', 1),
    ('universities', 'Universities & Campuses', 'Multi-Tenancy', '/superadmin/universities', 'GraduationCap', 'Master', 'Register institutions, configure identity, and manage university campuses', 2),
    ('system_admins', 'System Administrators', 'Identity & RBAC', '/superadmin/system-admins', 'ShieldAlert', 'Elevated', 'Provision and govern system administrator credentials across all universities', 3),
    ('platform_modules', 'Feature Modules', 'Platform Governance', '/superadmin/modules', 'Boxes', NULL, 'Toggle modules and capabilities per institution', 4),
    ('audit_logs', 'Global Security Audit', 'Security & Compliance', '/superadmin/audit', 'FileCheck', NULL, 'Immutable cross-tenant audit trail of all security and admin actions', 5),
    ('system_settings', 'Platform Settings', 'Infrastructure', '/superadmin/settings', 'Sliders', NULL, 'System-wide maintenance, authentication policies, and backup controls', 6)
ON CONFLICT (module_key) DO UPDATE
SET label = EXCLUDED.label,
    route_path = EXCLUDED.route_path,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    display_order = EXCLUDED.display_order;

-- 5. Seed Initial Primary University if not exists
INSERT INTO public.universities (
    code,
    name,
    short_name,
    country,
    city,
    address,
    email,
    phone,
    website,
    motto,
    default_currency,
    currency_symbol,
    established_year,
    accreditation_code,
    status
)
VALUES (
    'LCU',
    'Lofa County University',
    'Premier Tech',
    'Liberia',
    'Monrovia',
    'Plot 44 University Heights, North Legon Boulevard',
    'registrar@university.edu.gh',
    '+233 30 212 8899',
    'https://premier.university.edu.gh',
    'Empowering Minds, Shaping Tomorrow',
    'USD',
    '$',
    1998,
    'GTEC/NAB/UNI/2026-0482',
    'active'
)
ON CONFLICT (code) DO NOTHING;

-- Link primary admin to initial university
DO $$
DECLARE
    v_univ_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_univ_id FROM public.universities WHERE code = 'LCU' LIMIT 1;
    SELECT id INTO v_admin_id FROM public.profiles WHERE email = 'admin@university.edu.gh' LIMIT 1;
    
    IF v_univ_id IS NOT NULL AND v_admin_id IS NOT NULL THEN
        INSERT INTO public.university_system_admins (university_id, user_id, is_primary)
        VALUES (v_univ_id, v_admin_id, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_modules ENABLE ROW LEVEL SECURITY;

-- Super Admin and System Admin can read universities
CREATE POLICY "Allow authenticated read on universities"
    ON public.universities FOR SELECT
    TO authenticated
    USING (true);

-- Only Super Admins can insert/update/delete universities
CREATE POLICY "Allow superadmin write on universities"
    ON public.universities FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.roles r ON ura.role_id = r.id
            WHERE ura.user_id = auth.uid()
              AND ura.is_active = true
              AND r.code = 'superadmin'
        )
    );

CREATE POLICY "Allow authenticated read on superadmin_modules"
    ON public.superadmin_modules FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow superadmin manage superadmin_modules"
    ON public.superadmin_modules FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.roles r ON ura.role_id = r.id
            WHERE ura.user_id = auth.uid()
              AND ura.is_active = true
              AND r.code = 'superadmin'
        )
    );

