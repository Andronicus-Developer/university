import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { getUniversities } from "@/lib/superadmin/service";
import {
  toPortalSchoolType,
  type PortalSchoolType,
} from "@/config/schoolPortalConfig";

const AUTHORIZED_STAFF_ROLES = new Set([
  "lecturer",
  "teacher",
  "instructor",
  "academic_advisor",
  "advisor",
  "head_of_department",
  "dean",
  "registrar",
  "system_admin",
  "school_admin",
  "admin",
  "administrator",
  "superadmin",
]);

export interface StaffResolvedContext {
  userId: string;
  email: string;
  fullName: string;
  primaryRole: string;
  roles: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  schoolId: string;
  schoolName: string;
  schoolAbbr: string;
  schoolLogo: string;
  schoolType: PortalSchoolType;
  avatarUrl: string;
  staffProfile: any | null;
  staffId: string | null;
  department: any | null;
  activeYear: any | null;
  activeTerm: any | null;
  assignedCourseIds: string[];
  assignedSubjectIds: string[];
  assignedModuleIds: string[];
  assignedClassId: string | null;
  isClassTeacher: boolean;
}

export function isMissingTableOrColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").trim();
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the column")
  );
}

export function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "").trim();
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function safeStaffQuery<T = any>(
  queryPromise: PromiseLike<{ data: T | null; error: any }>
): Promise<{ data: T | null; missing: boolean; error: any }> {
  try {
    const res = await queryPromise;
    if (res?.error) {
      return {
        data: null,
        missing: isMissingTableOrColumnError(res.error),
        error: res.error,
      };
    }
    return { data: res?.data ?? null, missing: false, error: null };
  } catch (err) {
    return { data: null, missing: isMissingTableOrColumnError(err), error: err };
  }
}

export function staffDisplayName(sp: any): string {
  if (!sp) return "Instructor";
  const combined = `${sp.first_name || ""} ${sp.last_name || ""}`.trim();
  if (combined && combined !== "-") return combined;
  if (sp.full_name) return String(sp.full_name).trim();
  return sp.email || "Academic Staff";
}

export function studentDisplayName(st: any): string {
  if (!st) return "Student";
  const combined = `${st.first_name || ""} ${st.last_name || ""}`.trim();
  if (combined && combined !== "-") return combined;
  if (st.full_name) return String(st.full_name).trim();
  return st.email || st.student_number || "Student";
}

export async function resolveAcademicStaffContext(
  req: NextRequest
): Promise<
  | { ctx: StaffResolvedContext; errorResponse: null }
  | { ctx: null; errorResponse: NextResponse }
