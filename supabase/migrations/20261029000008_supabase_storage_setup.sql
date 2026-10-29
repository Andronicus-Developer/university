-- ==============================================================================
-- 00008_supabase_storage_setup.sql
-- University Management System: Supabase Storage Buckets & Storage RLS
-- ==============================================================================

-- 1. Create Private and Public Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'application-documents',
        'application-documents',
        false,
        15728640, -- 15 MB
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
    ),
    (
        'student-documents',
        'student-documents',
        false,
        26214400, -- 25 MB
        ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
    ),
    (
        'staff-documents',
        'staff-documents',
        false,
        26214400, -- 25 MB
        ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']::text[]
    ),
    (
        'course-materials',
        'course-materials',
        false,
        104857600, -- 100 MB
        ARRAY['application/pdf', 'application/zip', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png']::text[]
    ),
    (
        'public-assets',
        'public-assets',
        true,
        5242880, -- 5 MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
    )
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- 2. Storage RLS Policies (storage.objects)
-- ==============================================================================

-- Public Assets: Publicly readable by all
CREATE POLICY "public_assets_select_all" ON storage.objects
FOR SELECT USING (bucket_id = 'public-assets');

CREATE POLICY "public_assets_manage_admin" ON storage.objects
FOR ALL TO authenticated USING (
    bucket_id = 'public-assets' 
    AND (public.has_permission('system.config.manage') OR public.has_role('system_admin'))
);

-- Application Documents (Private):
-- Applicant can upload to path prefixed with their user_id: 'user_id/...'
CREATE POLICY "app_docs_storage_insert_applicant" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Applicant can view their own documents; admissions staff can view all application docs
CREATE POLICY "app_docs_storage_select" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'application-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.has_permission('admissions.application.review')
        OR public.has_role('admissions_officer')
        OR public.has_role('registrar')
        OR public.has_role('system_admin')
    )
);

CREATE POLICY "app_docs_storage_delete_applicant" ON storage.objects
FOR DELETE TO authenticated USING (
    bucket_id = 'application-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Student Documents (Private transcripts, letters, verification):
-- Student can download their own documents: 'student_number/...' or 'profile_id/...'
CREATE POLICY "student_docs_storage_select" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'student-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.profile_id = auth.uid()
              AND (storage.foldername(name))[1] = s.student_number
        )
        OR public.has_permission('registry.transcript.issue')
        OR public.has_role('registrar')
        OR public.has_role('system_admin')
    )
);

-- Registry officers can upload generated documents
CREATE POLICY "student_docs_storage_write_registry" ON storage.objects
FOR ALL TO authenticated USING (
    bucket_id = 'student-documents'
    AND (
        public.has_permission('registry.transcript.issue')
        OR public.has_role('registrar')
        OR public.has_role('system_admin')
    )
);

-- Staff Documents (Private HR contracts, appraisals):
CREATE POLICY "staff_docs_storage_select" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'staff-documents'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.has_permission('hr.staff.manage')
        OR public.has_role('hr_officer')
        OR public.has_role('system_admin')
    )
);

CREATE POLICY "staff_docs_storage_manage_hr" ON storage.objects
FOR ALL TO authenticated USING (
    bucket_id = 'staff-documents'
    AND (
        public.has_permission('hr.staff.manage')
        OR public.has_role('hr_officer')
        OR public.has_role('system_admin')
    )
);

-- Course Materials:
-- Lecturers can upload to 'offering_id/...' if assigned
CREATE POLICY "course_materials_storage_upload_lecturer" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'course-materials'
    AND (
        public.is_lecturer_for_offering(((storage.foldername(name))[1])::uuid, auth.uid())
        OR public.has_permission('academics.offering.manage')
        OR public.has_role('system_admin')
    )
);

-- Students enrolled in the offering or staff can view course materials
CREATE POLICY "course_materials_storage_select" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'course-materials'
    AND (
        public.is_lecturer_for_offering(((storage.foldername(name))[1])::uuid, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.course_enrolments ce
            JOIN public.students s ON s.id = ce.student_id
            WHERE ce.course_offering_id = ((storage.foldername(name))[1])::uuid
              AND s.profile_id = auth.uid()
              AND ce.enrolment_status IN ('enrolled', 'completed')
        )
        OR public.has_permission('academics.offering.manage')
        OR public.has_role('system_admin')
    )
);
