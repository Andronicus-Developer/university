-- ==============================================================================
-- 00005_assessment_and_grading.sql
-- University Management System: Assessment, Moderation, Approvals & Grading
-- ==============================================================================

-- 1. Grade Scales
CREATE TABLE IF NOT EXISTS public.grade_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g. 'Standard Tertiary 4.0 Scale'
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.grade_scale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_scale_id UUID NOT NULL REFERENCES public.grade_scales(id) ON DELETE CASCADE,
    letter_grade TEXT NOT NULL, -- 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'
    min_percentage NUMERIC(5,2) NOT NULL CHECK (min_percentage >= 0 AND min_percentage <= 100),
    max_percentage NUMERIC(5,2) NOT NULL CHECK (max_percentage >= 0 AND max_percentage <= 100),
    grade_points NUMERIC(3,2) NOT NULL CHECK (grade_points >= 0.00 AND grade_points <= 4.00),
    pass_status BOOLEAN NOT NULL DEFAULT true,
    remarks TEXT,
    CONSTRAINT unique_scale_letter UNIQUE (grade_scale_id, letter_grade),
    CONSTRAINT check_scale_range CHECK (max_percentage >= min_percentage)
);

CREATE INDEX IF NOT EXISTS idx_scale_items_scale ON public.grade_scale_items(grade_scale_id);

-- 2. Assessment Components (Configured per course offering e.g. Quiz 10%, Midterm 30%, Exam 60%)
CREATE TABLE IF NOT EXISTS public.assessment_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Mid-Semester Exam', 'Assignment 1', 'Final Exam'
    component_type TEXT NOT NULL CHECK (component_type IN ('quiz', 'assignment', 'midterm', 'final_exam', 'project', 'practical')),
    weight_percentage NUMERIC(5,2) NOT NULL CHECK (weight_percentage > 0 AND weight_percentage <= 100),
    max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00 CHECK (max_marks > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assessment_comp_offering ON public.assessment_components(course_offering_id);

-- 3. Assessment Marks
CREATE TABLE IF NOT EXISTS public.assessment_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_component_id UUID NOT NULL REFERENCES public.assessment_components(id) ON DELETE CASCADE,
    enrolment_id UUID NOT NULL REFERENCES public.course_enrolments(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(6,2) CHECK (marks_obtained >= 0),
    is_absent BOOLEAN NOT NULL DEFAULT false,
    remarks TEXT,
    entered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_component_enrolment UNIQUE (assessment_component_id, enrolment_id)
);

CREATE INDEX IF NOT EXISTS idx_marks_component ON public.assessment_marks(assessment_component_id);
CREATE INDEX IF NOT EXISTS idx_marks_enrolment ON public.assessment_marks(enrolment_id);

-- 4. Result Submissions (Lecturer submits full mark sheet for moderation/approval)
CREATE TABLE IF NOT EXISTS public.result_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_moderation', 'approved', 'rejected')),
    submission_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_result_submissions_offering ON public.result_submissions(course_offering_id);

-- 5. Result Approvals (Independent approval stage: Department -> Faculty -> Academic Board)
CREATE TABLE IF NOT EXISTS public.result_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_submission_id UUID NOT NULL REFERENCES public.result_submissions(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approval_stage TEXT NOT NULL CHECK (approval_stage IN ('department', 'faculty', 'academic_board')),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'correction_requested')),
    comments TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_result_approvals_submission ON public.result_approvals(result_submission_id);

-- 6. Published Results (Official and authoritative; published to students)
CREATE TABLE IF NOT EXISTS public.published_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id UUID NOT NULL UNIQUE REFERENCES public.course_enrolments(id) ON DELETE CASCADE,
    total_marks NUMERIC(5,2) NOT NULL CHECK (total_marks >= 0 AND total_marks <= 100),
    letter_grade TEXT NOT NULL,
    grade_points NUMERIC(3,2) NOT NULL CHECK (grade_points >= 0.00 AND grade_points <= 4.00),
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_published_results_enrolment ON public.published_results(enrolment_id);

