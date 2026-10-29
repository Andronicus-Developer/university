-- ==============================================================================
-- seed.sql
-- University Management System: Baseline Seed Data
-- Standard Ghana Tertiary Configuration
-- ==============================================================================

-- 1. Insert Core Roles (17 Distinct Roles from Documentation Table 4)
INSERT INTO public.roles (code, name, description, is_system_role)
VALUES
    ('system_admin', 'System Administrator', 'Technical configuration, integrations, user management, and operational maintenance.', true),
    ('vice_chancellor', 'Vice-Chancellor / Executive', 'Executive institutional oversight, strategic performance dashboards, and read-only reporting.', true),
    ('registrar', 'Registrar', 'Authoritative student records, academic calendar, graduation, transcripts, and official certifications.', true),
    ('academic_affairs_officer', 'Academic Affairs Officer', 'Curriculum setup, programme requirements, semester calendar, and results administration.', true),
    ('dean', 'Faculty Dean', 'Faculty oversight, academic workload, teaching allocations, and faculty-level result moderation.', true),
    ('head_of_department', 'Head of Department', 'Departmental courses, course offerings, teaching assignments, and departmental result reviews.', true),
    ('admissions_officer', 'Admissions Officer', 'Application processing, document verification, applicant scoring, and admissions recommendation.', true),
    ('finance_officer', 'Finance Officer / Bursar', 'Fee schedules, student invoicing, payment verification, receipts, reconciliation, and refunds.', true),
    ('lecturer', 'Lecturer / Instructor', 'Assigned course offerings, class lists, attendance recording, assessment setup, and mark sheets.', true),
    ('academic_advisor', 'Academic Advisor', 'Assigned student advisees, academic progression monitoring, and advising case notes.', true),
    ('student', 'Student', 'Personal academic record, course registration, personal timetable, published grades, and fee payments.', true),
    ('applicant', 'Applicant', 'Admission application form, document upload, status check, and offer acceptance/decline.', true),
    ('librarian', 'Librarian', 'Library bibliographic catalogue, book copies, circulation desk, returns, reservations, and fines.', true),
    ('hostel_officer', 'Hostel Officer', 'Residence halls, room inventories, bed space allocation, check-in/out, and maintenance requests.', true),
    ('hr_officer', 'Human Resources Officer', 'Staff records, employment contracts, leave management, teaching load verification, and HR records.', true),
    ('auditor', 'Internal / External Auditor', 'Immutable audit logs, financial transaction evidence, compliance, and academic records audit.', true),
    ('parent_sponsor', 'Parent / Sponsor', 'Read-only access to sponsored student invoices, verified receipts, and approved announcements.', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Insert Permissions across all Functional Modules
INSERT INTO public.permissions (code, module, description)
VALUES
    -- Identity & RBAC
    ('users.roles.manage', 'identity', 'Assign roles, scopes, and manage user accounts'),
    ('identity.user.read', 'identity', 'View user directory and profiles'),
    ('identity.user.update', 'identity', 'Update user profiles and account statuses'),
    ('audit.events.read', 'identity', 'Read immutable audit event log'),

    -- Admissions
    ('admissions.cycle.manage', 'admissions', 'Create and configure admission cycles and application periods'),
    ('admissions.application.read', 'admissions', 'Read submitted applications and applicant documents'),
    ('admissions.application.submit', 'admissions', 'Submit and edit own admission application'),
    ('admissions.application.review', 'admissions', 'Review, score, and provide recommendations on applications'),
    ('admissions.decision.approve', 'admissions', 'Approve final admission decisions and issue offer letters'),

    -- Academics & Curriculum
    ('academics.curriculum.manage', 'academics', 'Configure faculties, departments, programmes, and versions'),
    ('academics.course.manage', 'academics', 'Create and modify courses and prerequisites'),
    ('academics.offering.manage', 'academics', 'Create course offerings, sections, and assign teaching staff'),

    -- Registration & Enrolments
    ('registration.enrolment.manage', 'registration', 'Manage registration windows, student enrolments, and class lists'),
    ('registration.override.approve', 'registration', 'Approve enrolment overrides for capacity, prerequisites, or late registration'),

    -- Timetable & Rooms
    ('timetable.manage', 'timetable', 'Schedule classes, laboratories, and allocate rooms'),
    ('timetable.publish', 'timetable', 'Validate clash detection and publish term timetable'),

    -- Attendance
    ('attendance.record', 'attendance', 'Conduct class sessions and record student attendance'),
    ('attendance.amend', 'attendance', 'Approve amendments to historical attendance records'),

    -- Assessment & Results
    ('results.marks.submit', 'assessment', 'Configure assessment components and submit mark sheets'),
    ('results.marks.moderate', 'assessment', 'Moderate mark sheets and request revisions'),
    ('results.approve', 'assessment', 'Approve moderated results at department or faculty board'),
    ('results.publish', 'assessment', 'Publish approved results and lock records'),
    ('results.amend', 'assessment', 'Formally amend published grades through change workflow'),

    -- Finance & Payments
    ('finance.invoice.create', 'finance', 'Configure fee schedules and post student semester invoices'),
    ('finance.invoice.read', 'finance', 'View student invoices and balance statements'),
    ('finance.payment.record', 'finance', 'Record manual payments and process settlement entries'),
    ('finance.refund.request', 'finance', 'Initiate student refund requests'),
    ('finance.refund.approve', 'finance', 'Approve student refund requests with dual control'),
    ('finance.waiver.manage', 'finance', 'Grant fee discounts, scholarships, and fee waivers'),
    ('finance.holds.manage', 'finance', 'Place and remove financial holds on student accounts'),
    ('finance.reconcile', 'finance', 'Perform provider settlement reconciliation'),

    -- Registry & Documents
    ('registry.student.read', 'registry', 'Access student academic record and profile'),
    ('registry.student.status_change', 'registry', 'Authorize changes to student status, level, or programme'),
    ('registry.transcript.issue', 'registry', 'Issue official university transcripts and certifications'),
    ('registry.letter.issue', 'registry', 'Generate and issue official university letters'),

    -- Library
    ('library.catalog.manage', 'library', 'Manage bibliographic catalogue, titles, and copies'),
    ('library.circulation.manage', 'library', 'Issue loans, process returns, reservations, and fines'),

    -- Hostel
    ('hostel.inventory.manage', 'hostel', 'Manage halls of residence, rooms, and bed spaces'),
    ('hostel.allocation.manage', 'hostel', 'Process accommodation applications, bed allocation, and check-in'),

    -- HR
    ('hr.staff.manage', 'hr', 'Manage staff records, contracts, and employment status'),
    ('hr.leave.approve', 'hr', 'Review and approve staff leave requests'),

    -- Communications & Support
    ('communications.announce', 'communications', 'Publish university-wide or cohort announcements'),
    ('support.ticket.manage', 'support', 'Resolve student advising and helpdesk support cases'),

    -- Reports & Analytics
    ('reports.view.admissions', 'reports', 'View admissions funnel and applicant statistics'),
    ('reports.view.academic', 'reports', 'View enrolment census, broadsheets, and progression statistics'),
    ('reports.view.finance', 'reports', 'View fee collection, ageing balance, and reconciliation reports'),
    ('reports.view.audit', 'reports', 'View security events and comprehensive audit reports'),

    -- System
    ('system.config.manage', 'system', 'Configure institutions, campuses, integration keys, and settings')
ON CONFLICT (code) DO NOTHING;

-- 3. Populate Role-Permission Mappings
DO $$
DECLARE
    v_role_admin UUID;
    v_role_vc UUID;
    v_role_registrar UUID;
    v_role_academic_affairs UUID;
    v_role_dean UUID;
    v_role_hod UUID;
    v_role_admissions UUID;
    v_role_finance UUID;
    v_role_lecturer UUID;
    v_role_advisor UUID;
    v_role_student UUID;
    v_role_applicant UUID;
    v_role_librarian UUID;
    v_role_hostel UUID;
    v_role_hr UUID;
    v_role_auditor UUID;
BEGIN
    SELECT id INTO v_role_admin FROM public.roles WHERE code = 'system_admin';
    SELECT id INTO v_role_vc FROM public.roles WHERE code = 'vice_chancellor';
    SELECT id INTO v_role_registrar FROM public.roles WHERE code = 'registrar';
    SELECT id INTO v_role_academic_affairs FROM public.roles WHERE code = 'academic_affairs_officer';
    SELECT id INTO v_role_dean FROM public.roles WHERE code = 'dean';
    SELECT id INTO v_role_hod FROM public.roles WHERE code = 'head_of_department';
    SELECT id INTO v_role_admissions FROM public.roles WHERE code = 'admissions_officer';
    SELECT id INTO v_role_finance FROM public.roles WHERE code = 'finance_officer';
    SELECT id INTO v_role_lecturer FROM public.roles WHERE code = 'lecturer';
    SELECT id INTO v_role_advisor FROM public.roles WHERE code = 'academic_advisor';
    SELECT id INTO v_role_student FROM public.roles WHERE code = 'student';
    SELECT id INTO v_role_applicant FROM public.roles WHERE code = 'applicant';
    SELECT id INTO v_role_librarian FROM public.roles WHERE code = 'librarian';
    SELECT id INTO v_role_hostel FROM public.roles WHERE code = 'hostel_officer';
    SELECT id INTO v_role_hr FROM public.roles WHERE code = 'hr_officer';
    SELECT id INTO v_role_auditor FROM public.roles WHERE code = 'auditor';

    -- System Admin gets all permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_admin, p.id FROM public.permissions p
    ON CONFLICT DO NOTHING;

    -- Vice-Chancellor (Read-only leadership oversight)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_vc, p.id FROM public.permissions p
    WHERE p.code IN (
        'reports.view.admissions', 'reports.view.academic', 'reports.view.finance', 'reports.view.audit',
        'audit.events.read', 'registry.student.read', 'finance.invoice.read', 'identity.user.read'
    )
    ON CONFLICT DO NOTHING;

    -- Registrar
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_registrar, p.id FROM public.permissions p
    WHERE p.code IN (
        'registry.student.read', 'registry.student.status_change', 'registry.transcript.issue',
        'registry.letter.issue', 'admissions.decision.approve', 'admissions.application.read',
        'registration.enrolment.manage', 'registration.override.approve', 'results.publish',
        'reports.view.academic', 'reports.view.admissions', 'communications.announce'
    )
    ON CONFLICT DO NOTHING;

    -- Academic Affairs Officer
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_academic_affairs, p.id FROM public.permissions p
    WHERE p.code IN (
        'academics.curriculum.manage', 'academics.course.manage', 'academics.offering.manage',
        'timetable.manage', 'timetable.publish', 'registration.enrolment.manage', 'results.approve',
        'reports.view.academic', 'registry.student.read'
    )
    ON CONFLICT DO NOTHING;

    -- Dean (Faculty oversight)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_dean, p.id FROM public.permissions p
    WHERE p.code IN (
        'academics.curriculum.manage', 'academics.offering.manage', 'results.approve',
        'reports.view.academic', 'registry.student.read', 'attendance.amend'
    )
    ON CONFLICT DO NOTHING;

    -- Head of Department (HOD)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_hod, p.id FROM public.permissions p
    WHERE p.code IN (
        'academics.course.manage', 'academics.offering.manage', 'results.marks.moderate',
        'results.approve', 'registry.student.read', 'attendance.record', 'attendance.amend'
    )
    ON CONFLICT DO NOTHING;

    -- Admissions Officer
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_admissions, p.id FROM public.permissions p
    WHERE p.code IN (
        'admissions.cycle.manage', 'admissions.application.read', 'admissions.application.review',
        'reports.view.admissions'
    )
    ON CONFLICT DO NOTHING;

    -- Finance Officer / Bursar
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_finance, p.id FROM public.permissions p
    WHERE p.code IN (
        'finance.invoice.create', 'finance.invoice.read', 'finance.payment.record',
        'finance.refund.request', 'finance.refund.approve', 'finance.waiver.manage',
        'finance.holds.manage', 'finance.reconcile', 'reports.view.finance'
    )
    ON CONFLICT DO NOTHING;

    -- Lecturer
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_lecturer, p.id FROM public.permissions p
    WHERE p.code IN (
        'attendance.record', 'results.marks.submit', 'registry.student.read'
    )
    ON CONFLICT DO NOTHING;

    -- Academic Advisor
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_advisor, p.id FROM public.permissions p
    WHERE p.code IN (
        'registry.student.read', 'support.advising.manage', 'support.ticket.manage'
    )
    ON CONFLICT DO NOTHING;

    -- Student
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_student, p.id FROM public.permissions p
    WHERE p.code IN (
        'finance.invoice.read'
    )
    ON CONFLICT DO NOTHING;

    -- Applicant
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_applicant, p.id FROM public.permissions p
    WHERE p.code IN (
        'admissions.application.submit'
    )
    ON CONFLICT DO NOTHING;

    -- Librarian
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_librarian, p.id FROM public.permissions p
    WHERE p.code IN (
        'library.catalog.manage', 'library.circulation.manage'
    )
    ON CONFLICT DO NOTHING;

    -- Hostel Officer
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_hostel, p.id FROM public.permissions p
    WHERE p.code IN (
        'hostel.inventory.manage', 'hostel.allocation.manage'
    )
    ON CONFLICT DO NOTHING;

    -- HR Officer
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_hr, p.id FROM public.permissions p
    WHERE p.code IN (
        'hr.staff.manage', 'hr.leave.approve'
    )
    ON CONFLICT DO NOTHING;

    -- Auditor
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_auditor, p.id FROM public.permissions p
    WHERE p.code IN (
        'audit.events.read', 'reports.view.audit', 'reports.view.finance', 'reports.view.academic',
        'registry.student.read', 'finance.invoice.read'
    )
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Baseline Ghana Tertiary Grading Scale
DO $$
DECLARE
    v_scale_id UUID;
BEGIN
    INSERT INTO public.grade_scales (name, description, is_default)
    VALUES ('Ghana Tertiary 4.0 Standard Scale', 'Standard university grading policy used across Ghana universities.', true)
    ON CONFLICT (name) DO UPDATE SET is_default = true
    RETURNING id INTO v_scale_id;

    IF v_scale_id IS NULL THEN
        SELECT id INTO v_scale_id FROM public.grade_scales WHERE name = 'Ghana Tertiary 4.0 Standard Scale';
    END IF;

    -- Grade scale items
    INSERT INTO public.grade_scale_items (grade_scale_id, letter_grade, min_percentage, max_percentage, grade_points, pass_status, remarks)
    VALUES
        (v_scale_id, 'A',  80.00, 100.00, 4.00, true,  'Excellent'),
        (v_scale_id, 'B+', 75.00, 79.99,  3.50, true,  'Very Good'),
        (v_scale_id, 'B',  70.00, 74.99,  3.00, true,  'Good'),
        (v_scale_id, 'C+', 65.00, 69.99,  2.50, true,  'Fairly Good'),
        (v_scale_id, 'C',  60.00, 64.99,  2.00, true,  'Average'),
        (v_scale_id, 'D+', 55.00, 59.99,  1.50, true,  'Pass'),
        (v_scale_id, 'D',  50.00, 54.99,  1.00, true,  'Marginal Pass'),
        (v_scale_id, 'F',   0.00, 49.99,  0.00, false, 'Fail')
    ON CONFLICT (grade_scale_id, letter_grade) DO NOTHING;
END $$;

-- 5. Standard Fee Items
INSERT INTO public.fee_items (code, name, description, default_amount, is_mandatory)
VALUES
    ('TUITION_UG', 'Undergraduate Tuition Fee', 'Instruction and academic facility fee per semester.', 3500.00, true),
    ('EXAM_FEE', 'Examination Fee', 'Semester examination administration and invigilation fee.', 250.00, true),
    ('LIBRARY_FEE', 'Library & Research Resources Fee', 'Digital databases and campus library services fee.', 150.00, true),
    ('TECH_FEE', 'Technology & IT Services Fee', 'High-speed campus Wi-Fi, LMS access, and student portal.', 300.00, true),
    ('SRC_DUES', 'Student Representative Council (SRC) Dues', 'Annual student union levy.', 100.00, true),
    ('MEDICAL_FEE', 'Campus Clinic & Medical Services', 'Campus health insurance and emergency clinic care.', 200.00, true),
    ('REGISTRATION_FEE', 'Matriculation & Registration Fee', 'New student onboarding and ID card issuance.', 180.00, false)
ON CONFLICT (code) DO NOTHING;

-- 6. Document Templates
INSERT INTO public.document_templates (code, name, template_type, template_body)
VALUES
    (
        'OFFICIAL_TRANSCRIPT',
        'Official Academic Transcript',
        'transcript',
        'This is to certify that {{student_name}} (Student Number: {{student_number}}) was admitted in {{admission_year}} to study {{programme_name}} at the University. The following is the verified cumulative academic performance as of {{issue_date}} with CGPA {{cgpa}}.'
    ),
    (
        'ENROLMENT_VERIFICATION',
        'Certificate of Enrolment',
        'enrollment_letter',
        'To Whom It May Concern: This certifies that {{student_name}} (ID: {{student_number}}) is currently enrolled as a full-time student in {{programme_name}}, Level {{current_level}}, for the {{academic_year}} Academic Year.'
    ),
    (
        'ENGLISH_PROFICIENCY',
        'English Language Proficiency Attestation',
        'english_proficiency',
        'This letter serves to confirm that the medium of instruction and examination at this University is exclusively English. {{student_name}} (ID: {{student_number}}) has completed coursework conducted in English.'
    )
ON CONFLICT (code) DO NOTHING;

-- 7. Baseline University Organization (Ghana Main Campus)
DO $$
DECLARE
    v_campus_id UUID;
    v_faculty_id UUID;
    v_dept_id UUID;
    v_year_id UUID;
    v_term_id UUID;
    v_prog_id UUID;
    v_prog_ver_id UUID;
    v_c1 UUID;
    v_c2 UUID;
    v_c3 UUID;
BEGIN
    -- Main Campus
    INSERT INTO public.campuses (code, name, location)
    VALUES ('MAIN_ACCRA', 'Accra Central Campus', 'Legon, Accra, Greater Accra Region, Ghana')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_campus_id;

    IF v_campus_id IS NULL THEN
        SELECT id INTO v_campus_id FROM public.campuses WHERE code = 'MAIN_ACCRA';
    END IF;

    -- Faculty of Information and Communication Technology
    INSERT INTO public.faculties (campus_id, code, name, description)
    VALUES (v_campus_id, 'FICT', 'Faculty of Information and Communication Technology', 'Center of excellence for Computing, Software, and Network Engineering')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_faculty_id;

    IF v_faculty_id IS NULL THEN
        SELECT id INTO v_faculty_id FROM public.faculties WHERE code = 'FICT';
    END IF;

    -- Department of Computer Science
    INSERT INTO public.departments (faculty_id, code, name, description)
    VALUES (v_faculty_id, 'CS_DEPT', 'Department of Computer Science', 'Department offering undergraduate and postgraduate Computer Science programmes')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_dept_id;

    IF v_dept_id IS NULL THEN
        SELECT id INTO v_dept_id FROM public.departments WHERE code = 'CS_DEPT';
    END IF;

    -- Academic Year 2026/2027
    INSERT INTO public.academic_years (code, name, start_date, end_date, is_current)
    VALUES ('2026/2027', '2026/2027 Academic Year', '2026-09-01', '2027-08-31', true)
    ON CONFLICT (code) DO UPDATE SET is_current = true
    RETURNING id INTO v_year_id;

    IF v_year_id IS NULL THEN
        SELECT id INTO v_year_id FROM public.academic_years WHERE code = '2026/2027';
    END IF;

    -- Term / Semester 1
    INSERT INTO public.terms (academic_year_id, term_number, name, code, start_date, end_date, is_active)
    VALUES (v_year_id, 1, 'First Semester 2026/2027', '2026-SEM1', '2026-09-01', '2026-12-20', true)
    ON CONFLICT (code) DO UPDATE SET is_active = true
    RETURNING id INTO v_term_id;

    -- Programme: BSc Computer Science
    INSERT INTO public.programmes (department_id, code, name, degree_level, duration_years, total_credits_required)
    VALUES (v_dept_id, 'BSC_CS', 'BSc Computer Science', 'undergraduate', 4, 130)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_prog_id;

    IF v_prog_id IS NULL THEN
        SELECT id INTO v_prog_id FROM public.programmes WHERE code = 'BSC_CS';
    END IF;

    -- Programme Version
    INSERT INTO public.programme_versions (programme_id, version_name, effective_academic_year_id, total_credits)
    VALUES (v_prog_id, '2026 Baseline Curriculum', v_year_id, 130)
    ON CONFLICT (programme_id, version_name) DO UPDATE SET total_credits = EXCLUDED.total_credits
    RETURNING id INTO v_prog_ver_id;

    -- Core Courses
    INSERT INTO public.courses (department_id, code, name, description, credits, contact_hours, course_type)
    VALUES 
        (v_dept_id, 'CS101', 'Introduction to Computing', 'Foundations of computer systems, digital logic, and algorithms.', 3.0, 3, 'core'),
        (v_dept_id, 'CS102', 'Programming Fundamentals', 'Procedural and object-oriented programming with TypeScript and Python.', 3.0, 4, 'core'),
        (v_dept_id, 'MATH101', 'Calculus for Computer Science', 'Differential and integral calculus with applied computer science problem sets.', 3.0, 3, 'core')
    ON CONFLICT (code) DO NOTHING;

    -- Curriculum Requirements
    SELECT id INTO v_c1 FROM public.courses WHERE code = 'CS101';
    SELECT id INTO v_c2 FROM public.courses WHERE code = 'CS102';
    SELECT id INTO v_c3 FROM public.courses WHERE code = 'MATH101';

    IF v_prog_ver_id IS NOT NULL AND v_c1 IS NOT NULL THEN
        INSERT INTO public.curriculum_requirements (programme_version_id, course_id, semester_level, is_elective, min_pass_grade)
        VALUES 
            (v_prog_ver_id, v_c1, 100, false, 'D'),
            (v_prog_ver_id, v_c2, 100, false, 'D'),
            (v_prog_ver_id, v_c3, 100, false, 'D')
        ON CONFLICT (programme_version_id, course_id) DO NOTHING;
    END IF;
END $$;

-- 8. Baseline System Settings
INSERT INTO public.system_settings (setting_key, setting_value, category, description, is_sensitive)
VALUES
    ('institution_info', jsonb_build_object(
        'name', 'Premier University of Technology',
        'abbreviation', 'PUT',
        'country', 'Ghana',
        'city', 'Accra',
        'currency', 'GHS',
        'timezone', 'Africa/Accra',
        'website', 'https://university.edu.gh'
    ), 'general', 'General institution identity metadata', false),
    ('academic_policy', jsonb_build_object(
        'min_registration_credits', 15.0,
        'max_registration_credits', 21.0,
        'pass_mark_threshold', 50.0,
        'attendance_warning_threshold_pct', 75.0,
        'dual_control_refund_threshold_ghs', 1000.00
    ), 'academics', 'Academic regulations and thresholds', false),
    ('payment_gateways', jsonb_build_object(
        'default_provider', 'paystack',
        'supported_providers', jsonb_build_array('paystack', 'hubtel', 'bank_transfer'),
        'currency', 'GHS',
        'auto_receipt_generation', true
    ), 'finance', 'Payment provider configurations', false)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- 9. Baseline System Administrator User
DO $$
DECLARE
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_admin_role_id UUID;
    v_email TEXT := 'admin@university.edu.gh';
    v_password TEXT := 'Admin@123456';
BEGIN
    SELECT id INTO v_admin_role_id FROM public.roles WHERE code = 'system_admin';

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

    IF v_admin_role_id IS NOT NULL THEN
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
    END IF;
END $$;


