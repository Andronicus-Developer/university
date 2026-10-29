-- ==============================================================================
-- rbac_and_schema_test.sql
-- Validation and Verification Script for UMS Database, Supabase Auth & RBAC
-- ==============================================================================

BEGIN;

-- 1. Test Roles Count
DO $$
DECLARE
    v_roles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_roles_count FROM public.roles;
    IF v_roles_count < 17 THEN
        RAISE EXCEPTION 'Test Failed: Expected 17 roles, found %', v_roles_count;
    END IF;
    RAISE NOTICE 'SUCCESS: 17 Roles verified.';
END $$;

-- 2. Test Grade Scales and Items
DO $$
DECLARE
    v_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_items_count FROM public.grade_scale_items;
    IF v_items_count < 8 THEN
        RAISE EXCEPTION 'Test Failed: Expected at least 8 grade scale items (A to F), found %', v_items_count;
    END IF;
    RAISE NOTICE 'SUCCESS: Tertiary Grading Scale verified.';
END $$;

-- 3. Test Storage Buckets
DO $$
DECLARE
    v_bucket_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_bucket_count
    FROM storage.buckets
    WHERE id IN ('application-documents', 'student-documents', 'staff-documents', 'course-materials', 'public-assets');
    
    IF v_bucket_count < 5 THEN
        RAISE EXCEPTION 'Test Failed: Expected 5 storage buckets, found %', v_bucket_count;
    END IF;
    RAISE NOTICE 'SUCCESS: All 5 Storage buckets verified.';
END $$;

-- 4. Test Audit Event Immutability Trigger
DO $$
DECLARE
    v_test_event_id UUID;
    v_exception_caught BOOLEAN := false;
BEGIN
    INSERT INTO public.audit_events (
        action, entity_type, entity_id, outcome, reason
    ) VALUES (
        'TEST_ACTION', 'test_entity', '12345', 'SUCCESS', 'Testing immutability'
    ) RETURNING id INTO v_test_event_id;

    BEGIN
        UPDATE public.audit_events
        SET reason = 'Tampered Reason'
        WHERE id = v_test_event_id;
    EXCEPTION WHEN OTHERS THEN
        v_exception_caught := true;
    END;

    IF NOT v_exception_caught THEN
        RAISE EXCEPTION 'Security Test Failed: Audit events must be immutable and cannot be updated.';
    END IF;

    RAISE NOTICE 'SUCCESS: Audit event immutability trigger enforced.';
END $$;

-- 5. Test Separation of Duties Trigger (Result approvals cannot be approved by submitter)
DO $$
DECLARE
    v_dummy_user UUID := gen_random_uuid();
    v_offering_id UUID;
    v_submission_id UUID;
    v_exception_caught BOOLEAN := false;
BEGIN
    -- Temporary record test
    SELECT id INTO v_offering_id FROM public.course_offerings LIMIT 1;
    
    IF v_offering_id IS NOT NULL THEN
        -- Insert mock submission
        INSERT INTO public.result_submissions (
            id, course_offering_id, submitted_by, status
        ) VALUES (
            gen_random_uuid(), v_offering_id, v_dummy_user, 'submitted'
        ) RETURNING id INTO v_submission_id;

        -- Attempt approval with the same user ID (Separation of duties violation)
        BEGIN
            INSERT INTO public.result_approvals (
                result_submission_id, approver_id, approval_stage, decision
            ) VALUES (
                v_submission_id, v_dummy_user, 'department', 'approved'
            );
        EXCEPTION WHEN OTHERS THEN
            v_exception_caught := true;
        END;

        IF NOT v_exception_caught THEN
            RAISE EXCEPTION 'Security Test Failed: Submitter cannot approve their own result submission.';
        END IF;

        RAISE NOTICE 'SUCCESS: Separation of duties on result approvals enforced.';
    END IF;
END $$;

-- Rollback mock test transaction so test leaves no garbage
ROLLBACK;
