-- ==============================================================================
-- 00007_registry_library_hostel_hr_support_system.sql
-- University Management System: Registry, Library, Hostel, HR, Communications, Support & System
-- ==============================================================================

-- ==============================================================================
-- 1. Registry & Official Student Documents
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. 'OFFICIAL_TRANSCRIPT', 'ENROLMENT_VERIFICATION'
    name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('transcript', 'enrollment_letter', 'completion_letter', 'english_proficiency')),
    template_body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN (
        'transcript',
        'enrollment_letter',
        'completion_letter',
        'id_replacement',
        'deferral',
        'leave_of_absence',
        'withdrawal',
        'programme_change'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'under_review',
        'approved',
        'in_progress',
        'completed',
        'rejected'
    )),
    fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    details JSONB DEFAULT '{}'::jsonb,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_requests_student ON public.service_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

CREATE TABLE IF NOT EXISTS public.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    document_reference TEXT NOT NULL UNIQUE,
    verification_code TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_gen_docs_student ON public.generated_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_gen_docs_ref ON public.generated_documents(document_reference);
CREATE INDEX IF NOT EXISTS idx_gen_docs_verify ON public.generated_documents(verification_code);

CREATE TABLE IF NOT EXISTS public.document_issuance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_document_id UUID NOT NULL REFERENCES public.generated_documents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('generated', 'downloaded', 'printed', 'verified', 'revoked')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

-- ==============================================================================
-- 2. Library Management
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn TEXT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    publication_year INTEGER,
    category TEXT,
    call_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_library_items_title ON public.library_items(title);
CREATE INDEX IF NOT EXISTS idx_library_items_isbn ON public.library_items(isbn);

CREATE TABLE IF NOT EXISTS public.item_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_item_id UUID NOT NULL REFERENCES public.library_items(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL UNIQUE,
    copy_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_loan', 'reserved', 'maintenance', 'lost')),
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID NOT NULL REFERENCES public.item_copies(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    due_date DATE NOT NULL,
    returned_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost'))
);

CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans(user_id);

CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_item_id UUID NOT NULL REFERENCES public.library_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'expired'))
);

CREATE TABLE IF NOT EXISTS public.library_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    waived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. Hostel and Accommodation
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.residences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender_allocation TEXT NOT NULL DEFAULT 'mixed' CHECK (gender_allocation IN ('male', 'female', 'mixed')),
    total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.hostel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    residence_id UUID NOT NULL REFERENCES public.residences(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    floor_number INTEGER,
    room_type TEXT NOT NULL DEFAULT 'standard',
    max_occupancy INTEGER NOT NULL CHECK (max_occupancy > 0),
    CONSTRAINT unique_residence_room UNIQUE (residence_id, room_number)
);

CREATE TABLE IF NOT EXISTS public.beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_room_id UUID NOT NULL REFERENCES public.hostel_rooms(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT unique_room_bed UNIQUE (hostel_room_id, bed_number)
);

CREATE TABLE IF NOT EXISTS public.accommodation_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    preferred_residence_id UUID REFERENCES public.residences(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'allocated', 'waitlisted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.accommodation_applications(id) ON DELETE SET NULL,
    bed_id UUID NOT NULL REFERENCES public.beds(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'active', 'checked_out', 'cancelled')),
    CONSTRAINT unique_student_term_allocation UNIQUE (student_id, term_id)
);

CREATE TABLE IF NOT EXISTS public.occupancy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('check_in', 'check_out', 'inspection', 'violation')),
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    residence_id UUID NOT NULL REFERENCES public.residences(id) ON DELETE CASCADE,
    hostel_room_id UUID REFERENCES public.hostel_rooms(id) ON DELETE SET NULL,
    reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    issue_description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. Human Resources & Staff
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    staff_number TEXT NOT NULL UNIQUE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'adjunct', 'contract')),
    job_title TEXT NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated', 'retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staff_profile ON public.staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_dept ON public.staff(department_id);

CREATE TABLE IF NOT EXISTS public.employment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    contract_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    salary_grade TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'study', 'maternity', 'paternity', 'compassionate')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    total_days NUMERIC(4,1) NOT NULL,
    used_days NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    remaining_days NUMERIC(4,1) NOT NULL,
    CONSTRAINT unique_staff_year_leave UNIQUE (staff_id, academic_year_id, leave_type)
);

