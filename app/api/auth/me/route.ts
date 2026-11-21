import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await updateSession(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null, roles: [] }, { status: 200 });
    }

    const normalizedEmail = user.email?.trim().toLowerCase();
    const isRootSuperAdmin =
      normalizedEmail === "superadmin@university.edu.gh" ||
      user.app_metadata?.role === "superadmin";

    // Deletion check
    if (!isRootSuperAdmin) {
      try {
        const adminClient = getAdminClient();
        const { data: delSetting } = await (adminClient as any)
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "deleted_users")
          .maybeSingle();

        const delList = Array.isArray(delSetting?.setting_value) ? delSetting.setting_value : [];
        const isDeleted = delList.some(
          (d: any) => d?.id === user.id || (d?.email && d.email.toLowerCase() === normalizedEmail)
        );

        if (isDeleted) {
          return NextResponse.json(
            { authenticated: false, isDeleted: true, error: "Account deleted" },
            { status: 200 }
          );
        }

        let { data: profile } = await (adminClient as any)
          .from("profiles")
          .select("account_status, metadata, school_id, university_id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile && normalizedEmail) {
          try {
            const { data: profByEmail } = await (adminClient as any)
              .from("profiles")
              .select("account_status, metadata, school_id, university_id")
              .ilike("email", normalizedEmail)
              .maybeSingle();
            if (profByEmail) profile = profByEmail;
          } catch {}
        }

        if (profile && profile.account_status === "deleted") {
          return NextResponse.json(
            { authenticated: false, isDeleted: true, error: "Account deleted" },
            { status: 200 }
          );
        }
      } catch {}
    }

    let roles: string[] = [];

    const metaRole =
      user.user_metadata?.role ||
      user.user_metadata?.default_role ||
      user.app_metadata?.role ||
      user.app_metadata?.default_role;

    if (metaRole) roles.push(metaRole);
    if (normalizedEmail === "admin@university.edu.gh") {
      roles.push("system_admin");
    }

    // Try service client or session client to resolve roles
    try {
      const adminClient = getAdminClient();
      const { data: dbRoles } = await adminClient.rpc("get_user_roles", {
        p_user_id: user.id,
      });
      if (Array.isArray(dbRoles)) {
        const mapped = dbRoles.map((r: { role_code: string }) => r.role_code);
        roles = Array.from(new Set([...roles, ...mapped]));
      }
    } catch {
      // fallback to metadata roles
    }

    const isSystemAdmin =
      roles.includes("system_admin") ||
      roles.includes("admin") ||
      roles.includes("superadmin") ||
      normalizedEmail === "admin@university.edu.gh";

    let targetDashboard = "/admin/dashboard";
    if (isSystemAdmin) {
      targetDashboard = "/admin/dashboard";
    } else if (
      roles.includes("finance_officer") ||
      roles.includes("bursar") ||
      roles.includes("accountant")
    ) {
      targetDashboard = "/finance/dashboard";
    } else if (roles.includes("lecturer")) {
      targetDashboard = "/lecturer/dashboard";
    } else if (roles.includes("student")) {
      targetDashboard = "/student/dashboard";
    } else if (roles.includes("applicant")) {
      targetDashboard = "/applicant/dashboard";
    } else if (roles.includes("academic_advisor")) {
      targetDashboard = "/advisor/dashboard";
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
      },
      roles,
      isSystemAdmin,
      targetDashboard,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        authenticated: false,
        error: err instanceof Error ? err.message : "Session resolution error",
      },
      { status: 200 }
    );
  }
}