-- 7. Result Amendments (Strict audit trail for post-publication corrections)
CREATE TABLE IF NOT EXISTS public.result_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_result_id UUID NOT NULL REFERENCES public.published_results(id) ON DELETE CASCADE,
    old_marks NUMERIC(5,2),
    new_marks NUMERIC(5,2) NOT NULL,
    old_grade TEXT,
    new_grade TEXT NOT NULL,
    reason TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. Separation of Duties and Integrity Functions
-- ==============================================================================

-- Prevent approver from approving their own submitted result
CREATE OR REPLACE FUNCTION public.check_result_approval_separation_of_duties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_submitter_id UUID;
BEGIN
    SELECT submitted_by INTO v_submitter_id
    FROM public.result_submissions
    WHERE id = NEW.result_submission_id;

    IF v_submitter_id = NEW.approver_id THEN
        RAISE EXCEPTION 'Separation of duties violation: Submitter cannot approve their own result submission.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_approval_separation ON public.result_approvals;
CREATE TRIGGER trg_check_approval_separation
BEFORE INSERT OR UPDATE ON public.result_approvals
FOR EACH ROW EXECUTE FUNCTION public.check_result_approval_separation_of_duties();

-- Function to publish approved results and recalculate GPA/CGPA
CREATE OR REPLACE FUNCTION public.publish_results_for_offering(
    p_offering_id UUID,
    p_publisher_id UUID DEFAULT auth.uid()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
    v_grade_scale_id UUID;
    v_letter_grade TEXT;
    v_grade_points NUMERIC(3,2);
BEGIN
    -- Check permission
    IF NOT (public.has_permission('results.publish') OR public.has_role('registrar') OR public.has_role('system_admin')) THEN
        RAISE EXCEPTION 'Unauthorized: You lack permissions to publish results.';
    END IF;

    -- Get default grade scale
    SELECT id INTO v_grade_scale_id FROM public.grade_scales WHERE is_default = true LIMIT 1;
    IF v_grade_scale_id IS NULL THEN
        SELECT id INTO v_grade_scale_id FROM public.grade_scales LIMIT 1;
    END IF;

    -- Loop through all enrolled students for this offering and calculate total weighted score
    FOR r IN (
        SELECT 
            ce.id AS enrolment_id,
            ce.student_id,
            COALESCE(SUM((am.marks_obtained / ac.max_marks) * ac.weight_percentage), 0) AS calculated_total
        FROM public.course_enrolments ce
        JOIN public.assessment_components ac ON ac.course_offering_id = ce.course_offering_id
        LEFT JOIN public.assessment_marks am ON am.assessment_component_id = ac.id AND am.enrolment_id = ce.id
        WHERE ce.course_offering_id = p_offering_id
          AND ce.enrolment_status = 'enrolled'
        GROUP BY ce.id, ce.student_id
    ) LOOP
        -- Match letter grade and grade points
        SELECT letter_grade, grade_points 
        INTO v_letter_grade, v_grade_points
        FROM public.grade_scale_items
        WHERE grade_scale_id = v_grade_scale_id
          AND r.calculated_total >= min_percentage
          AND r.calculated_total <= max_percentage
        ORDER BY min_percentage DESC
        LIMIT 1;

        IF v_letter_grade IS NULL THEN
            v_letter_grade := 'F';
            v_grade_points := 0.00;
        END IF;

        -- Insert or update published_results
        INSERT INTO public.published_results (
            enrolment_id,
            total_marks,
            letter_grade,
            grade_points,
            is_published,
            published_at,
            published_by
        ) VALUES (
            r.enrolment_id,
            ROUND(r.calculated_total, 2),
            v_letter_grade,
            v_grade_points,
            true,
            timezone('utc'::text, now()),
            p_publisher_id
        )
        ON CONFLICT (enrolment_id) DO UPDATE
        SET total_marks = EXCLUDED.total_marks,
            letter_grade = EXCLUDED.letter_grade,
            grade_points = EXCLUDED.grade_points,
            is_published = true,
            published_at = timezone('utc'::text, now()),
            published_by = EXCLUDED.published_by;

        -- Update enrolment record with final grade and grade points
        UPDATE public.course_enrolments
        SET final_grade = v_letter_grade,
            grade_points = v_grade_points,
            enrolment_status = 'completed',
            updated_at = timezone('utc'::text, now())
        WHERE id = r.enrolment_id;

        v_count := v_count + 1;
    END LOOP;

    -- Log audit event
    PERFORM public.log_audit_event(
        'PUBLISH_RESULTS',
        'course_offerings',
        p_offering_id::text,
        'SUCCESS',
        'Published results for offering ' || p_offering_id::text || '; total published: ' || v_count::text
    );

    RETURN v_count;
END;
$$;

-- ==============================================================================
-- 9. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_scale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_amendments ENABLE ROW LEVEL SECURITY;

-- Grade scales readable by all authenticated
CREATE POLICY "grade_scales_read" ON public.grade_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY "grade_scale_items_read" ON public.grade_scale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "grade_scales_write" ON public.grade_scales FOR ALL TO authenticated USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "grade_scale_items_write" ON public.grade_scale_items FOR ALL TO authenticated USING (public.has_permission('academics.curriculum.manage'));

-- Assessment Components:
CREATE POLICY "assessment_comp_read" ON public.assessment_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_comp_write" ON public.assessment_components FOR ALL TO authenticated USING (
    public.is_lecturer_for_offering(course_offering_id, auth.uid())
    OR public.has_permission('academics.offering.manage')
);

