-- ==============================================================================
-- 00002_organization_and_academics.sql
-- University Management System: Organization & Academic Curriculum Structures
-- ==============================================================================

-- 1. Campuses
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Faculties / Schools
CREATE TABLE IF NOT EXISTS public.faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    dean_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_faculties_dean ON public.faculties(dean_id);
CREATE INDEX IF NOT EXISTS idx_faculties_campus ON public.faculties(campus_id);

-- 3. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    hod_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_departments_faculty ON public.departments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_departments_hod ON public.departments(hod_id);

-- 4. Buildings & Rooms
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_campus_building_code UNIQUE (campus_id, code)
);

CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'lecture_hall', -- 'lecture_hall', 'lab', 'tutorial', 'auditorium', 'office'
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    equipment JSONB DEFAULT '[]'::jsonb,
    is_accessible BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_building_room_code UNIQUE (building_id, code)
);

CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building_id);

-- 5. Academic Years & Terms / Semesters
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. '2026/2027'
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_number INTEGER NOT NULL CHECK (term_number IN (1, 2, 3)),
    name TEXT NOT NULL, -- e.g. 'Semester 1', 'Semester 2'
    code TEXT NOT NULL UNIQUE, -- e.g. '2026-SEM1'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_year_term UNIQUE (academic_year_id, term_number)
);

CREATE INDEX IF NOT EXISTS idx_terms_year ON public.terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_terms_active ON public.terms(is_active);

-- 6. Programmes & Curriculum
CREATE TABLE IF NOT EXISTS public.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE, -- e.g. 'BSC-CS'
    name TEXT NOT NULL,
    degree_level TEXT NOT NULL DEFAULT 'undergraduate', -- 'undergraduate', 'postgraduate', 'diploma', 'certificate', 'doctorate'
    duration_years INTEGER NOT NULL DEFAULT 4 CHECK (duration_years > 0),
    total_credits_required INTEGER NOT NULL DEFAULT 120 CHECK (total_credits_required > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_programmes_department ON public.programmes(department_id);

CREATE TABLE IF NOT EXISTS public.programme_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
    version_name TEXT NOT NULL, -- e.g. '2026 Curriculum'
    effective_academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    total_credits INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_prog_version UNIQUE (programme_id, version_name)
);

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE, -- e.g. 'CS101'
    name TEXT NOT NULL,
    description TEXT,
    credits NUMERIC(3,1) NOT NULL DEFAULT 3.0 CHECK (credits >= 0),
    contact_hours INTEGER NOT NULL DEFAULT 3,
    course_type TEXT NOT NULL DEFAULT 'core', -- 'core', 'elective', 'general'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(code);

CREATE TABLE IF NOT EXISTS public.curriculum_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_version_id UUID NOT NULL REFERENCES public.programme_versions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    semester_level INTEGER NOT NULL CHECK (semester_level IN (100, 200, 300, 400, 500, 600, 700, 800)),
    is_elective BOOLEAN NOT NULL DEFAULT false,
    min_pass_grade TEXT DEFAULT 'D',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_curriculum_course UNIQUE (programme_version_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    min_grade TEXT DEFAULT 'D',
    is_corequisite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_course_prereq UNIQUE (course_id, prerequisite_course_id)
);

-- 7. Course Offerings & Teaching Assignments
CREATE TABLE IF NOT EXISTS public.course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    section TEXT NOT NULL DEFAULT 'A',
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    delivery_mode TEXT NOT NULL DEFAULT 'in_person', -- 'in_person', 'online', 'hybrid'
    capacity INTEGER NOT NULL DEFAULT 50 CHECK (capacity > 0),
    enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_term_course_section UNIQUE (term_id, course_id, section)
);

CREATE INDEX IF NOT EXISTS idx_course_offerings_term ON public.course_offerings(term_id);
CREATE INDEX IF NOT EXISTS idx_course_offerings_course ON public.course_offerings(course_id);

CREATE TABLE IF NOT EXISTS public.teaching_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'lecturer', -- 'lecturer', 'teaching_assistant', 'moderator'
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_offering_staff_role UNIQUE (course_offering_id, staff_id, role)
);

CREATE INDEX IF NOT EXISTS idx_teaching_assignments_staff ON public.teaching_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_offering ON public.teaching_assignments(course_offering_id);

-- 8. Helper function: Is user lecturer for offering?
CREATE OR REPLACE FUNCTION public.is_lecturer_for_offering(
    p_offering_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teaching_assignments ta
        WHERE ta.course_offering_id = p_offering_id
          AND ta.staff_id = p_user_id
    );
$$;

-- ==============================================================================
-- 9. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;

-- Read policies: Published academic structures are readable by all authenticated users
CREATE POLICY "campuses_read_all" ON public.campuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "faculties_read_all" ON public.faculties FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_read_all" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "buildings_read_all" ON public.buildings FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_read_all" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "academic_years_read_all" ON public.academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "terms_read_all" ON public.terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "programmes_read_all" ON public.programmes FOR SELECT TO authenticated USING (true);
CREATE POLICY "programme_versions_read_all" ON public.programme_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_read_all" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "curriculum_read_all" ON public.curriculum_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "prerequisites_read_all" ON public.prerequisites FOR SELECT TO authenticated USING (true);

-- Course Offerings Read:
-- Anyone can see published offerings. Draft offerings visible to assigned staff, department HOD, or academic admins.
CREATE POLICY "offerings_read" ON public.course_offerings FOR SELECT TO authenticated USING (
    status = 'published'
    OR public.has_permission('academics.offering.manage')
    OR public.is_lecturer_for_offering(id, auth.uid())
);

-- Teaching assignments read:
CREATE POLICY "teaching_assignments_read" ON public.teaching_assignments FOR SELECT TO authenticated USING (true);

-- Modifications write policies:
-- Controlled by academics.course.manage / academics.curriculum.manage / academics.offering.manage / system_admin
CREATE POLICY "campuses_write_admin" ON public.campuses FOR ALL USING (public.has_permission('system.config.manage'));
CREATE POLICY "faculties_write_admin" ON public.faculties FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "departments_write_admin" ON public.departments FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "buildings_write_admin" ON public.buildings FOR ALL USING (public.has_permission('system.config.manage'));
CREATE POLICY "rooms_write_admin" ON public.rooms FOR ALL USING (public.has_permission('timetable.manage'));
CREATE POLICY "academic_years_write_admin" ON public.academic_years FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "terms_write_admin" ON public.terms FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "programmes_write_admin" ON public.programmes FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "programme_versions_write_admin" ON public.programme_versions FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "courses_write_admin" ON public.courses FOR ALL USING (public.has_permission('academics.course.manage'));
CREATE POLICY "curriculum_write_admin" ON public.curriculum_requirements FOR ALL USING (public.has_permission('academics.curriculum.manage'));
CREATE POLICY "prerequisites_write_admin" ON public.prerequisites FOR ALL USING (public.has_permission('academics.course.manage'));
CREATE POLICY "offerings_write_admin" ON public.course_offerings FOR ALL USING (public.has_permission('academics.offering.manage'));
CREATE POLICY "teaching_assignments_write_admin" ON public.teaching_assignments FOR ALL USING (public.has_permission('academics.offering.manage'));
