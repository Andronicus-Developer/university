import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { toPortalSchoolType, type PortalSchoolType } from "@/config/schoolPortalConfig";

const AUTHORIZED_FINANCE_ROLES = new Set([
  "bursar",
  "finance_officer",
  "accountant",
  "auditor",
  "system_admin",
  "school_admin",
  "admin",
  "administrator",
  "superadmin",
]);

export interface FinanceResolvedContext {
  userId: string;
  email: string;
  fullName: string;
  primaryRole: string;
  isSuperAdmin: boolean;
  schoolId: string;
  schoolName: string;
  schoolType: PortalSchoolType;
  currency: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolLogo: string;
  academicSettings: Record<string, any>;
  staffProfile: any | null;
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

export async function safeFinanceQuery<T = any>(
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

export async function resolveFinancePortalContext(
  req: NextRequest
): Promise<
  | { ctx: FinanceResolvedContext; errorResponse: null }
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

  let schoolId: string | null = tenantCtx.schoolId || null;
  let profileRow: any = null;
  let staffProfile: any = null;

  if (activeUserId) {
    const { data: prof } = await (directAdmin as any)
      .from("profiles")
      .select("id, email, full_name, phone, role, school_id, university_id")
      .eq("id", activeUserId)
      .maybeSingle();
    if (prof) {
      profileRow = prof;
      pushRole(prof.role);
      schoolId = schoolId || prof.school_id || prof.university_id || null;
    }

    const { data: mems } = await (directAdmin as any)
      .from("school_memberships")
      .select("school_id, role, status")
      .eq("user_id", activeUserId)
      .eq("status", "active");
    for (const m of mems || []) {
      pushRole(m.role);
      if (!schoolId && m.school_id) schoolId = String(m.school_id);
    }

    const { data: sp } = await (directAdmin as any)
      .from("staff_profiles")
      .select("*")
      .eq("user_id", activeUserId)
      .limit(1)
      .maybeSingle();
    if (sp) {
      staffProfile = sp;
      pushRole(sp.role_code);
      if (!schoolId && sp.school_id) schoolId = String(sp.school_id);
    }
  }

  const roles = Array.from(rolesSet);
  const authorized =
    isSuperAdmin || roles.some((r) => AUTHORIZED_FINANCE_ROLES.has(r));

  if (!authorized) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "Finance or Bursar role required." },
        { status: 403 }
      ),
    };
  }

  if (!schoolId) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { error: "No school linked to your Finance account." },
        { status: 403 }
      ),
    };
  }

  const { data: schoolRow } = await (directAdmin as any)
    .from("schools")
    .select("id, name, school_type, currency, logo_url, address, phone, email, academic_settings")
    .eq("id", schoolId)
    .maybeSingle();

  let school = schoolRow;
  if (!school) {
    const { data: vSchool } = await (virtualAdmin as any)
      .from("schools")
      .select("id, name, school_type, currency, logo_url, address, phone, email, academic_settings")
      .eq("id", schoolId)
      .maybeSingle();
    school = vSchool || null;
  }

  const fullName =
    staffProfile
      ? `${staffProfile.first_name || ""} ${staffProfile.last_name || ""}`.trim() ||
        profileRow?.full_name ||
        "Finance Officer"
      : profileRow?.full_name || user?.user_metadata?.full_name || "Finance Officer";

  return {
    ctx: {
      userId: activeUserId,
      email: activeEmail,
      fullName,
      primaryRole: roles[0] || "bursar",
      isSuperAdmin,
      schoolId: String(schoolId),
      schoolName: school?.name || "School",
      schoolType: toPortalSchoolType(school?.school_type),
      currency: school?.currency || "GHS",
      schoolAddress: school?.address || "",
      schoolPhone: school?.phone || "",
      schoolEmail: school?.email || "",
      schoolLogo: school?.logo_url || "",
      academicSettings: school?.academic_settings || {},
      staffProfile,
    },
    errorResponse: null,
  };
}