CREATE TABLE IF NOT EXISTS public.staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.teaching_loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
    total_assigned_credits NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    max_permitted_credits NUMERIC(4,1) NOT NULL DEFAULT 12.0,
    CONSTRAINT unique_staff_term_load UNIQUE (staff_id, term_id)
);

-- ==============================================================================
-- 5. Communications & Announcements
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'lecturers', 'staff', 'programme', 'cohort')),
    target_id UUID,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body_template TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms'))
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms')),
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS public.delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    provider TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. Student Support & Case Management
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.support_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('academic_advising', 'it_support', 'finance', 'welfare', 'disability', 'general')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed')),
    assigned_team TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_cases_student ON public.support_cases(student_id);

CREATE TABLE IF NOT EXISTS public.case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.case_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. System Configuration, Integrations & Job Tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL UNIQUE, -- 'paystack', 'hubtel', 'resend', 'sentry'
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    config_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    error_log TEXT
);

CREATE TABLE IF NOT EXISTS public.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL,
    filter_params JSONB DEFAULT '{}'::jsonb,
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'expired')),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    target_roles TEXT[] DEFAULT '{}'::text[]
);

-- ==============================================================================
-- 8. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_issuance_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.residences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_loads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Document templates: readable by authenticated; write by registry/admin
CREATE POLICY "templates_read" ON public.document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_write" ON public.document_templates FOR ALL TO authenticated USING (public.has_permission('registry.transcript.issue'));

-- Service requests: Student sees own; Registry sees all
CREATE POLICY "service_req_select" ON public.service_requests FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('registry.letter.issue')
    OR public.has_role('registrar')
);
CREATE POLICY "service_req_insert" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
);
CREATE POLICY "service_req_update" ON public.service_requests FOR UPDATE TO authenticated USING (
    public.has_permission('registry.letter.issue')
    OR public.has_role('registrar')
);

-- Generated documents: Student sees own; Registry/Admins manage
CREATE POLICY "gen_docs_select" ON public.generated_documents FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('registry.transcript.issue')
    OR public.has_role('registrar')
);
CREATE POLICY "gen_docs_write" ON public.generated_documents FOR ALL TO authenticated USING (
    public.has_permission('registry.transcript.issue')
    OR public.has_role('registrar')
);

CREATE POLICY "doc_events_policy" ON public.document_issuance_events FOR ALL TO authenticated USING (true);

-- Library:
CREATE POLICY "library_items_read" ON public.library_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "item_copies_read" ON public.item_copies FOR SELECT TO authenticated USING (true);
CREATE POLICY "library_manage" ON public.library_items FOR ALL TO authenticated USING (public.has_permission('library.catalog.manage'));
CREATE POLICY "item_copies_manage" ON public.item_copies FOR ALL TO authenticated USING (public.has_permission('library.catalog.manage'));

CREATE POLICY "loans_select" ON public.loans FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.has_permission('library.circulation.manage')
);
CREATE POLICY "loans_write" ON public.loans FOR ALL TO authenticated USING (public.has_permission('library.circulation.manage'));

CREATE POLICY "reservations_policy" ON public.reservations FOR ALL TO authenticated USING (
    user_id = auth.uid() OR public.has_permission('library.circulation.manage')
);

CREATE POLICY "fines_policy" ON public.library_fines FOR ALL TO authenticated USING (
    user_id = auth.uid() OR public.has_permission('library.circulation.manage')
);

-- Hostel:
CREATE POLICY "residences_read" ON public.residences FOR SELECT TO authenticated USING (true);
CREATE POLICY "hostel_rooms_read" ON public.hostel_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "beds_read" ON public.beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "residences_write" ON public.residences FOR ALL TO authenticated USING (public.has_permission('hostel.inventory.manage'));
CREATE POLICY "rooms_write" ON public.hostel_rooms FOR ALL TO authenticated USING (public.has_permission('hostel.inventory.manage'));
CREATE POLICY "beds_write" ON public.beds FOR ALL TO authenticated USING (public.has_permission('hostel.inventory.manage'));

CREATE POLICY "accom_apps_select" ON public.accommodation_applications FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('hostel.allocation.manage')
);
CREATE POLICY "accom_apps_insert" ON public.accommodation_applications FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
);

CREATE POLICY "allocations_select" ON public.allocations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('hostel.allocation.manage')
);
CREATE POLICY "allocations_write" ON public.allocations FOR ALL TO authenticated USING (public.has_permission('hostel.allocation.manage'));

