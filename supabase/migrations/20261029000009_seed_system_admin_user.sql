-- ==============================================================================
-- 00009_seed_system_admin_user.sql
-- University Management System: Default System Administrator Credentials & Role
-- ==============================================================================

DO $$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_admin_role_id UUID;
    v_email TEXT := 'admin@university.edu.gh';
    v_password TEXT := 'Admin@123456';
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- 1. Ensure system_admin role exists
    SELECT id INTO v_admin_role_id FROM public.roles WHERE code = 'system_admin';

    IF v_admin_role_id IS NULL THEN
        INSERT INTO public.roles (code, name, description, is_system_role)
        VALUES ('system_admin', 'System Administrator', 'Technical configuration, integrations, user management, and operational maintenance.', true)
        RETURNING id INTO v_admin_role_id;
    END IF;

    -- 2. Insert into auth.users if not present with non-null string tokens
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            v_email,
            crypt(v_password, gen_salt('bf')),
            timezone('utc'::text, now()),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('full_name', 'System Administrator', 'default_role', 'system_admin'),
            false,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        );

        -- Add identity row if auth.identities exists (handles both UUID and TEXT PKs, and provider_id column)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id') THEN
                EXECUTE '
                    INSERT INTO auth.identities (
                        id,
                        user_id,
                        identity_data,
                        provider,
                        provider_id,
                        last_sign_in_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        gen_random_uuid(),
                        $1,
                        jsonb_build_object(''sub'', $1::text, ''email'', $2),
                        ''email'',
                        $1::text,
                        timezone(''utc''::text, now()),
                        timezone(''utc''::text, now()),
                        timezone(''utc''::text, now())
                    )
                    ON CONFLICT (provider, provider_id) DO NOTHING'
                USING v_admin_id, v_email;
            ELSIF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id') = 'uuid' THEN
                EXECUTE '
                    INSERT INTO auth.identities (
                        id,
                        user_id,
                        identity_data,
                        provider,
                        last_sign_in_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        $1,
                        $1,
                        jsonb_build_object(''sub'', $1::text, ''email'', $2),
                        ''email'',
                        timezone(''utc''::text, now()),
                        timezone(''utc''::text, now()),
                        timezone(''utc''::text, now())
                    )
                    ON CONFLICT DO NOTHING'
                USING v_admin_id, v_email;
            ELSE
                EXECUTE '
                    INSERT INTO auth.identities (
                        id,
                        user_id,
                        identity_data,
                        provider,
                        last_sign_in_at,
                        created_at,
                        updated_at
                    ) VALUES (
                        $1::text,
                        $1,
                        jsonb_build_object(''sub'', $1::text, ''email'', $2),
                        ''email'',
                        timezone(''utc''::text, now()),
                        timezone(''utc''::text, now()),
                        timezone(''utc''::text, now())
                    )
                    ON CONFLICT (provider, id) DO NOTHING'
                USING v_admin_id, v_email;
            END IF;
        END IF;
    ELSE
        SELECT id INTO v_admin_id FROM auth.users WHERE email = v_email;

        -- Fix any NULL tokens in existing auth.users to avoid GoTrue "Database error querying schema"
        UPDATE auth.users
        SET 
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            phone_change = COALESCE(phone_change, ''),
            phone_change_token = COALESCE(phone_change_token, ''),
            reauthentication_token = COALESCE(reauthentication_token, '')
        WHERE email = v_email;
    END IF;

    -- Clean up any NULLs in auth.users system-wide to prevent GoTrue scanner crashes
    UPDATE auth.users
    SET 
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        reauthentication_token = COALESCE(reauthentication_token, '')
    WHERE 
        confirmation_token IS NULL 
        OR recovery_token IS NULL 
        OR email_change IS NULL 
        OR email_change_token_new IS NULL 
        OR email_change_token_current IS NULL 
        OR phone_change IS NULL 
        OR phone_change_token IS NULL 
        OR reauthentication_token IS NULL;

    -- 3. Ensure profile in public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        account_status,
        metadata
    ) VALUES (
        v_admin_id,
        v_email,
        'System Administrator',
        'active',
        jsonb_build_object('role', 'system_admin')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'System Administrator',
        account_status = 'active';

    -- 4. Ensure user role assignment
    INSERT INTO public.user_role_assignments (
        user_id,
        role_id,
        is_active,
        granted_at
    ) VALUES (
        v_admin_id,
        v_admin_role_id,
        true,
        timezone('utc'::text, now())
    )
    ON CONFLICT (user_id, role_id) DO UPDATE
    SET is_active = true;

    -- 5. Grant all permissions to system_admin role
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, p.id
    FROM public.permissions p
    ON CONFLICT DO NOTHING;

    -- 6. Log audit event
    PERFORM public.log_audit_event(
        'SYSTEM_ADMIN_SEEDED',
        'profiles',
        v_admin_id::text,
        'SUCCESS',
        'System administrator initialized with full privileges'
    );
END $$;
