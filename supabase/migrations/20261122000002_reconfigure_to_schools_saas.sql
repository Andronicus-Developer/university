-- ==============================================================================
-- 20261122000002_reconfigure_to_schools_saas.sql
-- Multi-Tenant SaaS Reconfiguration: Transition from Single University to Multi-Tenant School SaaS
-- 1. Updates superadmin_modules route_path from '/superadmin/universities' to '/superadmin/schools'
-- 2. Updates module labels and keys in public.superadmin_modules and public.system_settings
-- ==============================================================================

-- 1. Update superadmin_modules table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'superadmin_modules'
    ) THEN
        UPDATE public.superadmin_modules
        SET module_key = 'schools',
            label = 'Schools & Campuses',
            route_path = '/superadmin/schools',
            description = 'Register and govern multi-tenant schools, school types (University, High School, Vocational), and campuses'
        WHERE module_key = 'universities' 
           OR module_key = 'schools' 
           OR route_path = '/superadmin/universities'
           OR route_path = '/superadmin/schools';

        -- If not present, insert the schools module
        IF NOT EXISTS (
            SELECT 1 FROM public.superadmin_modules 
            WHERE route_path = '/superadmin/schools'
        ) THEN
            INSERT INTO public.superadmin_modules (
                module_key, label, category, route_path, icon, badge, description, is_active, display_order
            ) VALUES (
                'schools', 'Schools & Campuses', 'Multi-Tenancy', '/superadmin/schools', 'Building2', 'Tenants',
                'Register and govern multi-tenant schools, school types, and campuses', true, 2
            );
        END IF;
    END IF;
END $$;

-- 2. Update system_settings table if superadmin_modules is cached in settings
DO $$
DECLARE
    v_setting JSONB;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'system_settings'
    ) THEN
        SELECT setting_value INTO v_setting
        FROM public.system_settings
        WHERE setting_key = 'superadmin_modules';

        IF v_setting IS NOT NULL AND jsonb_typeof(v_setting) = 'array' THEN
            UPDATE public.system_settings
            SET setting_value = (
                SELECT jsonb_agg(
                    CASE 
                        WHEN elem->>'route_path' = '/superadmin/universities' OR elem->>'module_key' = 'universities' THEN
                            jsonb_set(
                                jsonb_set(elem, '{route_path}', '"/superadmin/schools"'),
                                '{label}', '"Schools & Campuses"'
                            )
                        ELSE elem
                    END
                )
                FROM jsonb_array_elements(v_setting) AS elem
            ),
            updated_at = timezone('utc'::text, now())
            WHERE setting_key = 'superadmin_modules';
        END IF;
    END IF;
END $$;
