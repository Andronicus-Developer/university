-- ==============================================================================
-- 20261122000001_cascade_delete_school_and_users.sql
-- Multi-Tenant Governance: Complete Cascade Deletion for Schools and Associated Users
-- 1. Updates foreign key constraints on public.profiles to ON DELETE CASCADE / SET NULL
--    so that user deletion is never blocked by RESTRICT constraints.
-- 2. Creates atomic stored procedure `public.delete_school_and_all_users` to permanently
--    purge a school, all its operational records, and all its users from the database.
-- ==============================================================================

-- 1. Relax RESTRICT foreign key constraints referencing public.profiles(id)
DO $$
BEGIN
    -- Admission reviews & decisions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admission_reviews_reviewer_id_fkey') THEN
        ALTER TABLE public.admission_reviews DROP CONSTRAINT admission_reviews_reviewer_id_fkey;
        ALTER TABLE public.admission_reviews ADD CONSTRAINT admission_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admission_decisions_decided_by_fkey') THEN
        ALTER TABLE public.admission_decisions DROP CONSTRAINT admission_decisions_decided_by_fkey;
        ALTER TABLE public.admission_decisions ADD CONSTRAINT admission_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'timetable_publications_published_by_fkey') THEN
        ALTER TABLE public.timetable_publications DROP CONSTRAINT timetable_publications_published_by_fkey;
        ALTER TABLE public.timetable_publications ADD CONSTRAINT timetable_publications_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_amendments_requested_by_fkey') THEN
        ALTER TABLE public.attendance_amendments DROP CONSTRAINT attendance_amendments_requested_by_fkey;
        ALTER TABLE public.attendance_amendments ADD CONSTRAINT attendance_amendments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'result_submissions_submitted_by_fkey') THEN
        ALTER TABLE public.result_submissions DROP CONSTRAINT result_submissions_submitted_by_fkey;
        ALTER TABLE public.result_submissions ADD CONSTRAINT result_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'result_approvals_approver_id_fkey') THEN
        ALTER TABLE public.result_approvals DROP CONSTRAINT result_approvals_approver_id_fkey;
        ALTER TABLE public.result_approvals ADD CONSTRAINT result_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'result_amendments_requested_by_fkey') THEN
        ALTER TABLE public.result_amendments DROP CONSTRAINT result_amendments_requested_by_fkey;
        ALTER TABLE public.result_amendments ADD CONSTRAINT result_amendments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'refund_requests_requested_by_fkey') THEN
        ALTER TABLE public.refund_requests DROP CONSTRAINT refund_requests_requested_by_fkey;
        ALTER TABLE public.refund_requests ADD CONSTRAINT refund_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'financial_approvals_approved_by_fkey') THEN
        ALTER TABLE public.financial_approvals DROP CONSTRAINT financial_approvals_approved_by_fkey;
        ALTER TABLE public.financial_approvals ADD CONSTRAINT financial_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'maintenance_requests_reported_by_fkey') THEN
        ALTER TABLE public.maintenance_requests DROP CONSTRAINT maintenance_requests_reported_by_fkey;
        ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Stored Function: public.delete_school_and_all_users
