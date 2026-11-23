import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  deleteLiveTenantUser,
  provisionLiveTenantUser,
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
  scopeQueryBySchool,
  syncVirtualProfileAndRole,
} from "@/lib/admin/tenant-provisioning";

// GET: Fetch users, profiles, and their assigned roles strictly scoped to caller's school_id
export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const [
      { data: vProfiles, error: profileErr },
      { data: vAssignments },
      { data: vRoles },
      liveProfilesRes,
      liveMembershipsRes,
    ] = await Promise.all([
      scopeQueryBySchool(
        (supabase as any)
          .from("profiles")
          .select("id, email, full_name, phone, avatar_url, role, school_id, university_id, account_status, created_at, updated_at")
          .order("created_at", { ascending: false }),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (supabase as any)
          .from("user_role_assignments")
          .select("user_id, school_id, role:role_id(id, code, name, description)")
          .eq("is_active", true),
        tenant.schoolId
      ),
      (supabase as any)
        .from("roles")
        .select("id, code, name, description")
        .order("name", { ascending: true }),
      scopeQueryBySchool(
        (directAdmin as any)
          .from("profiles")
          .select("id, email, full_name, phone, role, school_id, university_id, account_status, created_at, updated_at")
          .order("created_at", { ascending: false }),
        tenant.schoolId
      ).then((r: any) => r, () => ({ data: [] })),
      scopeQueryBySchool(
        (directAdmin as any)
          .from("school_memberships")
          .select("user_id, school_id, role, status, created_at, roles(id, code, name, description)"),
        tenant.schoolId
      ).then((r: any) => r, () => ({ data: [] })),
    ]);

    if (profileErr) {
      console.error("Error fetching profiles:", profileErr);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    const roleDefByCode = new Map<string, any>();
    for (const r of vRoles || []) {
      if (r?.code) roleDefByCode.set(String(r.code).toLowerCase(), r);
    }

    const roleMap = new Map<string, any>();
    for (const a of vAssignments || []) {
      if (a.user_id && a.role) {
        roleMap.set(a.user_id, a.role);
      }
    }
    for (const m of liveMembershipsRes?.data || []) {
      if (!m?.user_id) continue;
      const roleObj = m.roles?.code
        ? m.roles
        : roleDefByCode.get(String(m.role || "").toLowerCase()) || {
            id: m.role_id || m.role,
            code: m.role,
            name: String(m.role || "User")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          };
      if (roleObj?.code) {
        roleMap.set(m.user_id, roleObj);
      }
    }

    const mergedById = new Map<string, any>();
    for (const p of vProfiles || []) {
      if (p?.id) mergedById.set(p.id, p);
    }
    for (const lp of liveProfilesRes?.data || []) {
      if (!lp?.id) continue;
      const prev = mergedById.get(lp.id) || {};
      mergedById.set(lp.id, { ...prev, ...lp });
    }

    const combinedUsers = Array.from(mergedById.values())
      .filter((p: any) => {
        if (p.account_status === "deleted") return false;
        if (tenant.schoolId) {
          const pSchool = p.school_id || p.university_id || null;
          return pSchool && String(pSchool).toLowerCase() === tenant.schoolId.toLowerCase();
        }
        return true;
      })
      .map((p: any) => {
        const fallbackRoleCode = String(p.role || "student").toLowerCase();
        const assignedRole =
          roleMap.get(p.id) ||
          roleDefByCode.get(fallbackRoleCode) ||
          (p.role
            ? {
                id: fallbackRoleCode,
                code: fallbackRoleCode,
                name: fallbackRoleCode
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase()),
              }
            : null);

        return {
          ...p,
          user_role_assignments: assignedRole ? [{ role: assignedRole }] : [],
          role_code: assignedRole?.code || "student",
          role_name: assignedRole?.name || "Student",
        };
      });

    return NextResponse.json({
      users: combinedUsers,
      roles: vRoles || [],
    });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new user via SUPABASE_SERVICE_ROLE_KEY and stamp creating admin's school_id
