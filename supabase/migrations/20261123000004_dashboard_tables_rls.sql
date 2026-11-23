-- ============================================================================
-- Migration: 20261123000004_dashboard_tables_rls.sql
-- Purpose:
--   Ensure authenticated School Admins can SELECT school-scoped dashboard tables
--   (students, staff_profiles, invoices, payments, attendance_records,
--   class_groups) matching their `school_id`, and Super Admins have global access.
-- ============================================================================

-- 1. Grant baseline SELECT privileges to authenticated role
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.attendance_records TO authenticated;
GRANT SELECT ON public.class_groups TO authenticated;

-- 2. Enable RLS across dashboard summary tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

-- 3. public.students
DROP POLICY IF EXISTS "Super Admin full access on students" ON public.students;
DROP POLICY IF EXISTS "School Admin read own school students" ON public.students;

CREATE POLICY "Super Admin full access on students"
  ON public.students
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin read own school students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

-- 4. public.staff_profiles (preserve Users read own staff profile alongside School Admin tenant SELECT)
DROP POLICY IF EXISTS "Super Admin full access on staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "School Admin read own school staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users read own staff profile" ON public.staff_profiles;

CREATE POLICY "Super Admin full access on staff_profiles"
  ON public.staff_profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users read own staff profile"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "School Admin read own school staff_profiles"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

-- 5. public.invoices
DROP POLICY IF EXISTS "Super Admin full access on invoices" ON public.invoices;
DROP POLICY IF EXISTS "School Admin read own school invoices" ON public.invoices;

CREATE POLICY "Super Admin full access on invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin read own school invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

-- 6. public.payments
DROP POLICY IF EXISTS "Super Admin full access on payments" ON public.payments;
DROP POLICY IF EXISTS "School Admin read own school payments" ON public.payments;

CREATE POLICY "Super Admin full access on payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin read own school payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

-- 7. public.attendance_records
DROP POLICY IF EXISTS "Super Admin full access on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "School Admin read own school attendance_records" ON public.attendance_records;

CREATE POLICY "Super Admin full access on attendance_records"
  ON public.attendance_records
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin read own school attendance_records"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );

-- 8. public.class_groups
DROP POLICY IF EXISTS "Super Admin full access on class_groups" ON public.class_groups;
DROP POLICY IF EXISTS "School Admin read own school class_groups" ON public.class_groups;

CREATE POLICY "Super Admin full access on class_groups"
  ON public.class_groups
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "School Admin read own school class_groups"
  ON public.class_groups
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.get_current_user_school_id()
    AND public.is_school_admin()
  );
