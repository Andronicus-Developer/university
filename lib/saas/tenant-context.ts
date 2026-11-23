import {
  decodeUserFromJwt,
  extractUserFromCookies,
} from "@/lib/supabase/fetch";

export const SCHOOL_A_ID = "u0000001-0000-0000-0000-000000000001";
export const SCHOOL_B_ID = "u0000002-0000-0000-0000-000000000002";
export const SCHOOL_C_ID = "u0000003-0000-0000-0000-000000000003";

export interface TenantContext {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  role: string;
  isSuperAdmin: boolean;
  schoolId: string | null;
  schoolCode?: string;
  schoolName?: string;
  schoolType?: "university" | "high_school" | "vocational_school";
  subscriptionPlan?: "starter" | "professional" | "enterprise";
}

/**
 * All database tables whose rows are strictly isolated per school tenant (`school_id` / `university_id`).
 * Users of School A can ONLY read, insert, update, or delete rows where `school_id === School A`.
 */
export const TENANT_SCOPED_TABLES = new Set<string>([
  "profiles",
  "user_role_assignments",
  "campuses",
  "faculties",
  "departments",
  "programmes",
  "academic_years",
  "terms",
  "courses",
  "course_offerings",
  "staff",
  "employment_records",
  "teaching_assignments",
  "students",
  "course_enrolments",
  "assessment_components",
  "assessment_marks",
  "published_results",
  "grade_scales",
  "grade_scale_items",
  "fee_items",
  "fee_schedules",
  "student_invoices",
  "invoice_lines",
  "payments",
  "payment_allocations",
  "receipts",
  "scholarships",
  "waivers",
  "refund_requests",
  "financial_approvals",
  "settlement_batches",
  "buildings",
  "rooms",
  "timetable_events",
  "timetable_publications",
  "class_sessions",
  "attendance_records",
  "attendance_amendments",
  "leave_requests",
  "announcements",
  "notifications",
  "generated_documents",
  "service_requests",
  "residences",
  "hostel_rooms",
  "beds",
  "allocations",
  "maintenance_requests",
  "library_items",
  "item_copies",
  "loans",
  "transport_routes",
  "transport_vehicles",
  "admission_cycles",
  "applications",
  "application_programmes",
  "application_reviews",
  "admission_decisions",
  "offers",
  "support_cases",
  "result_submissions",
  "result_approvals",
  "result_amendments",
  "curriculum_requirements",
  "prerequisites",
  "enrolment_overrides",
  "student_programme_history",
  "student_status_history",
  "institutional_reports",
]);

/**
 * Resolves the tenant `school_id` for a given user object.
 * Returns `null` for Super Administrators (who operate across all tenants).
 */
export function resolveSchoolIdForUser(
  user: Record<string, any> | null | undefined,
  vdb?: Record<string, any[]>
): { isSuperAdmin: boolean; schoolId: string | null; role: string } {
  if (!user) {
    return { isSuperAdmin: false, schoolId: null, role: "anonymous" };
  }

  const email = String(user.email || "").trim().toLowerCase();
  const appRole = user.app_metadata?.role || user.app_metadata?.default_role;
  const metaRole = user.user_metadata?.role || user.user_metadata?.default_role;

  const isSuperAdmin =
    email === "superadmin@university.edu.gh" ||
    appRole === "superadmin" ||
    user.id === "1440ed7e-cb23-4248-a372-f38b20d01554";

  if (isSuperAdmin) {
    return { isSuperAdmin: true, schoolId: null, role: "superadmin" };
  }

  const role = appRole || metaRole || "student";

  // 1. Check explicit school_id / university_id on user metadata
  const metaSchoolId =
    user.user_metadata?.school_id ||
    user.user_metadata?.university_id ||
    user.app_metadata?.school_id ||
    user.app_metadata?.university_id;

  if (metaSchoolId && typeof metaSchoolId === "string") {
    return { isSuperAdmin: false, schoolId: metaSchoolId, role };
  }

  // 2. Check virtual DB profiles, school_memberships & university_system_admins if available
  const db = vdb || (globalThis as any).__UMS_VIRTUAL_DB__;
  if (db) {
    if (Array.isArray(db.school_memberships)) {
      const mem = db.school_memberships.find(
        (m: any) =>
          String(m.user_id) === String(user.id) &&
          String(m.status || "active").toLowerCase() === "active" &&
          m.school_id
      );
      if (mem?.school_id) {
        return {
          isSuperAdmin: false,
          schoolId: String(mem.school_id),
          role: mem.role || role,
        };
      }
    }

    if (Array.isArray(db.university_system_admins)) {
      const mapping = db.university_system_admins.find(
        (m: any) => String(m.user_id) === String(user.id)
      );
      if (mapping?.university_id) {
        return {
          isSuperAdmin: false,
          schoolId: String(mapping.university_id),
          role,
        };
      }
    }

    if (Array.isArray(db.profiles)) {
      const profile = db.profiles.find(
        (p: any) =>
          String(p.id) === String(user.id) ||
          (email && String(p.email || "").trim().toLowerCase() === email)
      );
      if (profile) {
        const profSchoolId =
          profile.school_id ||
          profile.university_id ||
          profile.metadata?.school_id ||
          profile.metadata?.university_id;
        if (profSchoolId) {
          return {
            isSuperAdmin: false,
            schoolId: String(profSchoolId),
            role: profile.role || profile.metadata?.role || role,
          };
        }
      }
    }
  }

  // Default unassigned tenant
  return { isSuperAdmin: false, schoolId: null, role };
}