export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { email, password, full_name, phone, role_code, account_status, school_id } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    const targetSchool = await resolveTargetSchoolForMutation(tenant, school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const cleanRole = String(role_code || "student").trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(full_name).trim();
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanStatus = String(account_status || "active").trim();

    const { userId } = await provisionLiveTenantUser({
      email: cleanEmail,
      password,
      fullName: cleanName,
      phone: cleanPhone,
      roleCode: cleanRole,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: cleanStatus,
    });

    const supabase = createAdminClient();
    await syncVirtualProfileAndRole(supabase, {
      userId,
      email: cleanEmail,
      fullName: cleanName,
      phone: cleanPhone,
      roleCode: cleanRole,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: cleanStatus,
    });

    try {
      await (supabase as any).from("audit_events").insert({
        action: "USER_PROVISIONED",
        entity_type: "auth_user",
        entity_id: userId,
        school_id: targetSchool.schoolId,
        outcome: "SUCCESS",
        new_values: {
          email: cleanEmail,
          full_name: cleanName,
          role: cleanRole,
          school_id: targetSchool.schoolId,
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role_code: cleanRole,
        school_id: targetSchool.schoolId,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}

// PUT: Update an existing user (Auth, Live Profile/Membership, Virtual Profile, Role assignment)
export async function PUT(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, email, full_name, phone, role_code, account_status, password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const [{ data: vProfile }, { data: liveProfile }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, email, full_name, role, school_id, university_id, account_status")
        .eq("id", id)
        .maybeSingle(),
      (directAdmin as any)
        .from("profiles")
        .select("id, email, full_name, role, school_id, university_id, account_status")
        .eq("id", id)
        .maybeSingle()
        .then((r: any) => r, () => ({ data: null })),
    ]);

    const existing = liveProfile || vProfile;
    const existingSchoolId =
      existing?.school_id || existing?.university_id || null;

    if (
      !tenant.isSuperAdmin &&
      existingSchoolId &&
      tenant.schoolId &&
      String(existingSchoolId).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update a user from another school." },
        { status: 403 }
      );
    }

    const targetSchool = await resolveTargetSchoolForMutation(
      tenant,
      existingSchoolId || body.school_id
    );
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const nextEmail = email ? String(email).trim().toLowerCase() : existing?.email || "";
    const nextName = full_name ? String(full_name).trim() : existing?.full_name || "User";
    const nextPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : existing?.phone || null;
    const nextRole = role_code ? String(role_code).trim().toLowerCase() : existing?.role || "student";
    const nextStatus = account_status || existing?.account_status || "active";

    await provisionLiveTenantUser({
      existingUserId: id,
      email: nextEmail,
      password: password && String(password).trim().length >= 8 ? String(password).trim() : undefined,
      fullName: nextName,
      phone: nextPhone,
      roleCode: nextRole,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: nextStatus,
    });

    await syncVirtualProfileAndRole(supabase, {
      userId: id,
      email: nextEmail,
      fullName: nextName,
      phone: nextPhone,
      roleCode: nextRole,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: nextStatus,
    });

    try {
      await (supabase as any).from("audit_events").insert({
        action: "USER_MODIFIED",
        entity_type: "auth_user",
        entity_id: id,
        school_id: targetSchool.schoolId,
        outcome: "SUCCESS",
        new_values: {
          email: nextEmail,
          full_name: nextName,
          role: nextRole,
          school_id: targetSchool.schoolId,
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/users error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}

// DELETE: Delete a user from Live DB, Auth, and Virtual DB (with tenant ownership guard)
export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    await deleteLiveTenantUser(id, tenant.isSuperAdmin ? null : tenant.schoolId);

    const supabase = createAdminClient();
    await (supabase as any).from("user_role_assignments").delete().eq("user_id", id);
    await (supabase as any).from("profiles").delete().eq("id", id);

    try {
      await (supabase as any).from("audit_events").insert({
        action: "USER_DELETED",
        entity_type: "auth_user",
        entity_id: id,
        school_id: tenant.schoolId,
        outcome: "success",
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/users error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