CREATE POLICY "occupancy_policy" ON public.occupancy_events FOR ALL TO authenticated USING (public.has_permission('hostel.allocation.manage'));
CREATE POLICY "maint_policy" ON public.maintenance_requests FOR ALL TO authenticated USING (
    reported_by = auth.uid() OR public.has_permission('hostel.inventory.manage')
);

-- HR & Staff:
CREATE POLICY "staff_select" ON public.staff FOR SELECT TO authenticated USING (
    profile_id = auth.uid()
    OR public.has_permission('hr.staff.manage')
    OR public.has_role('system_admin')
);
CREATE POLICY "staff_write" ON public.staff FOR ALL TO authenticated USING (public.has_permission('hr.staff.manage'));

CREATE POLICY "employment_records_policy" ON public.employment_records FOR ALL TO authenticated USING (
    public.has_permission('hr.staff.manage')
);

CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff st WHERE st.id = staff_id AND st.profile_id = auth.uid())
    OR public.has_permission('hr.leave.approve')
);
CREATE POLICY "leave_insert" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff st WHERE st.id = staff_id AND st.profile_id = auth.uid())
);
CREATE POLICY "leave_update" ON public.leave_requests FOR UPDATE TO authenticated USING (
    public.has_permission('hr.leave.approve')
);

CREATE POLICY "leave_balances_select" ON public.leave_balances FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff st WHERE st.id = staff_id AND st.profile_id = auth.uid())
    OR public.has_permission('hr.leave.approve')
);

CREATE POLICY "staff_docs_policy" ON public.staff_documents FOR ALL TO authenticated USING (
    public.has_permission('hr.staff.manage')
);

CREATE POLICY "teaching_loads_select" ON public.teaching_loads FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff st WHERE st.id = staff_id AND st.profile_id = auth.uid())
    OR public.has_permission('academics.offering.manage')
);

-- Communications:
CREATE POLICY "announcements_read" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_write" ON public.announcements FOR ALL TO authenticated USING (public.has_permission('system.config.manage'));

CREATE POLICY "notif_templates_read" ON public.notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "notif_templates_write" ON public.notification_templates FOR ALL TO authenticated USING (public.has_permission('system.config.manage'));

CREATE POLICY "notifications_policy" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "delivery_policy" ON public.delivery_attempts FOR ALL TO authenticated USING (public.has_role('system_admin'));

-- Support Cases:
CREATE POLICY "cases_select" ON public.support_cases FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR assigned_to = auth.uid()
    OR public.has_role('system_admin')
    OR public.has_role('academic_advisor')
);
CREATE POLICY "cases_insert" ON public.support_cases FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
);
CREATE POLICY "cases_update" ON public.support_cases FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR assigned_to = auth.uid()
    OR public.has_role('system_admin')
);

CREATE POLICY "case_comments_select" ON public.case_comments FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.support_cases sc
        JOIN public.students s ON s.id = sc.student_id
        WHERE sc.id = case_id AND (
            (s.profile_id = auth.uid() AND is_internal_note = false)
            OR sc.assigned_to = auth.uid()
            OR public.has_role('system_admin')
        )
    )
);
CREATE POLICY "case_comments_insert" ON public.case_comments FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid()
);

CREATE POLICY "case_events_policy" ON public.case_events FOR ALL TO authenticated USING (true);
CREATE POLICY "case_assignments_policy" ON public.case_assignments FOR ALL TO authenticated USING (true);

-- System Settings & Jobs:
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT TO authenticated USING (
    is_sensitive = false OR public.has_role('system_admin')
);
CREATE POLICY "settings_write" ON public.system_settings FOR ALL TO authenticated USING (public.has_permission('system.config.manage'));

CREATE POLICY "integrations_policy" ON public.integration_configs FOR ALL TO authenticated USING (public.has_role('system_admin'));
CREATE POLICY "job_runs_policy" ON public.job_runs FOR ALL TO authenticated USING (public.has_role('system_admin'));

CREATE POLICY "exports_policy" ON public.export_jobs FOR ALL TO authenticated USING (
    requested_by = auth.uid() OR public.has_role('system_admin')
);

CREATE POLICY "feature_flags_read" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_flags_write" ON public.feature_flags FOR ALL TO authenticated USING (public.has_role('system_admin'));
