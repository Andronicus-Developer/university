-- =============================================================================
-- Migration: 20261124000013_performance_indexes.sql
-- Purpose:
--   Add safe, additive B-tree indexes on `school_id` and high-frequency foreign
--   key / filter columns across multi-tenant tables to accelerate RLS policy
--   evaluation, dashboard aggregations, and portal queries.
-- Safety:
--   Uses a PL/pgSQL helper that verifies both table and column existence in
--   `information_schema` before executing `CREATE INDEX IF NOT EXISTS`, making
--   this migration 100% idempotent and safe across all schema variants.
-- =============================================================================

CREATE OR REPLACE FUNCTION public._create_index_if_cols_exist(
  p_index_name TEXT,
  p_table_name TEXT,
  p_columns_sql TEXT,
  p_required_cols TEXT[]
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_col TEXT;
  v_missing BOOLEAN := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = p_table_name
  ) THEN
    RETURN;
  END IF;

  FOREACH v_col IN ARRAY p_required_cols LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = v_col
    ) THEN
      v_missing := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_missing THEN
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
      p_index_name,
      p_table_name,
      p_columns_sql
    );
  END IF;
END;
$$;

DO $$
BEGIN
  -- Core Auth, Profiles & Multi-Tenant Memberships
  PERFORM public._create_index_if_cols_exist('idx_perf_profiles_school_id', 'profiles', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_profiles_school_role', 'profiles', 'school_id, role', ARRAY['school_id', 'role']);
  PERFORM public._create_index_if_cols_exist('idx_perf_profiles_school_status', 'profiles', 'school_id, account_status', ARRAY['school_id', 'account_status']);

  PERFORM public._create_index_if_cols_exist('idx_perf_school_memberships_school_user', 'school_memberships', 'school_id, user_id', ARRAY['school_id', 'user_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_school_memberships_user_status', 'school_memberships', 'user_id, status', ARRAY['user_id', 'status']);
  PERFORM public._create_index_if_cols_exist('idx_perf_school_memberships_school_role_status', 'school_memberships', 'school_id, role, status', ARRAY['school_id', 'role', 'status']);

  -- Students, Staff & Parent/Guardian Directory
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_id', 'students', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_profile_id', 'students', 'profile_id', ARRAY['profile_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_profile', 'students', 'school_id, profile_id', ARRAY['school_id', 'profile_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_programme', 'students', 'school_id, programme_id', ARRAY['school_id', 'programme_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_department', 'students', 'school_id, department_id', ARRAY['school_id', 'department_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_class_group', 'students', 'school_id, class_group_id', ARRAY['school_id', 'class_group_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_intake', 'students', 'school_id, intake_id', ARRAY['school_id', 'intake_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_students_school_status', 'students', 'school_id, status', ARRAY['school_id', 'status']);

  PERFORM public._create_index_if_cols_exist('idx_perf_staff_profiles_school_id', 'staff_profiles', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_staff_profiles_user_id', 'staff_profiles', 'user_id', ARRAY['user_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_staff_profiles_school_user', 'staff_profiles', 'school_id, user_id', ARRAY['school_id', 'user_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_staff_profiles_school_dept', 'staff_profiles', 'school_id, department_id', ARRAY['school_id', 'department_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_parent_guardians_school_id', 'parent_guardians', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_parent_guardians_user_id', 'parent_guardians', 'user_id', ARRAY['user_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_parent_guardians_school_user', 'parent_guardians', 'school_id, user_id', ARRAY['school_id', 'user_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_parent_guardians_school_student', 'parent_guardians', 'school_id, student_id', ARRAY['school_id', 'student_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_pgs_school_parent', 'parent_guardian_students', 'school_id, parent_guardian_id', ARRAY['school_id', 'parent_guardian_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_pgs_school_student', 'parent_guardian_students', 'school_id, student_id', ARRAY['school_id', 'student_id']);

  -- Institutional Structure & Academic Calendar
  PERFORM public._create_index_if_cols_exist('idx_perf_academic_years_school_curr', 'academic_years', 'school_id, is_current', ARRAY['school_id', 'is_current']);
  PERFORM public._create_index_if_cols_exist('idx_perf_terms_school_curr', 'terms', 'school_id, is_current', ARRAY['school_id', 'is_current']);
  PERFORM public._create_index_if_cols_exist('idx_perf_terms_school_year', 'terms', 'school_id, academic_year_id', ARRAY['school_id', 'academic_year_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_departments_school_id', 'departments', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_programmes_school_id', 'programmes', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_programmes_school_dept', 'programmes', 'school_id, department_id', ARRAY['school_id', 'department_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_class_groups_school_id', 'class_groups', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_class_groups_school_year', 'class_groups', 'school_id, academic_year_id', ARRAY['school_id', 'academic_year_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_voc_intakes_school_id', 'vocational_intakes', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_voc_intakes_school_dept', 'vocational_intakes', 'school_id, department_id', ARRAY['school_id', 'department_id']);

  -- Courses, Subjects, Vocational Modules & Teaching Assignments
  PERFORM public._create_index_if_cols_exist('idx_perf_courses_school_id', 'courses', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_courses_school_dept', 'courses', 'school_id, department_id', ARRAY['school_id', 'department_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_courses_school_prog', 'courses', 'school_id, programme_id', ARRAY['school_id', 'programme_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_courses_school_lecturer', 'courses', 'school_id, lecturer_id', ARRAY['school_id', 'lecturer_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_subjects_school_id', 'subjects', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_subjects_school_prog', 'subjects', 'school_id, programme_id', ARRAY['school_id', 'programme_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_subjects_school_teacher', 'subjects', 'school_id, teacher_id', ARRAY['school_id', 'teacher_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_voc_modules_school_id', 'vocational_modules', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_voc_modules_school_dept', 'vocational_modules', 'school_id, department_id', ARRAY['school_id', 'department_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_voc_modules_school_instr', 'vocational_modules', 'school_id, instructor_id', ARRAY['school_id', 'instructor_id']);

  -- Enrolments, Grades, Assessments, Attendance & Timetable
  PERFORM public._create_index_if_cols_exist('idx_perf_course_enrol_school_stu', 'course_enrolments', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_course_enrol_school_course', 'course_enrolments', 'school_id, course_id', ARRAY['school_id', 'course_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_course_enrol_school_term', 'course_enrolments', 'school_id, term_id', ARRAY['school_id', 'term_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_exam_grades_school_stu', 'exam_grades', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_exam_grades_school_course', 'exam_grades', 'school_id, course_id', ARRAY['school_id', 'course_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_exam_grades_school_term', 'exam_grades', 'school_id, term_id', ARRAY['school_id', 'term_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_report_card_school_stu', 'report_card_scores', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_report_card_school_subj', 'report_card_scores', 'school_id, subject_id', ARRAY['school_id', 'subject_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_report_card_school_term', 'report_card_scores', 'school_id, term_id', ARRAY['school_id', 'term_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_stu_assess_school_stu', 'student_assessments', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_stu_assess_school_subj', 'student_assessments', 'school_id, subject_id', ARRAY['school_id', 'subject_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_stu_assess_school_class', 'student_assessments', 'school_id, class_id', ARRAY['school_id', 'class_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_stu_assess_school_term', 'student_assessments', 'school_id, term_id', ARRAY['school_id', 'term_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_att_sessions_school_date', 'attendance_sessions', 'school_id, session_date DESC', ARRAY['school_id', 'session_date']);
  PERFORM public._create_index_if_cols_exist('idx_perf_att_sessions_school_course', 'attendance_sessions', 'school_id, course_id', ARRAY['school_id', 'course_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_att_sessions_school_subj', 'attendance_sessions', 'school_id, subject_id', ARRAY['school_id', 'subject_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_att_records_school_stu', 'attendance_records', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_att_records_school_sess', 'attendance_records', 'school_id, session_id', ARRAY['school_id', 'session_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_conduct_school_stu', 'student_conduct_records', 'school_id, student_id', ARRAY['school_id', 'student_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_assignments_school_subj', 'assignments', 'school_id, subject_id', ARRAY['school_id', 'subject_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_assignments_school_course', 'assignments', 'school_id, course_id', ARRAY['school_id', 'course_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_assignments_school_prog', 'assignments', 'school_id, programme_id', ARRAY['school_id', 'programme_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_assign_subs_school_assign', 'assignment_submissions', 'school_id, assignment_id', ARRAY['school_id', 'assignment_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_assign_subs_school_stu', 'assignment_submissions', 'school_id, student_id', ARRAY['school_id', 'student_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_timetable_school_subj', 'timetable_entries', 'school_id, subject_id', ARRAY['school_id', 'subject_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_timetable_school_prog', 'timetable_entries', 'school_id, programme_id', ARRAY['school_id', 'programme_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_timetable_school_teacher', 'timetable_entries', 'school_id, teacher_id', ARRAY['school_id', 'teacher_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_timetable_school_course', 'timetable_entries', 'school_id, course_id', ARRAY['school_id', 'course_id']);

  -- Finance, Invoices, Payments & Hostels
  PERFORM public._create_index_if_cols_exist('idx_perf_fee_struct_school_id', 'fee_structures', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_fee_struct_school_prog', 'fee_structures', 'school_id, programme_id', ARRAY['school_id', 'programme_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_fee_struct_school_term', 'fee_structures', 'school_id, term_id', ARRAY['school_id', 'term_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_invoices_school_status', 'invoices', 'school_id, status', ARRAY['school_id', 'status']);
  PERFORM public._create_index_if_cols_exist('idx_perf_invoices_school_term', 'invoices', 'school_id, term_id', ARRAY['school_id', 'term_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_payments_school_status_created', 'payments', 'school_id, status, created_at DESC', ARRAY['school_id', 'status', 'created_at']);

  PERFORM public._create_index_if_cols_exist('idx_perf_hostels_school_id', 'hostels', 'school_id', ARRAY['school_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_hostel_alloc_school_stu', 'hostel_allocations', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_hostel_alloc_school_hostel', 'hostel_allocations', 'school_id, hostel_id', ARRAY['school_id', 'hostel_id']);

  -- Vocational Practical Training & Events / Messaging / Registrar
  PERFORM public._create_index_if_cols_exist('idx_perf_logbooks_school_stu', 'practical_logbooks', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_logbooks_school_mod', 'practical_logbooks', 'school_id, module_id', ARRAY['school_id', 'module_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_comp_assess_school_stu', 'competency_assessments', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_comp_assess_school_mod', 'competency_assessments', 'school_id, module_id', ARRAY['school_id', 'module_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_ind_attach_school_stu', 'industrial_attachments', 'school_id, student_id', ARRAY['school_id', 'student_id']);

  PERFORM public._create_index_if_cols_exist('idx_perf_school_events_school_date', 'school_events', 'school_id, start_date', ARRAY['school_id', 'start_date']);
  PERFORM public._create_index_if_cols_exist('idx_perf_ptm_school_stu', 'parent_teacher_messages', 'school_id, student_id', ARRAY['school_id', 'student_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_ptm_school_staff', 'parent_teacher_messages', 'school_id, staff_id', ARRAY['school_id', 'staff_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_leave_req_school_staff', 'leave_requests', 'school_id, staff_id', ARRAY['school_id', 'staff_id']);
  PERFORM public._create_index_if_cols_exist('idx_perf_grad_clear_school_stu', 'graduation_clearances', 'school_id, student_id', ARRAY['school_id', 'student_id']);

  -- Fast case-insensitive email lookup on profiles
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_perf_profiles_lower_email ON public.profiles (lower(email))';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public._create_index_if_cols_exist(TEXT, TEXT, TEXT, TEXT[]);
