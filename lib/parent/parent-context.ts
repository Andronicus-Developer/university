import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { toPortalSchoolType, type PortalSchoolType } from "@/config/schoolPortalConfig";

export interface WardSummary {
  id: string;
  student_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: string;
  current_level: number | null;
  programme_id: string | null;
  department_id: string | null;
  class_group_id: string | null;
  intake_id: string | null;
  programme_name: string | null;
  department_name: string | null;
  class_group_name: string | null;
  intake_name: string | null;
  relationship: string;
}

export interface ParentResolvedContext {
  userId: string;
  email: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
  schoolType: PortalSchoolType;
  currency: string;
  schoolLogo: string;
  academicSettings: Record<string, any>;
  parentProfile: any;
  parentGuardianIds: string[];
  wards: WardSummary[];
  isSuperAdmin: boolean;
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

export async function safeParentQuery<T = any>(
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

export async function resolveParentPortalContext(
  req: NextRequest
): Promise<
  | { ctx: ParentResolvedContext; errorResponse: null }
  | { ctx: null; errorResponse: NextResponse }
> {
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
      errorResponse: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
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
  pushRole(user?.user_metadata?.role);
  pushRole(user?.user_metadata?.default_role);
  pushRole(tenantCtx.role);

  const isSuperAdmin =
    tenantCtx.isSuperAdmin ||
    activeEmail === "superadmin@university.edu.gh" ||
    rolesSet.has("superadmin");

  let profileRow: any = null;
  let schoolId: string | null = tenantCtx.schoolId || null;
  let parentRows: any[] = [];

  if (activeUserId) {
    let pgQuery = (directAdmin as any)
      .from("parent_guardians")
      .select("id, school_id, user_id, student_id, full_name, email, phone, relationship, occupation, address");
    pgQuery = activeEmail
      ? pgQuery.or(`user_id.eq.${activeUserId},email.eq.${activeEmail}`)
      : pgQuery.eq("user_id", activeUserId);

    const [profRes, memsRes, pgsRes] = await Promise.all([
      safeParentQuery<any>(
        (directAdmin as any)
          .from("profiles")
          .select("id, email, full_name, phone, role, school_id, university_id")
          .eq("id", activeUserId)
          .maybeSingle()
      ),
      safeParentQuery<any[]>(
        (directAdmin as any)
          .from("school_memberships")
          .select("school_id, role, status")
          .eq("user_id", activeUserId)
          .eq("status", "active")
      ),
      safeParentQuery<any[]>(pgQuery),
    ]);

    if (profRes.data) {
      profileRow = profRes.data;
      pushRole(profRes.data.role);
      schoolId = schoolId || profRes.data.school_id || profRes.data.university_id || null;
    }

    for (const m of memsRes.data || []) {
      pushRole(m.role);
      if (!schoolId && m.school_id) schoolId = String(m.school_id);
    }

    parentRows = pgsRes.data || [];
  } else if (activeEmail) {
    const { data: pgs } = await safeParentQuery<any[]>(
      (directAdmin as any)
        .from("parent_guardians")
        .select("id, school_id, user_id, student_id, full_name, email, phone, relationship, occupation, address")
        .eq("email", activeEmail)
    );
    parentRows = pgs || [];
  }

  if (!schoolId && parentRows.length > 0 && parentRows[0]?.school_id) {
    schoolId = String(parentRows[0].school_id);
  }

  const allowedRoles = ["parent", "parent_sponsor", "guardian", "system_admin", "admin", "superadmin"];
  const hasParentRole =
    isSuperAdmin ||
    parentRows.length > 0 ||
    Array.from(rolesSet).some((r) => allowedRoles.includes(r));

  if (!hasParentRole) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Parent or Guardian account required." },
        { status: 403 }
      ),
    };
  }

  if (!schoolId) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Your account is not linked to a registered school." },
        { status: 403 }
      ),
    };
  }

  // Filter parentRows strictly to resolved schoolId
  const scopedParentRows = parentRows.filter((p) => String(p.school_id) === String(schoolId));
  const parentGuardianIds = scopedParentRows.map((p) => String(p.id));

  // Fetch school record and linked ward mappings in parallel
  const [schoolRes, linksRes] = await Promise.all([
    safeParentQuery<any>(
      (directAdmin as any)
        .from("schools")
        .select("id, name, school_type, currency, logo_url, academic_settings")
        .eq("id", schoolId)
        .maybeSingle()
    ),
    parentGuardianIds.length > 0
      ? safeParentQuery<any[]>(
          (directAdmin as any)
            .from("parent_guardian_students")
            .select("student_id, relationship, is_primary_contact")
            .eq("school_id", schoolId)
            .in("parent_guardian_id", parentGuardianIds)
        )
      : Promise.resolve({ data: [], missing: false, error: null }),
  ]);

  let resolvedSchool = schoolRes.data;
  if (!resolvedSchool) {
    const { data: vSchool } = await (virtualAdmin as any)
      .from("schools")
      .select("id, name, school_type, currency, logo_url, academic_settings")
      .eq("id", schoolId)
      .maybeSingle();
    resolvedSchool = vSchool || null;
  }

  // Collect all linked student_ids for this parent within schoolId
  const studentRelMap = new Map<string, string>();
  for (const p of scopedParentRows) {
    if (p.student_id) {
      studentRelMap.set(String(p.student_id), p.relationship || "Parent/Guardian");
    }
  }
  for (const l of linksRes.data || []) {
    if (l.student_id && !studentRelMap.has(String(l.student_id))) {
      studentRelMap.set(String(l.student_id), l.relationship || "Parent/Guardian");
    }
  }

  const wardIds = Array.from(studentRelMap.keys());
  const wards: WardSummary[] = [];

  if (wardIds.length > 0) {
    const [studentsRes, progsRes, deptsRes, classesRes, intakesRes] = await Promise.all([
      (directAdmin as any)
        .from("students")
        .select(
          "id, student_number, first_name, last_name, email, phone, gender, status, current_level, programme_id, department_id, class_group_id, intake_id"
        )
        .eq("school_id", schoolId)
        .in("id", wardIds)
        .order("first_name", { ascending: true }),
      (directAdmin as any)
        .from("programmes")
        .select("id, name")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("departments")
        .select("id, name")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("class_groups")
        .select("id, name, grade_level")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("vocational_intakes")
        .select("id, name, code")
        .eq("school_id", schoolId),
    ]);

    const progMap = new Map<string, string>(
      (progsRes.data || []).map((p: any) => [String(p.id), p.name])
    );
    const deptMap = new Map<string, string>(
      (deptsRes.data || []).map((d: any) => [String(d.id), d.name])
    );
    const classMap = new Map<string, string>(
      (classesRes.data || []).map((c: any) => [String(c.id), c.name])
    );
    const intakeMap = new Map<string, string>(
      (intakesRes.data || []).map((i: any) => [String(i.id), i.name])
    );

    for (const s of studentsRes.data || []) {
      const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.student_number || "Student";
      wards.push({
        id: String(s.id),
        student_number: s.student_number || "N/A",
        full_name: fullName,
        first_name: s.first_name || "",
        last_name: s.last_name || "",
        email: s.email || null,
        phone: s.phone || null,
        gender: s.gender || null,
        status: s.status || "active",
        current_level: s.current_level ?? null,
        programme_id: s.programme_id ? String(s.programme_id) : null,
        department_id: s.department_id ? String(s.department_id) : null,
        class_group_id: s.class_group_id ? String(s.class_group_id) : null,
        intake_id: s.intake_id ? String(s.intake_id) : null,
        programme_name: s.programme_id ? progMap.get(String(s.programme_id)) || null : null,
        department_name: s.department_id ? deptMap.get(String(s.department_id)) || null : null,
        class_group_name: s.class_group_id ? classMap.get(String(s.class_group_id)) || null : null,
        intake_name: s.intake_id ? intakeMap.get(String(s.intake_id)) || null : null,
        relationship: studentRelMap.get(String(s.id)) || "Parent/Guardian",
      });
    }
  }

  const primaryParent = scopedParentRows[0] || {
    id: null,
    full_name: profileRow?.full_name || user?.user_metadata?.full_name || "Parent / Guardian",
    email: activeEmail,
    phone: profileRow?.phone || "",
    relationship: "Parent / Guardian",
    occupation: "",
    address: "",
  };

  return {
    ctx: {
      userId: activeUserId,
      email: activeEmail,
      fullName: primaryParent.full_name || profileRow?.full_name || "Parent / Guardian",
      schoolId: String(schoolId),
      schoolName: resolvedSchool?.name || "School",
      schoolType: toPortalSchoolType(resolvedSchool?.school_type),
      currency: resolvedSchool?.currency || "GHS",
      schoolLogo: resolvedSchool?.logo_url || "",
      academicSettings: resolvedSchool?.academic_settings || {},
      parentProfile: primaryParent,
      parentGuardianIds,
      wards,
      isSuperAdmin,
    },
    errorResponse: null,
  };
}
