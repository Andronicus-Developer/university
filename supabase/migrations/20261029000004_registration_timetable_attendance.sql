-- ==============================================================================
-- 00004_registration_timetable_attendance.sql
-- University Management System: Registration, Enrolment, Timetable & Attendance
-- ==============================================================================

-- 1. Registration Periods
CREATE TABLE IF NOT EXISTS public.registration_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    programme_level INTEGER CHECK (programme_level IN (100, 200, 300, 400, 500, 600, 700, 800)),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL CHECK (end_date > start_date),
    late_registration_deadline TIMESTAMPTZ,
    add_drop_deadline TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reg_periods_term ON public.registration_periods(term_id);

-- 2. Course Enrolments
CREATE TABLE IF NOT EXISTS public.course_enrolments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE RESTRICT,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    enrolment_status TEXT NOT NULL DEFAULT 'selected' CHECK (enrolment_status IN (
        'selected',
        'pending_approval',
        'enrolled',
        'dropped',
        'withdrawn',
        'completed'
    )),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    final_grade TEXT,
    grade_points NUMERIC(3,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_offering UNIQUE (student_id, course_offering_id)
);

CREATE INDEX IF NOT EXISTS idx_enrolments_student ON public.course_enrolments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_offering ON public.course_enrolments(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_term ON public.course_enrolments(term_id);

-- 3. Enrolment Overrides (Capacity, Prerequisite, Credit limit, or Late overrides)
CREATE TABLE IF NOT EXISTS public.enrolment_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id UUID NOT NULL REFERENCES public.course_enrolments(id) ON DELETE CASCADE,
    override_type TEXT NOT NULL CHECK (override_type IN ('capacity', 'prerequisite', 'credit_limit', 'late', 'standing')),
    approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Credit Load Snapshots
CREATE TABLE IF NOT EXISTS public.credit_load_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    total_credits NUMERIC(4,1) NOT NULL DEFAULT 0.0,
    max_allowed_credits NUMERIC(4,1) NOT NULL DEFAULT 21.0,
    calculated_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_term_snapshot UNIQUE (student_id, term_id)
);

-- 5. Timetable Events & Room Allocations
CREATE TABLE IF NOT EXISTS public.timetable_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Monday ... 7 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    recurrence_pattern TEXT NOT NULL DEFAULT 'weekly',
    staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_timetable_offering ON public.timetable_events(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_timetable_room ON public.timetable_events(room_id);

CREATE TABLE IF NOT EXISTS public.room_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    timetable_event_id UUID REFERENCES public.timetable_events(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'released', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_room_slot UNIQUE (room_id, date, start_time)
);

CREATE TABLE IF NOT EXISTS public.timetable_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    published_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 6. Class Sessions & Attendance
CREATE TABLE IF NOT EXISTS public.class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    topic TEXT,
    conducted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_offering ON public.class_sessions(course_offering_id);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_session_student UNIQUE (class_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance_records(class_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id);

CREATE TABLE IF NOT EXISTS public.attendance_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. Triggers for Automatic Enrolled Count Sync
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_course_offering_enrolment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.enrolment_status = 'enrolled' THEN
        UPDATE public.course_offerings
        SET enrolled_count = enrolled_count + 1
        WHERE id = NEW.course_offering_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.enrolment_status <> 'enrolled' AND NEW.enrolment_status = 'enrolled' THEN
            UPDATE public.course_offerings
            SET enrolled_count = enrolled_count + 1
            WHERE id = NEW.course_offering_id;
        ELSIF OLD.enrolment_status = 'enrolled' AND NEW.enrolment_status <> 'enrolled' THEN
            UPDATE public.course_offerings
            SET enrolled_count = GREATEST(0, enrolled_count - 1)
            WHERE id = NEW.course_offering_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.enrolment_status = 'enrolled' THEN
        UPDATE public.course_offerings
        SET enrolled_count = GREATEST(0, enrolled_count - 1)
        WHERE id = OLD.course_offering_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_enrolment_count ON public.course_enrolments;
CREATE TRIGGER trg_sync_enrolment_count
AFTER INSERT OR UPDATE OR DELETE ON public.course_enrolments
FOR EACH ROW EXECUTE FUNCTION public.sync_course_offering_enrolment_count();

-- ==============================================================================
-- 8. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.registration_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolment_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_load_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_amendments ENABLE ROW LEVEL SECURITY;

-- Registration Periods: Read by all authenticated; write by academic admin
CREATE POLICY "reg_periods_read" ON public.registration_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "reg_periods_write" ON public.registration_periods FOR ALL TO authenticated USING (
    public.has_permission('academics.curriculum.manage')
    OR public.has_role('registrar')
);

-- Course Enrolments:
-- Student can view own enrolments; assigned lecturers can view class lists
CREATE POLICY "enrolments_select" ON public.course_enrolments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.is_lecturer_for_offering(course_offering_id, auth.uid())
    OR public.has_permission('registration.enrolment.manage')
    OR public.has_role('registrar')
    OR public.has_role('academic_advisor')
);

-- Student can create own enrolment if registration period is active and no active holds
CREATE POLICY "enrolments_insert_student" ON public.course_enrolments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
          AND s.profile_id = auth.uid()
          AND s.status = 'active'
          AND NOT EXISTS (
              SELECT 1 FROM public.student_holds sh
              WHERE sh.student_id = s.id AND sh.is_active = true
          )
    )
    OR public.has_permission('registration.enrolment.manage')
);

