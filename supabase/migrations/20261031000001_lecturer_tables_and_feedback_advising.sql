-- ==============================================================================
-- 20261031000001_lecturer_tables_and_feedback_advising.sql
-- Schema extensions for Lecturer Portal:
-- 1. student_feedback (Course evaluation, ratings, and student feedback)
-- 2. academic_advising_assignments (Advisors assigned to students)
-- 3. advising_sessions (Advising meetings, interaction notes, and action plans)
-- 4. lecturer_tasks (Actionable task checklist for lecturer dashboard)
-- ==============================================================================

-- 1. Student Feedback / Course Evaluations
CREATE TABLE IF NOT EXISTS public.student_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_offering_id UUID NOT NULL REFERENCES public.course_offerings(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  lecturer_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  clarity_rating NUMERIC(3, 2) DEFAULT 5.0,
  engagement_rating NUMERIC(3, 2) DEFAULT 5.0,
  support_rating NUMERIC(3, 2) DEFAULT 5.0,
  comments TEXT,
  sentiment VARCHAR(20) DEFAULT 'positive' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_anonymous BOOLEAN DEFAULT true,
  term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_student_feedback_offering ON public.student_feedback(course_offering_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_lecturer ON public.student_feedback(lecturer_profile_id);

-- 2. Academic Advising Assignments
CREATE TABLE IF NOT EXISTS public.academic_advising_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred', 'inactive')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  UNIQUE(advisor_profile_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_advising_advisor ON public.academic_advising_assignments(advisor_profile_id);
CREATE INDEX IF NOT EXISTS idx_advising_student ON public.academic_advising_assignments(student_id);

-- 3. Advising Sessions & Case Logs
CREATE TABLE IF NOT EXISTS public.advising_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advising_assignment_id UUID REFERENCES public.academic_advising_assignments(id) ON DELETE CASCADE,
  advisor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  category VARCHAR(50) DEFAULT 'academic' CHECK (category IN ('academic', 'career', 'personal', 'probation', 'registration', 'general')),
  summary TEXT NOT NULL,
  action_plan TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_advising_sessions_advisor ON public.advising_sessions(advisor_profile_id);
CREATE INDEX IF NOT EXISTS idx_advising_sessions_student ON public.advising_sessions(student_id);

-- 4. Lecturer Dashboard Task Checklist
CREATE TABLE IF NOT EXISTS public.lecturer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  due_date TIMESTAMPTZ,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category VARCHAR(50) DEFAULT 'academic',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lecturer_tasks_profile ON public.lecturer_tasks(lecturer_profile_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_advising_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advising_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecturer_tasks ENABLE ROW LEVEL SECURITY;

-- Allow system_admin and service_role full control
CREATE POLICY "Admins have full access to student_feedback" ON public.student_feedback
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to academic_advising_assignments" ON public.academic_advising_assignments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to advising_sessions" ON public.advising_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to lecturer_tasks" ON public.lecturer_tasks
  FOR ALL USING (true) WITH CHECK (true);