CREATE OR REPLACE FUNCTION public.delete_school_and_all_users(
    p_school_id TEXT,
    p_school_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_id TEXT := TRIM(p_school_id);
    v_clean_code TEXT := TRIM(COALESCE(p_school_code, ''));
    v_target_school_ids UUID[] := ARRAY[]::UUID[];
    v_target_user_ids UUID[] := ARRAY[]::UUID[];
    v_users_count INT := 0;
    v_superadmin_id UUID := '1440ed7e-cb23-4248-a372-f38b20d01554'::uuid;
BEGIN
    -- 1. Identify all matching school UUIDs from universities and schools
    IF v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_target_school_ids := array_append(v_target_school_ids, v_clean_id::uuid);
    END IF;

    SELECT array_agg(DISTINCT id) INTO v_target_school_ids
    FROM (
        SELECT unnest(v_target_school_ids) AS id
        UNION
        SELECT id FROM public.universities WHERE (v_clean_code != '' AND code ILIKE v_clean_code) OR name ILIKE v_clean_id OR id::text = v_clean_id
        UNION
        SELECT id FROM public.schools WHERE (v_clean_code != '' AND slug ILIKE v_clean_code) OR name ILIKE v_clean_id OR id::text = v_clean_id
    ) t WHERE id IS NOT NULL;

    -- 2. Identify all user IDs belonging to this school (excluding the root super administrator)
    SELECT array_agg(DISTINCT id) INTO v_target_user_ids
    FROM (
        -- From profiles
        SELECT p.id FROM public.profiles p
        WHERE p.id != v_superadmin_id
          AND (
              (v_target_school_ids IS NOT NULL AND (p.school_id = ANY(v_target_school_ids) OR p.university_id = ANY(v_target_school_ids)))
              OR (v_clean_code != '' AND (p.university_id::text = v_clean_code OR p.metadata->>'university_code' ILIKE v_clean_code))
              OR (p.metadata->>'school_id' = v_clean_id OR p.metadata->>'university_id' = v_clean_id)
          )
        UNION
        -- From university_system_admins
        SELECT sa.user_id AS id FROM public.university_system_admins sa
        WHERE sa.user_id != v_superadmin_id
          AND (
              (v_target_school_ids IS NOT NULL AND sa.university_id = ANY(v_target_school_ids))
              OR sa.university_id::text = v_clean_id
              OR (v_clean_code != '' AND sa.university_id::text ILIKE v_clean_code)
          )
        UNION
        -- From students
        SELECT s.profile_id AS id FROM public.students s
        WHERE s.profile_id != v_superadmin_id
          AND v_target_school_ids IS NOT NULL
          AND (s.school_id = ANY(v_target_school_ids) OR s.university_id = ANY(v_target_school_ids))
        UNION
        -- From staff
        SELECT st.profile_id AS id FROM public.staff st
        WHERE st.profile_id != v_superadmin_id
          AND v_target_school_ids IS NOT NULL
          AND (st.school_id = ANY(v_target_school_ids) OR st.university_id = ANY(v_target_school_ids))
        UNION
        -- From user_role_assignments
        SELECT ra.user_id AS id FROM public.user_role_assignments ra
        WHERE ra.user_id != v_superadmin_id
          AND v_target_school_ids IS NOT NULL
          AND (ra.school_id = ANY(v_target_school_ids) OR ra.university_id = ANY(v_target_school_ids))
    ) users_found WHERE id IS NOT NULL;

    v_users_count := COALESCE(array_length(v_target_user_ids, 1), 0);

    -- 3. If target users exist, clean up foreign keys and purge user records
    IF v_users_count > 0 THEN
        -- Nullify elective foreign key references to avoid constraint violation
        UPDATE public.campuses SET staff_id = NULL WHERE staff_id = ANY(v_target_user_ids);
        UPDATE public.departments SET hod_id = NULL WHERE hod_id = ANY(v_target_user_ids);
        UPDATE public.faculties SET dean_id = NULL WHERE dean_id = ANY(v_target_user_ids);
        UPDATE public.announcements SET published_by = NULL WHERE published_by = ANY(v_target_user_ids);
        UPDATE public.audit_events SET actor_id = NULL WHERE actor_id = ANY(v_target_user_ids);

        -- Delete child transactions & student/staff records
        DELETE FROM public.admission_reviews WHERE reviewer_id = ANY(v_target_user_ids);
        DELETE FROM public.admission_decisions WHERE decided_by = ANY(v_target_user_ids);
        DELETE FROM public.enrolment_overrides WHERE approved_by = ANY(v_target_user_ids) OR student_id = ANY(v_target_user_ids);
        DELETE FROM public.timetable_publications WHERE published_by = ANY(v_target_user_ids);
        DELETE FROM public.attendance_amendments WHERE requested_by = ANY(v_target_user_ids) OR approved_by = ANY(v_target_user_ids);
        DELETE FROM public.result_submissions WHERE submitted_by = ANY(v_target_user_ids);
        DELETE FROM public.result_approvals WHERE approver_id = ANY(v_target_user_ids);
        DELETE FROM public.result_amendments WHERE requested_by = ANY(v_target_user_ids) OR approved_by = ANY(v_target_user_ids);
        DELETE FROM public.refund_requests WHERE requested_by = ANY(v_target_user_ids);
        DELETE FROM public.financial_approvals WHERE approved_by = ANY(v_target_user_ids) OR requester_id = ANY(v_target_user_ids);
        DELETE FROM public.maintenance_requests WHERE reported_by = ANY(v_target_user_ids);
        DELETE FROM public.support_cases WHERE user_id = ANY(v_target_user_ids) OR assigned_to = ANY(v_target_user_ids);
        DELETE FROM public.student_feedback WHERE student_id = ANY(v_target_user_ids) OR lecturer_profile_id = ANY(v_target_user_ids);
        DELETE FROM public.academic_advising_assignments WHERE advisor_profile_id = ANY(v_target_user_ids) OR student_id = ANY(v_target_user_ids);
        DELETE FROM public.advising_sessions WHERE advisor_profile_id = ANY(v_target_user_ids) OR student_id = ANY(v_target_user_ids);
        DELETE FROM public.lecturer_tasks WHERE lecturer_profile_id = ANY(v_target_user_ids);
        DELETE FROM public.course_enrolments WHERE student_id = ANY(v_target_user_ids) OR profile_id = ANY(v_target_user_ids);
        DELETE FROM public.assessment_marks WHERE student_id = ANY(v_target_user_ids) OR grader_id = ANY(v_target_user_ids);
        DELETE FROM public.attendance_records WHERE student_id = ANY(v_target_user_ids) OR marked_by = ANY(v_target_user_ids);
        DELETE FROM public.student_invoices WHERE student_id = ANY(v_target_user_ids);
        DELETE FROM public.invoice_lines WHERE student_id = ANY(v_target_user_ids);
        DELETE FROM public.payments WHERE student_id = ANY(v_target_user_ids) OR recorded_by = ANY(v_target_user_ids);
        DELETE FROM public.receipts WHERE student_id = ANY(v_target_user_ids);
        DELETE FROM public.scholarships WHERE student_id = ANY(v_target_user_ids);
        DELETE FROM public.waivers WHERE student_id = ANY(v_target_user_ids);
        DELETE FROM public.service_requests WHERE student_id = ANY(v_target_user_ids) OR user_id = ANY(v_target_user_ids);
        DELETE FROM public.loans WHERE user_id = ANY(v_target_user_ids);
        DELETE FROM public.notifications WHERE user_id = ANY(v_target_user_ids);
        DELETE FROM public.leave_requests WHERE user_id = ANY(v_target_user_ids) OR approved_by = ANY(v_target_user_ids);
        DELETE FROM public.employment_records WHERE staff_id = ANY(v_target_user_ids) OR profile_id = ANY(v_target_user_ids);
        DELETE FROM public.teaching_assignments WHERE lecturer_id = ANY(v_target_user_ids);
        DELETE FROM public.students WHERE profile_id = ANY(v_target_user_ids) OR id = ANY(v_target_user_ids);
        DELETE FROM public.staff WHERE profile_id = ANY(v_target_user_ids) OR id = ANY(v_target_user_ids);
        DELETE FROM public.user_role_assignments WHERE user_id = ANY(v_target_user_ids);
        DELETE FROM public.user_scopes WHERE user_id = ANY(v_target_user_ids);
        DELETE FROM public.university_system_admins WHERE user_id = ANY(v_target_user_ids);

        -- Delete profiles
        DELETE FROM public.profiles WHERE id = ANY(v_target_user_ids);

        -- Delete from auth.users so login credentials are permanently wiped
        DELETE FROM auth.users WHERE id = ANY(v_target_user_ids);
    END IF;

    -- 4. Purge all academic, structural, and institutional rows for this school
    IF v_target_school_ids IS NOT NULL AND array_length(v_target_school_ids, 1) > 0 THEN
        DELETE FROM public.campuses WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.faculties WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.departments WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.programmes WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.courses WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.course_offerings WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.classes WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.timetable_events WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.academic_terms WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.academic_years WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.grading_scales WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.grade_scales WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.fee_items WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.fee_schedules WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.residences WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.transport_routes WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.transport_vehicles WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.library_items WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.admission_cycles WHERE school_id = ANY(v_target_school_ids);
        DELETE FROM public.university_system_admins WHERE university_id = ANY(v_target_school_ids);
    END IF;

    -- 5. Delete school entity from public.universities and public.schools
    IF v_target_school_ids IS NOT NULL AND array_length(v_target_school_ids, 1) > 0 THEN
        DELETE FROM public.universities WHERE id = ANY(v_target_school_ids);
        DELETE FROM public.schools WHERE id = ANY(v_target_school_ids);
    END IF;

    IF v_clean_code != '' THEN
        DELETE FROM public.universities WHERE code ILIKE v_clean_code;
        DELETE FROM public.schools WHERE slug ILIKE v_clean_code;
    END IF;

    DELETE FROM public.universities WHERE id::text = v_clean_id;
    DELETE FROM public.schools WHERE id::text = v_clean_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_school_id', v_clean_id,
        'affected_users_count', v_users_count
    );
END;
$$;