-- Assessment Marks:
-- Assigned lecturer can view and enter marks; students cannot view raw marks here directly
CREATE POLICY "marks_select" ON public.assessment_marks FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.assessment_components ac
        WHERE ac.id = assessment_component_id AND public.is_lecturer_for_offering(ac.course_offering_id, auth.uid())
    )
    OR public.has_permission('results.marks.moderate')
    OR public.has_role('registrar')
);

CREATE POLICY "marks_write" ON public.assessment_marks FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.assessment_components ac
        WHERE ac.id = assessment_component_id AND public.is_lecturer_for_offering(ac.course_offering_id, auth.uid())
    )
    OR public.has_permission('results.marks.submit')
);

-- Result Submissions:
CREATE POLICY "submissions_select" ON public.result_submissions FOR SELECT TO authenticated USING (
    submitted_by = auth.uid()
    OR public.is_lecturer_for_offering(course_offering_id, auth.uid())
    OR public.has_permission('results.approve')
    OR public.has_role('registrar')
);

CREATE POLICY "submissions_write" ON public.result_submissions FOR ALL TO authenticated USING (
    public.is_lecturer_for_offering(course_offering_id, auth.uid())
    OR public.has_permission('results.marks.submit')
);

-- Result Approvals:
CREATE POLICY "approvals_select" ON public.result_approvals FOR SELECT TO authenticated USING (
    approver_id = auth.uid()
    OR public.has_permission('results.approve')
    OR public.has_role('registrar')
);

CREATE POLICY "approvals_insert" ON public.result_approvals FOR INSERT TO authenticated WITH CHECK (
    public.has_permission('results.approve')
    OR public.has_role('dean')
    OR public.has_role('head_of_department')
    OR public.has_role('academic_affairs_officer')
);

-- Published Results:
-- Students see ONLY their own results and ONLY if published!
CREATE POLICY "published_results_select" ON public.published_results FOR SELECT TO authenticated USING (
    (
        is_published = true 
        AND EXISTS (
            SELECT 1 FROM public.course_enrolments ce
            JOIN public.students s ON s.id = ce.student_id
            WHERE ce.id = enrolment_id AND s.profile_id = auth.uid()
        )
    )
    OR public.has_permission('results.publish')
    OR public.has_role('registrar')
    OR public.has_role('academic_advisor')
    OR public.has_role('auditor')
);

CREATE POLICY "published_results_write" ON public.published_results FOR ALL TO authenticated USING (
    public.has_permission('results.publish')
    OR public.has_role('registrar')
    OR public.has_role('system_admin')
);

-- Result Amendments:
CREATE POLICY "amendments_select" ON public.result_amendments FOR SELECT TO authenticated USING (
    requested_by = auth.uid()
    OR public.has_permission('results.amend')
    OR public.has_role('registrar')
);

CREATE POLICY "amendments_write" ON public.result_amendments FOR ALL TO authenticated USING (
    public.has_permission('results.amend')
    OR public.has_role('registrar')
);
