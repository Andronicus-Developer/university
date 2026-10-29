-- ==============================================================================
-- 00003_admissions_and_students.sql
-- University Management System: Admissions & Authoritative Student Records
-- ==============================================================================

-- 1. Admission Cycles
CREATE TABLE IF NOT EXISTS public.admission_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE, -- e.g. 'ADM-2026/2027'
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    application_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (application_fee >= 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Applications
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES public.admission_cycles(id) ON DELETE RESTRICT,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    application_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'submitted',
        'fee_pending',
        'under_review',
        'incomplete',
        'shortlisted',
        'approved',
        'rejected',
        'waitlisted',
        'offer_issued',
        'offer_accepted',
        'offer_declined',
        'converted_to_student'
    )),
    personal_info JSONB DEFAULT '{}'::jsonb,
    academic_history JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_cycle ON public.applications(cycle_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- 3. Application Programmes (Applicant choices in order of preference)
CREATE TABLE IF NOT EXISTS public.application_programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    preference_order INTEGER NOT NULL CHECK (preference_order > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_app_preference UNIQUE (application_id, preference_order)
);

CREATE INDEX IF NOT EXISTS idx_app_prog_app ON public.application_programmes(application_id);

-- 4. Application Documents (Metadata for files in application-documents storage)
CREATE TABLE IF NOT EXISTS public.application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- e.g. 'wassce_certificate', 'birth_cert', 'passport_photo', 'transcript'
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_app_docs_app ON public.application_documents(application_id);

-- 5. Application Reviews
CREATE TABLE IF NOT EXISTS public.application_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    score NUMERIC(5,2),
    recommendation TEXT CHECK (recommendation IN ('admit', 'reject', 'waitlist')),
    checklist_results JSONB DEFAULT '{}'::jsonb,
    comments TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_app_reviews_app ON public.application_reviews(application_id);

-- 6. Admission Decisions
CREATE TABLE IF NOT EXISTS public.admission_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'waitlisted')),
    decided_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_admission_decisions_app ON public.admission_decisions(application_id);

-- 7. Admission Offers
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    offer_letter_ref TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    acceptance_deadline TIMESTAMPTZ NOT NULL,
    conditions TEXT,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'accepted', 'declined', 'expired')),
    response_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offers_app ON public.offers(application_id);

-- ==============================================================================
-- 8. Students (Authoritative Student Record)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_number TEXT NOT NULL UNIQUE,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    programme_version_id UUID REFERENCES public.programme_versions(id) ON DELETE RESTRICT,
    current_term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    cohort_year INTEGER NOT NULL,
    entry_term_id UUID REFERENCES public.terms(id) ON DELETE RESTRICT,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN (
        'admitted',
        'active',
        'deferred',
        'leave_of_absence',
        'suspended',
        'withdrawn',
        'completed',
        'graduated',
        'deceased'
    )),
    current_level INTEGER NOT NULL DEFAULT 100 CHECK (current_level IN (100, 200, 300, 400, 500, 600, 700, 800)),
    gpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    cgpa NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_students_profile ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_number ON public.students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_programme ON public.students(programme_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- 9. Student Status History (Preserves audit of status transitions)
CREATE TABLE IF NOT EXISTS public.student_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    effective_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_student_status_history_student ON public.student_status_history(student_id);

-- 10. Student Programme History (Changes of programme)
CREATE TABLE IF NOT EXISTS public.student_programme_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    old_programme_id UUID REFERENCES public.programmes(id),
    new_programme_id UUID NOT NULL REFERENCES public.programmes(id),
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    effective_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Student Holds (Financial, Academic, Disciplinary)
CREATE TABLE IF NOT EXISTS public.student_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    hold_type TEXT NOT NULL CHECK (hold_type IN ('financial', 'academic', 'disciplinary', 'administrative')),
    reason TEXT NOT NULL,
    placed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_student_holds_student ON public.student_holds(student_id);
CREATE INDEX IF NOT EXISTS idx_student_holds_active ON public.student_holds(student_id, is_active);

-- 12. Student Emergency Contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. Helper Functions
-- ==============================================================================

-- Get student record id for user
CREATE OR REPLACE FUNCTION public.get_student_id_for_user(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.students WHERE profile_id = p_user_id LIMIT 1;
$$;

-- Convert accepted applicant to registered student
CREATE OR REPLACE FUNCTION public.convert_applicant_to_student(
    p_application_id UUID,
    p_student_number TEXT,
    p_programme_id UUID,
    p_cohort_year INTEGER,
    p_entry_term_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_applicant_profile_id UUID;
    v_student_id UUID;
    v_student_role_id UUID;
BEGIN
    -- Verify authority
    IF NOT (public.has_permission('admissions.decision.approve') OR public.has_role('registrar') OR public.has_role('system_admin')) THEN
        RAISE EXCEPTION 'Unauthorized: You lack permissions to convert applicants to students.';
    END IF;

    -- Fetch applicant user ID
    SELECT applicant_id INTO v_applicant_profile_id
    FROM public.applications
    WHERE id = p_application_id;

    IF v_applicant_profile_id IS NULL THEN
        RAISE EXCEPTION 'Application not found.';
    END IF;

    -- Create student record
    INSERT INTO public.students (
        profile_id,
        student_number,
        application_id,
        programme_id,
        cohort_year,
        entry_term_id,
        current_term_id,
        status,
        current_level
    ) VALUES (
        v_applicant_profile_id,
        p_student_number,
        p_application_id,
        p_programme_id,
        p_cohort_year,
        p_entry_term_id,
        p_entry_term_id,
        'admitted',
        100
    )
    RETURNING id INTO v_student_id;

    -- Update application status
    UPDATE public.applications
    SET status = 'converted_to_student',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    -- Assign 'student' role to profile
    SELECT id INTO v_student_role_id FROM public.roles WHERE code = 'student';
    IF v_student_role_id IS NOT NULL THEN
        INSERT INTO public.user_role_assignments (user_id, role_id, is_active, granted_by)
        VALUES (v_applicant_profile_id, v_student_role_id, true, auth.uid())
        ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
    END IF;

    -- Log audit event
    PERFORM public.log_audit_event(
        'APPLICANT_CONVERTED_TO_STUDENT',
        'students',
        v_student_id::text,
        'SUCCESS',
        'Converted application ' || p_application_id::text || ' to student ' || p_student_number
    );

    RETURN v_student_id;
END;
$$;

-- ==============================================================================
-- 14. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.admission_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_programme_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Admission cycles: Active cycles viewable by all; manageable by admissions admin
CREATE POLICY "cycles_view_authenticated" ON public.admission_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycles_manage_admin" ON public.admission_cycles FOR ALL USING (public.has_permission('admissions.cycle.manage'));

-- Applications:
-- Applicant views and edits own draft/submitted application
CREATE POLICY "apps_select_own_or_staff" ON public.applications FOR SELECT TO authenticated USING (
    applicant_id = auth.uid()
    OR public.has_permission('admissions.application.read')
    OR public.has_permission('admissions.application.review')
    OR public.has_role('registrar')
);

CREATE POLICY "apps_insert_applicant" ON public.applications FOR INSERT TO authenticated WITH CHECK (
    applicant_id = auth.uid()
);

CREATE POLICY "apps_update_own_or_staff" ON public.applications FOR UPDATE TO authenticated USING (
    (applicant_id = auth.uid() AND status IN ('draft', 'incomplete'))
    OR public.has_permission('admissions.application.review')
    OR public.has_permission('admissions.decision.approve')
);

-- Application Programmes:
CREATE POLICY "app_progs_select" ON public.application_programmes FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND (a.applicant_id = auth.uid() OR public.has_permission('admissions.application.read')))
);
CREATE POLICY "app_progs_write" ON public.application_programmes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.applicant_id = auth.uid() AND a.status IN ('draft', 'incomplete'))
);