/**
 * Extracts the authenticated TenantContext from request headers and cookies.
 */
export function resolveTenantContextFromHeaders(
  headers?: Headers | Record<string, string> | null,
  cookies?: Array<{ name: string; value: string }>,
  vdb?: Record<string, any[]>
): TenantContext {
  let authHeader = "";
  let explicitTenantHeader = "";
  let cookieHeaderStr = "";

  if (headers instanceof Headers) {
    authHeader = headers.get("authorization") || "";
    explicitTenantHeader = headers.get("x-tenant-school-id") || "";
    cookieHeaderStr = headers.get("cookie") || "";
  } else if (headers && typeof headers === "object") {
    authHeader =
      (headers as any)["authorization"] ||
      (headers as any)["Authorization"] ||
      "";
    explicitTenantHeader = (headers as any)["x-tenant-school-id"] || "";
    cookieHeaderStr =
      (headers as any)["cookie"] || (headers as any)["Cookie"] || "";
  }

  let parsedCookies = cookies || [];
  if (parsedCookies.length === 0 && cookieHeaderStr) {
    parsedCookies = cookieHeaderStr.split(";").map((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return { name: pair.trim(), value: "" };
      return {
        name: pair.slice(0, idx).trim(),
        value: pair.slice(idx + 1).trim(),
      };
    });
  }

  const user =
    decodeUserFromJwt(authHeader) || extractUserFromCookies(parsedCookies);

  if (!user) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      role: "anonymous",
      isSuperAdmin: false,
      schoolId: explicitTenantHeader || null,
    };
  }

  const activeVdb = vdb || (globalThis as any).__UMS_VIRTUAL_DB__;
  const { isSuperAdmin, schoolId, role } = resolveSchoolIdForUser(user, activeVdb);
  const effectiveSchoolId = isSuperAdmin
    ? explicitTenantHeader || null
    : schoolId;

  let schoolCode = "";
  let schoolName = "";
  let schoolType: "university" | "high_school" | "vocational_school" =
    "university";
  let subscriptionPlan: "starter" | "professional" | "enterprise" =
    "enterprise";

  if (effectiveSchoolId && activeVdb && Array.isArray(activeVdb.universities)) {
    const schoolRow = activeVdb.universities.find(
      (u: any) => String(u.id) === String(effectiveSchoolId)
    );
    if (schoolRow) {
      schoolCode = schoolRow.code || schoolCode;
      schoolName = schoolRow.name || schoolName;
      schoolType =
        schoolRow.school_type || schoolRow.institution_type || "university";
      subscriptionPlan = schoolRow.subscription_plan || "enterprise";
    }
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    email: user.email,
    role,
    isSuperAdmin,
    schoolId: effectiveSchoolId,
    schoolCode,
    schoolName,
    schoolType,
    subscriptionPlan,
  };
}

/**
 * Checks whether a given row in a tenant-scoped table belongs to `tenantSchoolId`.
 * Ensures strict tenant isolation: School A users can ONLY access School A rows.
 */
export function rowBelongsToTenant(
  tableName: string,
  row: Record<string, any>,
  tenantSchoolId: string | null,
  currentUserId?: string | null,
  isSuperAdmin?: boolean
): boolean {
  if (!tenantSchoolId) {
    // Allow Super Admin (or explicitly trusted service-role callers) to see all rows
    if (isSuperAdmin !== false) return true;
    // Allow non-superadmin users with no school assignment to see only their own profile row
    if (
      tableName === "profiles" &&
      currentUserId &&
      String(row.id) === String(currentUserId)
    ) {
      return true;
    }
    if (
      tableName !== "schools" &&
      tableName !== "universities" &&
      !TENANT_SCOPED_TABLES.has(tableName)
    ) {
      return true;
    }
    return false;
  }

  // For the `universities` / `schools` table itself, only allow viewing their own school row
  if (tableName === "universities" || tableName === "schools") {
    return String(row.id) === String(tenantSchoolId);
  }

  if (!TENANT_SCOPED_TABLES.has(tableName)) {
    return true;
  }

  // Always allow a user to read their own profile row
  if (
    tableName === "profiles" &&
    currentUserId &&
    String(row.id) === String(currentUserId)
  ) {
    return true;
  }

  const rowSchoolId =
    row.school_id ||
    row.university_id ||
    row.metadata?.school_id ||
    row.metadata?.university_id ||
    null;

  return String(rowSchoolId) === String(tenantSchoolId);
}

/**
 * Stamps any newly inserted row with the caller's `school_id` and `university_id`.
 */
export function stampRowWithTenant<T extends Record<string, any>>(
  tableName: string,
  row: T,
  tenantSchoolId: string | null
): T {
  if (!tenantSchoolId || !TENANT_SCOPED_TABLES.has(tableName)) {
    return row;
  }

  const stamped: Record<string, any> = {
    ...row,
    school_id: row.school_id || tenantSchoolId,
    university_id: row.university_id || tenantSchoolId,
  };

  if (tableName === "profiles") {
    stamped.metadata = {
      ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
      school_id: row.school_id || tenantSchoolId,
      university_id: row.university_id || tenantSchoolId,
    };
  }

  return stamped as T;
}
