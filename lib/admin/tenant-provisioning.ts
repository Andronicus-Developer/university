import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { registerDynamicUser, unregisterDynamicUser } from "@/lib/supabase/fetch";
import { getUniversities } from "@/lib/superadmin/service";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AUTHORIZED_ADMIN_ROLES = new Set([
  "superadmin",
  "system_admin",
  "school_admin",
  "admin",
  "hr_officer",
  "registrar",
  "admissions_officer",
  "dean",
  "head_of_department",
]);

export function isValidUuid(val: unknown): val is string {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

export interface ResolvedAdminTenant {
  userId: string;
  email: string;
  roles: string[];
  isSuperAdmin: boolean;
  schoolId: string | null;
  schoolName: string;
  schoolCode: string;
}

export interface StaffProfileInput {
  staffNumber: string;
  jobTitle: string;
  departmentName?: string | null;
  departmentId?: string | null;
  employmentType?: string;
  hireDate?: string | null;
  phone?: string | null;
  roleCode?: string | null;
  salaryGrade?: string | null;
  employmentStatus?: string;
  metadata?: Record<string, any> | null;
}

export interface ProvisionTenantUserParams {
  email: string;
  password?: string;
  fullName: string;
  phone?: string | null;
  roleCode: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  accountStatus?: string;
  existingUserId?: string | null;
  staffProfile?: StaffProfileInput | null;
  extraMetadata?: Record<string, any> | null;
}

/**
 * Resolves school metadata (`schoolName`, `schoolCode`) from live `public.schools` and virtual directory.
 */
export async function resolveSchoolSummary(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  schoolId: string | null
): Promise<{ schoolName: string; schoolCode: string }> {
  if (!schoolId) return { schoolName: "", schoolCode: "" };

  if (isValidUuid(schoolId)) {
    try {
      const { data: liveSchool } = await (directAdmin as any)
        .from("schools")
        .select("id, name, slug, tenant_slug")
        .eq("id", schoolId)
        .maybeSingle();
      if (liveSchool?.id) {
        return {
          schoolName: String(liveSchool.name || ""),
          schoolCode: String(liveSchool.tenant_slug || liveSchool.slug || "").toUpperCase(),
        };
      }
    } catch {}
  }

  try {
    const univs = await getUniversities();
    const matched = univs.find(
      (u) => String(u.id).toLowerCase() === schoolId.toLowerCase()
    );
    if (matched) {
      return {
        schoolName: matched.name || "",
        schoolCode: matched.code || "",
      };
    }
  } catch {}

  return { schoolName: "", schoolCode: "" };
}

/**
 * Resolves and verifies the calling admin's authenticated session, role authorization,
 * and authoritative tenant `school_id`.
 */
export async function resolveAdminTenantRequest(
  req: NextRequest
): Promise<
  | { tenant: ResolvedAdminTenant; errorResponse: null }
  | { tenant: null; errorResponse: NextResponse }
> {
  if (typeof window !== "undefined") {
    throw new Error("resolveAdminTenantRequest must only run on the server");
  }

  const cookies = req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
  const tenantCtx = resolveTenantContextFromHeaders(req.headers, cookies);
  const { user } = await updateSession(req).catch(() => ({ user: null as any }));

  const activeUserId = user?.id || tenantCtx.userId;
  const activeEmail = String(user?.email || tenantCtx.email || "")
    .trim()
    .toLowerCase();

  if (!activeUserId && !tenantCtx.isAuthenticated) {
    return {
      tenant: null,
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
  pushRole(user?.app_metadata?.default_role);
  pushRole(user?.user_metadata?.role);
  pushRole(user?.user_metadata?.default_role);
  pushRole(tenantCtx.role);

  let resolvedSchoolId: string | null = null;

  // 1. Live public.profiles
  if (activeUserId) {
    try {
      const { data: liveProf } = await (directAdmin as any)
        .from("profiles")
        .select("school_id, university_id, role")
        .eq("id", activeUserId)
        .maybeSingle();
      if (liveProf?.school_id || liveProf?.university_id) {
        resolvedSchoolId = String(liveProf.school_id || liveProf.university_id);
      }
      pushRole(liveProf?.role);
    } catch {}
  }

  // 2. Live public.school_memberships
  if (activeUserId) {
    try {
      const { data: liveMems } = await (directAdmin as any)
        .from("school_memberships")
        .select("school_id, role, status, roles(code)")
        .eq("user_id", activeUserId)
        .eq("status", "active");
      for (const m of liveMems || []) {
        if (!resolvedSchoolId && m?.school_id) {
          resolvedSchoolId = String(m.school_id);
        }
        pushRole(m?.role);
        pushRole(m?.roles?.code);
      }
    } catch {}
  }

  // 3. Live public.staff_profiles
  if (!resolvedSchoolId && activeUserId) {
    try {
      const { data: liveStaffProf } = await (directAdmin as any)
        .from("staff_profiles")
        .select("school_id")
        .eq("user_id", activeUserId)
        .limit(1)
        .maybeSingle();
      if (liveStaffProf?.school_id) {
        resolvedSchoolId = String(liveStaffProf.school_id);
      }
    } catch {}
  }

  // 4. JWT / Metadata claims
  if (!resolvedSchoolId) {
    const metaSchool =
      user?.app_metadata?.school_id ||
      user?.app_metadata?.university_id ||
      user?.user_metadata?.school_id ||
      user?.user_metadata?.university_id ||
      tenantCtx.schoolId ||
      null;
    if (metaSchool) resolvedSchoolId = String(metaSchool);
  }

  // 5. Virtual DB fallback (profiles / university_system_admins / roles RPC)
  if (activeUserId) {
    try {
      const { data: vProf } = await (virtualAdmin as any)
        .from("profiles")
        .select("school_id, university_id, role, metadata")
        .eq("id", activeUserId)
        .maybeSingle();
      if (!resolvedSchoolId) {
        const candidate =
          vProf?.school_id ||
          vProf?.university_id ||
          vProf?.metadata?.school_id ||
          vProf?.metadata?.university_id;
        if (candidate) resolvedSchoolId = String(candidate);
      }
      pushRole(vProf?.role);
      pushRole(vProf?.metadata?.role);
    } catch {}

    try {
      const { data: dbRoles } = await virtualAdmin.rpc("get_user_roles", {
        p_user_id: activeUserId,
      });
      if (Array.isArray(dbRoles)) {
        for (const r of dbRoles) pushRole(r?.role_code);
      }
    } catch {}
  }

  const isSuperAdmin =
    tenantCtx.isSuperAdmin ||
    activeEmail === "superadmin@university.edu.gh" ||
    rolesSet.has("superadmin");

  const isAuthorized =
    isSuperAdmin ||
    Array.from(rolesSet).some((r) => AUTHORIZED_ADMIN_ROLES.has(r));

  if (!isAuthorized) {
    return {
      tenant: null,
      errorResponse: NextResponse.json(
        { error: "Forbidden: Administrator privileges are required." },
        { status: 403 }
      ),
    };
  }

  if (isSuperAdmin) {
    const requestedSchoolId =
      req.nextUrl.searchParams.get("school_id") ||
      req.headers.get("x-tenant-school-id") ||
      null;
    resolvedSchoolId = requestedSchoolId || null;
  } else if (!resolvedSchoolId) {
    return {
      tenant: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Your administrator account is not linked to a registered school. Contact the Super Administrator.",
        },
        { status: 403 }
      ),
    };
  }

  const { schoolName, schoolCode } = await resolveSchoolSummary(
    directAdmin,
    resolvedSchoolId
  );

  return {
    tenant: {
      userId: String(activeUserId),
      email: activeEmail,
      roles: Array.from(rolesSet),
      isSuperAdmin,
      schoolId: resolvedSchoolId,
      schoolName,
      schoolCode,
    },
    errorResponse: null,
  };
}

/**
 * Applies `.eq("school_id", schoolId)` when `schoolId` is present.
 */
export function scopeQueryBySchool<T>(query: T, schoolId: string | null): T {
  if (!schoolId) return query;
  return (query as any).eq("school_id", schoolId);
}

/**
 * Resolves the authoritative target `school_id` for admin write operations.
 * Tenant admins are always pinned to their own school_id; Super Admins may specify `bodySchoolId`.
 */
export async function resolveTargetSchoolForMutation(
  tenant: ResolvedAdminTenant,
  bodySchoolId?: unknown
): Promise<
  | { schoolId: string; schoolName: string; schoolCode: string; errorResponse: null }
  | { schoolId: null; schoolName: ""; schoolCode: ""; errorResponse: NextResponse }
> {
  const candidate = tenant.isSuperAdmin
    ? (typeof bodySchoolId === "string" && bodySchoolId.trim()) || tenant.schoolId || null
    : tenant.schoolId;

  if (!candidate) {
    return {
      schoolId: null,
      schoolName: "",
      schoolCode: "",
      errorResponse: NextResponse.json(
        { error: "school_id is required to provision or modify records in this school." },
        { status: 400 }
      ),
    };
  }

  if (candidate === tenant.schoolId && tenant.schoolName) {
    return {
      schoolId: candidate,
      schoolName: tenant.schoolName,
      schoolCode: tenant.schoolCode,
      errorResponse: null,
    };
  }

  const directAdmin = createDirectAdminClient();
  const { schoolName, schoolCode } = await resolveSchoolSummary(directAdmin, candidate);
  return {
    schoolId: candidate,
    schoolName,
    schoolCode,
    errorResponse: null,
  };
}

/**
 * Upserts the virtual DB `profiles` and `user_role_assignments` rows stamped with `school_id`
 * so legacy virtual-DB queries stay synchronized with live Supabase tables.
 */
export async function syncVirtualProfileAndRole(
  virtualAdmin: ReturnType<typeof createAdminClient>,
  params: {
    userId: string;
    email: string;
    fullName: string;
    phone?: string | null;
    roleCode: string;
    schoolId: string;
    schoolName?: string;
    schoolCode?: string;
    accountStatus?: string;
    departmentId?: string | null;
  }
): Promise<void> {
  const cleanEmail = params.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const cleanStatus = params.accountStatus || "active";

  await (virtualAdmin as any).from("profiles").upsert(
    {
      id: params.userId,
      email: cleanEmail,
      full_name: params.fullName.trim(),
      phone: params.phone || null,
      role: params.roleCode,
      school_id: params.schoolId,
      university_id: params.schoolId,
      account_status: cleanStatus,
      metadata: {
        role: params.roleCode,
        default_role: params.roleCode,
        school_id: params.schoolId,
        university_id: params.schoolId,
        ...(params.schoolName ? { university_name: params.schoolName } : {}),
        ...(params.schoolCode ? { university_code: params.schoolCode } : {}),
      },
      updated_at: now,
    },
    { onConflict: "id" }
  );

  if (params.roleCode) {
    const { data: roleRow } = await (virtualAdmin as any)
      .from("roles")
      .select("id")
      .eq("code", params.roleCode)
      .maybeSingle();

    if (roleRow?.id) {
      await (virtualAdmin as any)
        .from("user_role_assignments")
        .delete()
        .eq("user_id", params.userId);
      await (virtualAdmin as any).from("user_role_assignments").insert({
        user_id: params.userId,
        role_id: roleRow.id,
        school_id: params.schoolId,
        ...(params.departmentId ? { department_id: params.departmentId } : {}),
        is_active: cleanStatus === "active",
      });
    }
  }
}

/**
 * Resolves or inserts a role UUID in live Supabase `public.roles` so `school_memberships.role_id`
 * and `user_role_assignments.role_id` always reference a valid row.
 */
export async function ensureLiveRoleId(
  directAdmin: ReturnType<typeof createDirectAdminClient>,
  schoolId: string | null,
  roleCode: string
): Promise<string> {
  const cleanCode = roleCode.trim().toLowerCase();
  const validSchoolId = isValidUuid(schoolId) ? schoolId.trim() : null;

  const { data: existingRoles } = await (directAdmin as any)
    .from("roles")
    .select("id, code, school_id")
    .eq("code", cleanCode);

  if (Array.isArray(existingRoles) && existingRoles.length > 0) {
    const schoolExact = validSchoolId
      ? existingRoles.find((r: any) => r.school_id === validSchoolId)
      : null;
    if (schoolExact?.id) return schoolExact.id;
    const anyMatch = existingRoles.find((r: any) => r.id);
    if (anyMatch?.id) return anyMatch.id;
  }

  const formattedName = cleanCode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let { data: insertedRole, error: insErr } = await (directAdmin as any)
    .from("roles")
    .insert({
      school_id: validSchoolId,
      code: cleanCode,
      name: formattedName,
      description: `Role for ${formattedName}`,
      is_system: true,
      is_system_role: true,
    })
    .select("id")
    .single();

  if (
    insErr &&
    (insErr.code === "42703" ||
      insErr.code === "PGRST204" ||
      String(insErr.message || "").includes("column"))
  ) {
    const retry = await (directAdmin as any)
      .from("roles")
      .insert({
        school_id: validSchoolId,
        code: cleanCode,
        name: formattedName,
        description: `Role for ${formattedName}`,
        is_system: true,
      })
      .select("id")
      .single();
    insertedRole = retry.data;
    insErr = retry.error;
  }

  if (!insErr && insertedRole?.id) {
    return insertedRole.id;
  }

  // Re-query in case of unique constraint / race
  const { data: retryQuery } = await (directAdmin as any)
    .from("roles")
    .select("id")
    .eq("code", cleanCode)
    .limit(1)
    .maybeSingle();

  if (retryQuery?.id) {
    return retryQuery.id;
  }

  throw new Error(
    insErr?.message || `Failed to resolve role '${cleanCode}' in live public.roles`
  );
}

/**
 * Provisions or updates a tenant user in live Supabase Auth, `public.profiles`,
 * `public.school_memberships`, `public.user_role_assignments`, and optionally `public.staff_profiles`,
 * strictly stamped with the creating admin's `school_id`.
 */
export async function provisionLiveTenantUser(
  params: ProvisionTenantUserParams
): Promise<{ userId: string; createdNewAuthUser: boolean }> {
  if (typeof window !== "undefined") {
    throw new Error("provisionLiveTenantUser must only run on the server");
  }

  if (!params.schoolId || !params.schoolId.trim()) {
    throw new Error("A valid school_id is required to provision a tenant account.");
  }

  const directAdmin = createDirectAdminClient();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const cleanRole = params.roleCode.trim().toLowerCase();
  const cleanStatus = params.accountStatus || "active";
  const now = new Date().toISOString();
  const validSchoolId = isValidUuid(params.schoolId) ? params.schoolId.trim() : null;

  let resolvedName = params.schoolName || "";
  let resolvedCode = params.schoolCode || "";
  if (!resolvedName) {
    const summary = await resolveSchoolSummary(directAdmin, params.schoolId);
    resolvedName = summary.schoolName;
    resolvedCode = summary.schoolCode;
  }

  const appMetadata = {
    role: cleanRole,
    school_id: validSchoolId || params.schoolId,
    university_id: validSchoolId || params.schoolId,
  };

  const userMetadata = {
    full_name: cleanName,
    role: cleanRole,
    default_role: cleanRole,
    school_id: validSchoolId || params.schoolId,
    university_id: validSchoolId || params.schoolId,
    ...(resolvedName ? { university_name: resolvedName } : {}),
    ...(resolvedCode ? { university_code: resolvedCode } : {}),
  };

  let userId = params.existingUserId ? String(params.existingUserId) : "";
  let createdNewAuthUser = false;

  if (userId) {
    const { data: existingAuthRes } = await directAdmin.auth.admin
      .getUserById(userId)
      .catch(() => ({ data: { user: null } }));

    if (existingAuthRes?.user) {
      const updates: any = {
        email: cleanEmail,
        app_metadata: {
          ...(existingAuthRes.user.app_metadata || {}),
          ...appMetadata,
        },
        user_metadata: {
          ...(existingAuthRes.user.user_metadata || {}),
          ...userMetadata,
        },
        ban_duration:
          cleanStatus === "suspended" || cleanStatus === "deactivated" || cleanStatus === "locked"
            ? "876000h"
            : "none",
      };
      if (params.password && params.password.trim()) {
        updates.password = params.password.trim();
      }
      const { error: updErr } = await directAdmin.auth.admin.updateUserById(userId, updates);
      if (updErr) {
        throw new Error(`Failed to update authentication user: ${updErr.message}`);
      }
    }
  } else {
    const passwordToUse =
      params.password && params.password.trim()
        ? params.password.trim()
        : `Usr#${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;

    const { data: authData, error: authErr } = await directAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: passwordToUse,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });

    if (authErr || !authData?.user?.id) {
      const { data: usersList } = await directAdmin.auth.admin
        .listUsers({ page: 1, perPage: 1000 })
        .catch(() => ({ data: { users: [] } }));
      const matched = usersList?.users?.find(
        (u) => u.email?.trim().toLowerCase() === cleanEmail
      );

      if (!matched) {
        throw new Error(authErr?.message || "Failed to create authentication user.");
      }

      // Check existing school assignment so one school cannot hijack another school's account
      const existingMetaSchool =
        (matched.app_metadata?.school_id as string | undefined) ||
        (matched.user_metadata?.school_id as string | undefined) ||
        (matched.app_metadata?.university_id as string | undefined) ||
        (matched.user_metadata?.university_id as string | undefined) ||
        null;

      let existingDbSchool: string | null = existingMetaSchool;
      if (!existingDbSchool) {
        const { data: profCheck } = await (directAdmin as any)
          .from("profiles")
          .select("school_id")
          .eq("id", matched.id)
          .maybeSingle();
        existingDbSchool = profCheck?.school_id || null;
      }
      if (!existingDbSchool) {
        const { data: memCheck } = await (directAdmin as any)
          .from("school_memberships")
          .select("school_id")
          .eq("user_id", matched.id)
          .limit(1)
          .maybeSingle();
        existingDbSchool = memCheck?.school_id || null;
      }

      if (
        existingDbSchool &&
        String(existingDbSchool).toLowerCase() !== String(params.schoolId).toLowerCase()
      ) {
        const conflictErr: any = new Error(
          `The email "${cleanEmail}" is already registered under another school.`
        );
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      userId = matched.id;
      const adoptUpdates: any = {
        app_metadata: { ...(matched.app_metadata || {}), ...appMetadata },
        user_metadata: { ...(matched.user_metadata || {}), ...userMetadata },
      };
      if (params.password && params.password.trim()) {
        adoptUpdates.password = params.password.trim();
      }
      await directAdmin.auth.admin.updateUserById(userId, adoptUpdates);
    } else {
      userId = authData.user.id;
      createdNewAuthUser = true;
    }
  }

  try {
    // 1. Upsert live public.profiles with explicit school_id & merged extraMetadata
    const { error: profErr } = await (directAdmin as any)
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: cleanEmail,
          full_name: cleanName,
          phone: params.phone || null,
          role: cleanRole,
          school_id: validSchoolId,
          university_id: validSchoolId,
          account_status: cleanStatus,
          metadata: {
            ...userMetadata,
            ...(params.extraMetadata || {}),
          },
          updated_at: now,
        },
        { onConflict: "id" }
      );

    if (profErr) {
      const msg = String(profErr.message || "");
      const isMissingTable =
        profErr.code === "PGRST205" ||
        msg.includes("Could not find the table 'public.profiles'") ||
        msg.includes('relation "public.profiles" does not exist');

      if (!isMissingTable) {
        throw new Error(`Failed to save live public.profiles row: ${profErr.message}`);
      }
    }

    // 2. Resolve live role & link public.school_memberships + public.user_role_assignments
    if (validSchoolId) {
      const liveRoleId = await ensureLiveRoleId(directAdmin, validSchoolId, cleanRole);
      const memStatus = cleanStatus === "active" ? "active" : "inactive";

      const { data: existingMem } = await (directAdmin as any)
        .from("school_memberships")
        .select("id")
        .eq("school_id", validSchoolId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMem?.id) {
        const { error: memUpdErr } = await (directAdmin as any)
          .from("school_memberships")
          .update({
            role_id: liveRoleId,
            role: cleanRole,
            status: memStatus,
            updated_at: now,
          })
          .eq("id", existingMem.id);
        if (memUpdErr) {
          throw new Error(`Failed to update public.school_memberships: ${memUpdErr.message}`);
        }
      } else {
        const { error: memInsErr } = await (directAdmin as any)
          .from("school_memberships")
          .insert({
            school_id: validSchoolId,
            user_id: userId,
            role_id: liveRoleId,
            role: cleanRole,
            status: memStatus,
          });
        if (memInsErr) {
          throw new Error(`Failed to insert into public.school_memberships: ${memInsErr.message}`);
        }
      }

      try {
        await (directAdmin as any)
          .from("user_role_assignments")
          .delete()
          .eq("user_id", userId)
          .eq("school_id", validSchoolId);
        await (directAdmin as any).from("user_role_assignments").insert({
          user_id: userId,
          role_id: liveRoleId,
          school_id: validSchoolId,
          is_active: cleanStatus === "active",
        });
      } catch {}

      // 3. Upsert live public.staff_profiles when staffProfile metadata is provided
      if (params.staffProfile) {
        const nameParts = cleanName.split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || cleanName;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

        const { data: existingStaffProf } = await (directAdmin as any)
          .from("staff_profiles")
          .select("id")
          .eq("school_id", validSchoolId)
          .eq("user_id", userId)
          .maybeSingle();

        const baseStaffProfPayload = {
          school_id: validSchoolId,
          user_id: userId,
          staff_number: params.staffProfile.staffNumber,
          first_name: firstName,
          last_name: lastName,
          designation: params.staffProfile.jobTitle,
          department: params.staffProfile.departmentName || null,
          employment_status: params.staffProfile.employmentStatus || "active",
          email: cleanEmail,
          updated_at: now,
        };

        const extendedStaffProfPayload = {
          ...baseStaffProfPayload,
          ...(params.staffProfile.departmentId !== undefined
            ? { department_id: params.staffProfile.departmentId }
            : {}),
          ...(params.staffProfile.employmentType !== undefined
            ? { employment_type: params.staffProfile.employmentType }
            : {}),
          ...(params.staffProfile.hireDate !== undefined
            ? { hire_date: params.staffProfile.hireDate }
            : {}),
          ...(params.staffProfile.phone !== undefined
            ? { phone: params.staffProfile.phone }
            : {}),
          ...(params.staffProfile.roleCode !== undefined
            ? { role_code: params.staffProfile.roleCode }
            : {}),
          ...(params.staffProfile.salaryGrade !== undefined
            ? { salary_grade: params.staffProfile.salaryGrade }
            : {}),
          ...(params.staffProfile.metadata !== undefined &&
          params.staffProfile.metadata !== null
            ? { metadata: params.staffProfile.metadata }
            : {}),
        };

        const saveStaffRow = async (payload: Record<string, any>) => {
          if (existingStaffProf?.id) {
            return (directAdmin as any)
              .from("staff_profiles")
              .update(payload)
              .eq("id", existingStaffProf.id);
          }
          return (directAdmin as any).from("staff_profiles").insert(payload);
        };

        const { error: extStaffErr } = await saveStaffRow(extendedStaffProfPayload);
        if (
          extStaffErr &&
          (String(extStaffErr.code || "") === "42703" ||
            String(extStaffErr.code || "") === "PGRST204" ||
            String(extStaffErr.message || "").includes("column"))
        ) {
          await saveStaffRow(baseStaffProfPayload);
        }
      }
    }
  } catch (err) {
    if (createdNewAuthUser && userId) {
      try {
        await (directAdmin as any).from("profiles").delete().eq("id", userId);
        await directAdmin.auth.admin.deleteUser(userId);
      } catch {}
    }
    throw err;
  }

  if (params.password && params.password.trim()) {
    registerDynamicUser(cleanEmail, params.password.trim(), {
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
      role: cleanRole,
      role_name: cleanRole
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      school_id: validSchoolId || params.schoolId,
    });
  }

  return { userId, createdNewAuthUser };
}

/**
 * Deletes a user from live Supabase tables and Auth while enforcing tenant boundary ownership.
 */
export async function deleteLiveTenantUser(
  userId: string,
  callerSchoolId: string | null
): Promise<void> {
  const directAdmin = createDirectAdminClient();

  if (callerSchoolId) {
    const [{ data: liveProf }, { data: authRes }] = await Promise.all([
      (directAdmin as any)
        .from("profiles")
        .select("school_id")
        .eq("id", userId)
        .maybeSingle(),
      directAdmin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
    ]);

    const targetSchoolId =
      liveProf?.school_id ||
      (authRes?.user?.app_metadata?.school_id as string | undefined) ||
      (authRes?.user?.user_metadata?.school_id as string | undefined) ||
      null;

    if (
      targetSchoolId &&
      String(targetSchoolId).toLowerCase() !== String(callerSchoolId).toLowerCase()
    ) {
      const forbidden: any = new Error(
        "Forbidden: Cannot modify or delete a user belonging to another school."
      );
      forbidden.statusCode = 403;
      throw forbidden;
    }
  }

  for (const [tbl, col] of [
    ["school_memberships", "user_id"],
    ["staff_profiles", "user_id"],
    ["user_role_assignments", "user_id"],
    ["profiles", "id"],
  ] as const) {
    try {
      await (directAdmin as any).from(tbl).delete().eq(col, userId);
    } catch {}
  }

  try {
    await directAdmin.auth.admin.deleteUser(userId);
  } catch {}

  unregisterDynamicUser(userId);
}