-- Application Documents:
CREATE POLICY "app_docs_select" ON public.application_documents FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND (a.applicant_id = auth.uid() OR public.has_permission('admissions.application.read')))
);
CREATE POLICY "app_docs_insert" ON public.application_documents FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.applicant_id = auth.uid())
);
CREATE POLICY "app_docs_update" ON public.application_documents FOR UPDATE TO authenticated USING (
    public.has_permission('admissions.application.review')
    OR public.has_role('admissions_officer')
);

-- Application Reviews & Decisions:
CREATE POLICY "reviews_select" ON public.application_reviews FOR SELECT TO authenticated USING (
    public.has_permission('admissions.application.review')
);
CREATE POLICY "reviews_insert" ON public.application_reviews FOR INSERT TO authenticated WITH CHECK (
    public.has_permission('admissions.application.review')
);

CREATE POLICY "decisions_select" ON public.admission_decisions FOR SELECT TO authenticated USING (
    public.has_permission('admissions.application.read')
    OR public.has_role('admissions_officer')
);
CREATE POLICY "decisions_write" ON public.admission_decisions FOR ALL TO authenticated USING (
    public.has_permission('admissions.decision.approve')
);

-- Offers:
CREATE POLICY "offers_select" ON public.offers FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.applicant_id = auth.uid())
    OR public.has_permission('admissions.application.read')
);
CREATE POLICY "offers_update_applicant" ON public.offers FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.applicant_id = auth.uid())
    OR public.has_permission('admissions.decision.approve')
);
CREATE POLICY "offers_insert_staff" ON public.offers FOR INSERT TO authenticated WITH CHECK (
    public.has_permission('admissions.decision.approve')
);

-- Students:
-- Student can see own record; authorized staff can see all
CREATE POLICY "students_select" ON public.students FOR SELECT TO authenticated USING (
    profile_id = auth.uid()
    OR public.has_permission('registry.student.read')
    OR public.has_role('academic_advisor')
    OR public.has_role('lecturer')
    OR public.has_role('registrar')
);

CREATE POLICY "students_modify" ON public.students FOR ALL TO authenticated USING (
    public.has_permission('registry.student.status_change')
    OR public.has_role('registrar')
    OR public.has_role('system_admin')
);

-- Holds, Status & Emergency Contacts:
CREATE POLICY "holds_select" ON public.student_holds FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('registry.student.read')
);
CREATE POLICY "holds_manage" ON public.student_holds FOR ALL TO authenticated USING (
    public.has_permission('finance.holds.manage')
    OR public.has_permission('registry.student.status_change')
    OR public.has_role('system_admin')
);

CREATE POLICY "status_history_select" ON public.student_status_history FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.profile_id = auth.uid() OR public.has_permission('registry.student.read')))
);

CREATE POLICY "prog_history_select" ON public.student_programme_history FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.profile_id = auth.uid() OR public.has_permission('registry.student.read')))
);

CREATE POLICY "emergency_contacts_select" ON public.emergency_contacts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.profile_id = auth.uid() OR public.has_permission('registry.student.read')))
);
CREATE POLICY "emergency_contacts_write" ON public.emergency_contacts FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.profile_id = auth.uid() OR public.has_permission('registry.student.status_change')))
);