> {
  if (typeof window !== "undefined") {
    throw new Error("resolveAcademicStaffContext must only execute on the server");
  }

  const cookies = req.cookies
    .getAll()
    .map((c) => ({ name: c.name, value: c.value }));
  const tenantCtx = resolveTenantContextFromHeaders(req.headers, cookies);
  const { user } = await updateSession(req).catch(() => ({ user: null as any }));

  const activeUserId = user?.id || tenantCtx.userId;
  const activeEmail = String(user?.email || tenantCtx.email || "")
    .trim()
    .toLowerCase();

  if (!activeUserId && !tenantCtx.isAuthenticated) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const directAdmin = createDirectAdminClient();
  const virtualAdmin = createAdminClient();
  const rolesSet = new Set<string>();

  const pushRole = (val: unknown) => {
    if (typeof val === "string" && val.trim()) {
      rolesSet.add(val.trim().toLowerCase());
    }
  };

  pushRole(user?.app_metadata?.role);
  pushRole(user?.app_metadata?.default_role);
  pushRole(user?.user_metadata?.role);
  pushRole(user?.user_metadata?.default_role);
  pushRole(tenantCtx.role);

  let schoolId: string | null = null;
  let profileRow: any = null;

  // 1. Resolve authoritative profile & school_id
  if (activeUserId) {
    let { data: prof, missing: profMissing } = await safeStaffQuery<any>(
      (directAdmin as any)
        .from("profiles")
        .select("id, school_id, university_id, full_name, email, phone, role, avatar_url, metadata")
        .eq("id", activeUserId)
        .maybeSingle()
    );
    if (!prof && profMissing) {
      const fb = await safeStaffQuery<any>(
        (directAdmin as any)
          .from("profiles")
          .select("id, school_id, university_id, full_name, email, phone, role, metadata")
          .eq("id", activeUserId)
          .maybeSingle()
      );
      prof = fb.data;
    }
    if (prof) {
      profileRow = prof;
      pushRole(prof.role);
      if (prof.school_id || prof.university_id) {
        schoolId = String(prof.school_id || prof.university_id);
      }
    }
  }

  // 2. Check school_memberships
  if (activeUserId) {
    const { data: mems } = await safeStaffQuery<any[]>(
      (directAdmin as any)
        .from("school_memberships")
        .select("school_id, role, status, roles(code)")
        .eq("user_id", activeUserId)
        .eq("status", "active")
    );
    for (const m of mems || []) {
      if (!schoolId && m?.school_id) schoolId = String(m.school_id);
      pushRole(m?.role);
      pushRole(m?.roles?.code);
    }
  }

  // 3. Check own staff_profiles row (never unscoped .limit(1))
  let ownStaffRow: any = null;
  if (activeUserId) {
    const { data: spByUser } = await safeStaffQuery<any>(
      (directAdmin as any)
        .from("staff_profiles")
        .select("*")
        .eq("user_id", activeUserId)
        .maybeSingle()
    );
    if (spByUser) {
      ownStaffRow = spByUser;
      if (!schoolId && spByUser.school_id) schoolId = String(spByUser.school_id);
      pushRole(spByUser.role_code);
    }
  }
  if (!ownStaffRow && activeEmail) {
    const { data: spByEmail } = await safeStaffQuery<any>(
      (directAdmin as any)
        .from("staff_profiles")
        .select("*")
        .ilike("email", activeEmail)
        .maybeSingle()
    );
    if (spByEmail) {
      ownStaffRow = spByEmail;
      if (!schoolId && spByEmail.school_id) schoolId = String(spByEmail.school_id);
      pushRole(spByEmail.role_code);
    }
  }

  if (!schoolId) {
    schoolId =
      user?.app_metadata?.school_id ||
      user?.app_metadata?.university_id ||
      user?.user_metadata?.school_id ||
      user?.user_metadata?.university_id ||
      tenantCtx.schoolId ||
      null;
  }

  const isSuperAdmin =
    tenantCtx.isSuperAdmin ||
    activeEmail === "superadmin@university.edu.gh" ||
    rolesSet.has("superadmin");

  if (isSuperAdmin) {
    const requested =
      req.nextUrl.searchParams.get("school_id") ||
      req.headers.get("x-tenant-school-id") ||
      schoolId;
    schoolId = requested || null;
  }

  const roles = Array.from(rolesSet);
  const isAdmin =
    isSuperAdmin ||
    roles.some((r) =>
      ["system_admin", "school_admin", "admin", "administrator", "registrar", "dean", "head_of_department"].includes(r)
    );

  const hasStaffAccess =
    isSuperAdmin ||
    Boolean(ownStaffRow?.id) ||
    roles.some((r) => AUTHORIZED_STAFF_ROLES.has(r));

  if (!hasStaffAccess) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden: Academic Staff privileges are required." },
        { status: 403 }
      ),
    };
  }

  if (!schoolId) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Your staff account is not linked to an institution. Contact your School Administrator.",
        },
        { status: 403 }
      ),
    };
  }

  // Re-verify staffProfile strictly scoped to resolved schoolId
  if (ownStaffRow && String(ownStaffRow.school_id).toLowerCase() !== String(schoolId).toLowerCase()) {
    ownStaffRow = null;
  }
  if (!ownStaffRow && activeUserId) {
    const { data: scopedSp } = await safeStaffQuery<any>(
      (directAdmin as any)
        .from("staff_profiles")
        .select("*")
        .eq("school_id", schoolId)
        .or(
          activeEmail
            ? `user_id.eq.${activeUserId},email.ilike.${activeEmail}`
            : `user_id.eq.${activeUserId}`
        )
        .maybeSingle()
    );
    ownStaffRow = scopedSp || null;
  }

  // Load authoritative school details
  const [{ data: liveSchool }, allSchools] = await Promise.all([
    safeStaffQuery<any>(
      (directAdmin as any)
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle()
    ),
    getUniversities().catch(() => []),
  ]);

  const fallbackSchool = allSchools.find(
    (s) => String(s.id).toLowerCase() === String(schoolId).toLowerCase()
  );

  if (!liveSchool && !fallbackSchool) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "School institution not found or access denied." },
        { status: 403 }
      ),
    };
  }

  const rawSchoolType =
    liveSchool?.school_type || (fallbackSchool as any)?.school_type || "university";
  const schoolType = toPortalSchoolType(rawSchoolType);
  const schoolName = String(liveSchool?.name || fallbackSchool?.name || "Institution");
  const schoolAbbr = String(
    liveSchool?.tenant_slug || liveSchool?.slug || fallbackSchool?.code || ""
  ).toUpperCase();
  const schoolLogo = String(liveSchool?.logo_url || "");

  // Resolve department, academic year, term, and explicit teaching assignments
  const spMeta =
    (ownStaffRow?.metadata && typeof ownStaffRow.metadata === "object"
      ? ownStaffRow.metadata
      : profileRow?.metadata?.staff_profile) || {};

  const staffProfileId = ownStaffRow?.id ? String(ownStaffRow.id) : null;

  const [deptRes, yearsRes, termsRes, directCoursesRes, directSubjectsRes, directModulesRes, vAssignmentsRes, timetableAssignRes] =
    await Promise.all([
      ownStaffRow?.department_id
        ? safeStaffQuery<any>(
            (directAdmin as any)
              .from("departments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("id", ownStaffRow.department_id)
              .maybeSingle()
          )
        : Promise.resolve({ data: null, missing: false, error: null }),
      safeStaffQuery<any[]>(
        (directAdmin as any)
          .from("academic_years")
          .select("*")
          .eq("school_id", schoolId)
          .order("is_current", { ascending: false })
          .order("start_date", { ascending: false })
      ),
      safeStaffQuery<any[]>(
        (directAdmin as any)
          .from("terms")
          .select("*")
          .eq("school_id", schoolId)
          .order("is_current", { ascending: false })
          .order("term_number", { ascending: true })
      ),
      staffProfileId
        ? safeStaffQuery<any[]>(
            (directAdmin as any)
              .from("courses")
              .select("id")
              .eq("school_id", schoolId)
              .eq("lecturer_id", staffProfileId)
          )
        : Promise.resolve({ data: [], missing: false, error: null }),
      staffProfileId
        ? safeStaffQuery<any[]>(
            (directAdmin as any)
              .from("subjects")
              .select("id, programme_id")
              .eq("school_id", schoolId)
              .eq("teacher_id", staffProfileId)
          )
        : Promise.resolve({ data: [], missing: false, error: null }),
      staffProfileId
        ? safeStaffQuery<any[]>(
            (directAdmin as any)
              .from("vocational_modules")
              .select("id")
              .eq("school_id", schoolId)
              .eq("instructor_id", staffProfileId)
          )
        : Promise.resolve({ data: [], missing: false, error: null }),
      activeUserId
        ? safeStaffQuery<any[]>(
            (virtualAdmin as any)
              .from("teaching_assignments")
              .select("course_offering:course_offering_id(course_id)")
              .eq("school_id", schoolId)
              .eq("staff_id", activeUserId)
          )
        : Promise.resolve({ data: [], missing: false, error: null }),
      staffProfileId
        ? safeStaffQuery<any[]>(
            (directAdmin as any)
              .from("timetable_entries")
              .select("subject_id, programme_id")
              .eq("school_id", schoolId)
              .eq("teacher_id", staffProfileId)
          )
        : Promise.resolve({ data: [], missing: false, error: null }),
    ]);

  const activeYear =
    (yearsRes.data || []).find((y: any) => y.is_current) || yearsRes.data?.[0] || null;
  const activeTerm =
    (termsRes.data || []).find((t: any) => t.is_current || t.is_active) ||
    termsRes.data?.[0] ||
    null;

  const courseSet = new Set<string>();
  for (const c of directCoursesRes.data || []) if (c?.id) courseSet.add(String(c.id));
  if (Array.isArray(spMeta.assigned_course_ids)) {
    for (const id of spMeta.assigned_course_ids) if (id) courseSet.add(String(id));
  }
  for (const va of vAssignmentsRes.data || []) {
    const cid = va?.course_offering?.course_id;
    if (cid) courseSet.add(String(cid));
  }

  const subjectSet = new Set<string>();
  const timetableClassIds: string[] = [];
  for (const s of directSubjectsRes.data || []) {
    if (s?.id) subjectSet.add(String(s.id));
    if (s?.programme_id) timetableClassIds.push(String(s.programme_id));
  }
  if (Array.isArray(spMeta.teaching_subject_ids)) {
    for (const id of spMeta.teaching_subject_ids) if (id) subjectSet.add(String(id));
  }
  for (const tt of timetableAssignRes.data || []) {
    if (tt?.subject_id) subjectSet.add(String(tt.subject_id));
    if (tt?.programme_id) timetableClassIds.push(String(tt.programme_id));
  }

  const moduleSet = new Set<string>();
  for (const m of directModulesRes.data || []) if (m?.id) moduleSet.add(String(m.id));
  if (Array.isArray(spMeta.assigned_module_ids)) {
    for (const id of spMeta.assigned_module_ids) if (id) moduleSet.add(String(id));
  }

  const resolvedAssignedClassId = spMeta.assigned_class_id
    ? String(spMeta.assigned_class_id)
    : timetableClassIds[0] || null;

  const avatarUrl = String(
    ownStaffRow?.avatar_url ||
      profileRow?.avatar_url ||
      user?.user_metadata?.avatar_url ||
      ""
  );

  const fullName =
    (ownStaffRow ? staffDisplayName(ownStaffRow) : null) ||
    profileRow?.full_name ||
    user?.user_metadata?.full_name ||
    activeEmail ||
    "Academic Staff";

  const primaryRole =
    ownStaffRow?.role_code ||
    profileRow?.role ||
    roles[0] ||
    (schoolType === "university"
      ? "lecturer"
      : schoolType === "vocational"
      ? "instructor"
      : "teacher");

  return {
    ctx: {
      userId: String(activeUserId),
      email: activeEmail,
      fullName,
      primaryRole: String(primaryRole).toLowerCase(),
      roles,
      isSuperAdmin,
      isAdmin,
      schoolId,
      schoolName,
      schoolAbbr,
      schoolLogo,
      schoolType,
      avatarUrl,
      staffProfile: ownStaffRow
        ? {
            ...ownStaffRow,
            full_name: staffDisplayName(ownStaffRow),
            avatar_url: avatarUrl || ownStaffRow.avatar_url || null,
            metadata: spMeta,
          }
        : null,
      staffId: staffProfileId,
      department: deptRes.data || null,
      activeYear,
      activeTerm,
      assignedCourseIds: Array.from(courseSet),
      assignedSubjectIds: Array.from(subjectSet),
      assignedModuleIds: Array.from(moduleSet),
      assignedClassId: resolvedAssignedClassId,
      isClassTeacher: Boolean(spMeta.is_class_teacher),
    },
    errorResponse: null,
  };
}