CREATE POLICY "enrolments_update" ON public.course_enrolments FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('registration.enrolment.manage')
    OR public.has_role('registrar')
);

-- Enrolment overrides:
CREATE POLICY "overrides_select" ON public.enrolment_overrides FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.course_enrolments ce
        JOIN public.students s ON s.id = ce.student_id
        WHERE ce.id = enrolment_id AND (s.profile_id = auth.uid() OR public.has_permission('registration.enrolment.manage'))
    )
);
CREATE POLICY "overrides_write" ON public.enrolment_overrides FOR ALL TO authenticated USING (
    public.has_permission('registration.override.approve')
    OR public.has_role('registrar')
);

-- Timetable & Rooms:
CREATE POLICY "timetable_read" ON public.timetable_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "room_allocations_read" ON public.room_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "timetable_pubs_read" ON public.timetable_publications FOR SELECT TO authenticated USING (true);
CREATE POLICY "timetable_write" ON public.timetable_events FOR ALL TO authenticated USING (public.has_permission('timetable.manage'));
CREATE POLICY "room_alloc_write" ON public.room_allocations FOR ALL TO authenticated USING (public.has_permission('timetable.manage'));
CREATE POLICY "timetable_pubs_write" ON public.timetable_publications FOR ALL TO authenticated USING (public.has_permission('timetable.publish'));

-- Attendance:
CREATE POLICY "class_sessions_read" ON public.class_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "class_sessions_write" ON public.class_sessions FOR ALL TO authenticated USING (
    public.is_lecturer_for_offering(course_offering_id, auth.uid())
    OR public.has_permission('attendance.record')
);

CREATE POLICY "attendance_records_select" ON public.attendance_records FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.class_sessions cs
        WHERE cs.id = class_session_id AND public.is_lecturer_for_offering(cs.course_offering_id, auth.uid())
    )
    OR public.has_permission('attendance.record')
);

CREATE POLICY "attendance_records_insert_update" ON public.attendance_records FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.class_sessions cs
        WHERE cs.id = class_session_id AND (public.is_lecturer_for_offering(cs.course_offering_id, auth.uid()) OR public.has_permission('attendance.record'))
    )
);

CREATE POLICY "attendance_amendments_policy" ON public.attendance_amendments FOR ALL TO authenticated USING (
    public.has_permission('attendance.amend')
    OR public.has_role('registrar')
);
