import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_STAFF_ROLES = [
  "system_admin",
  "admin",
  "superadmin",
  "administrator",
  "vice_chancellor",
  "registrar",
  "academic_affairs_officer",
  "dean",
  "head_of_department",
  "admissions_officer",
  "librarian",
  "hostel_officer",
  "hr_officer",
  "auditor",
];

function getTargetDashboardForRoles(roles: string[], email?: string): string {
  if (roles.includes("superadmin") || email === "superadmin@university.edu.gh") {
    return "/superadmin/dashboard";
  }
  const isSysAdmin =
    roles.includes("system_admin") ||
    roles.includes("admin") ||
    roles.includes("administrator");

  if (!isSysAdmin && (roles.includes("finance_officer") || roles.includes("bursar") || roles.includes("accountant"))) {
    return "/finance/dashboard";
  }
  if (roles.some((r) => ADMIN_STAFF_ROLES.includes(r))) {
    return "/admin/dashboard";
  }
  if (roles.includes("lecturer")) {
    return "/lecturer/dashboard";
  }
  if (roles.includes("student")) {
    return "/student/dashboard";
  }
  if (roles.includes("applicant")) {
    return "/applicant/dashboard";
  }
  if (roles.includes("academic_advisor")) {
    return "/advisor/dashboard";
  }
  if (roles.includes("finance_officer") || roles.includes("bursar") || roles.includes("accountant")) {
    return "/finance/dashboard";
  }
  return "/admin/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Instantly allow static files, images, favicon, and auth/supabase proxy callbacks
  const isStaticOrAuthApi =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/supabase") ||
    pathname.startsWith("/api/settings/institution") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".");

  if (isStaticOrAuthApi) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/" || pathname === "/login";

  // 2. Safe session resolution
  let supabaseResponse = NextResponse.next({ request });
  let user = null;
  let supabase = null;

  try {
    const sessionResult = await updateSession(request);
    supabaseResponse = sessionResult.supabaseResponse;
    user = sessionResult.user;
    supabase = sessionResult.supabase;
  } catch (err) {
    console.error("Middleware session update exception:", err);
  }

  // 3. Unauthenticated User Handling:
  // ONLY login page is accessible to unauthenticated users.
  if (!user) {
    if (isLoginPage) {
      return supabaseResponse;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 4. Authenticated User Handling:
  // Determine roles from DB RPC with metadata fallback
  let roles: string[] = [];

  const normalizedEmail = user.email?.trim().toLowerCase();
  const metaRole =
    user.user_metadata?.role ||
    user.user_metadata?.default_role ||
    user.app_metadata?.role ||
    user.app_metadata?.default_role ||
    (normalizedEmail === "admin@university.edu.gh" ? "system_admin" : undefined);

  if (metaRole) {
    roles.push(metaRole);
  }
  if (normalizedEmail === "admin@university.edu.gh" && !roles.includes("system_admin")) {
    roles.push("system_admin");
  }

  if (supabase) {
    try {
      const { data: userRoles } = await supabase.rpc("get_user_roles", {
        p_user_id: user.id,
      });

      if (userRoles && Array.isArray(userRoles)) {
        const rpcRoles = userRoles.map((r: { role_code: string }) => r.role_code);
        roles = Array.from(new Set([...roles, ...rpcRoles]));
      }
    } catch (rpcErr) {
      console.warn("Could not query get_user_roles RPC in middleware:", rpcErr);
    }
  }

  const isSuperAdmin =
    roles.includes("superadmin") ||
    normalizedEmail === "superadmin@university.edu.gh";

  const isSystemAdmin =
    isSuperAdmin ||
    roles.includes("system_admin") ||
    roles.includes("admin") ||
    roles.includes("administrator") ||
    normalizedEmail === "admin@university.edu.gh";

  // If already authenticated and visiting the login page, redirect to dashboard
  if (isLoginPage) {
    const dashboardPath = isSuperAdmin
      ? "/superadmin/dashboard"
      : isSystemAdmin
      ? "/admin/dashboard"
      : getTargetDashboardForRoles(roles, normalizedEmail);
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Allow unauthorized notice page (auto-recover privileged admins back to dashboard UNLESS university is deleted)
  if (pathname === "/unauthorized") {
    const reason = request.nextUrl.searchParams.get("reason");
    if (reason === "university_deleted" || reason === "account_suspended") {
      return supabaseResponse;
    }
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
    }
    if (isSystemAdmin) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // 4.2. University Deletion & Deactivation Barrier
  // If user is NOT superadmin, verify their university has not been deleted or suspended
  if (!isSuperAdmin && supabase) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status, metadata")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const metadata = (profile.metadata || {}) as Record<string, any>;
        const accountStatus = (profile.account_status as string) || "";
        const isBlocked =
          accountStatus === "suspended" ||
          accountStatus === "deleted" ||
          metadata.university_status === "deleted";

        if (isBlocked) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { error: "Access Denied: Your institution has been deleted or deactivated." },
              { status: 403 }
            );
          }
          const url = new URL("/unauthorized", request.url);
          url.searchParams.set("reason", "university_deleted");
          return NextResponse.redirect(url);
        }

        const userUnivId = metadata.university_id || (user.user_metadata as any)?.university_id;
        if (userUnivId) {
          const { data: settingRow } = await (supabase
            .from("system_settings" as any)
            .select("setting_value")
            .eq("setting_key", "deleted_universities")
            .maybeSingle() as any);

          const deletedList = Array.isArray(settingRow?.setting_value) ? settingRow.setting_value : [];
          if (deletedList.some((d: any) => d?.id === userUnivId || d?.code === metadata.university_code)) {
            if (pathname.startsWith("/api/")) {
              return NextResponse.json(
                { error: "Access Denied: Your institution has been deleted." },
                { status: 403 }
              );
            }
            const url = new URL("/unauthorized", request.url);
            url.searchParams.set("reason", "university_deleted");
            return NextResponse.redirect(url);
          }
        }
      }
    } catch (univCheckErr) {
      console.warn("Could not perform university deletion check in middleware:", univCheckErr);
    }
  }

  const buildUnauthorizedRedirect = (targetPath: string) => {
    const url = new URL("/unauthorized", request.url);
    url.searchParams.set("from", targetPath);
    return NextResponse.redirect(url);
  };

  // 4.5. Super Admin Exclusive Barrier (ONLY superadmin can access /superadmin)
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
    if (!isSuperAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
      }
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  // 5. Role-Based Access Control (RBAC) boundaries
  // System Admin and Super Admin hold universal superuser bypass across other portals
  if (isSystemAdmin) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const hasAdminAccess = roles.some((r) => ADMIN_STAFF_ROLES.includes(r));
    if (!hasAdminAccess) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      if (roles.includes("finance_officer") || roles.includes("bursar") || roles.includes("accountant")) {
        return NextResponse.redirect(new URL("/finance/dashboard", request.url));
      }
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/lecturer")) {
    const hasLecturerAccess = roles.includes("lecturer") || roles.includes("system_admin");
    if (!hasLecturerAccess) {
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/student")) {
    const hasStudentAccess = roles.includes("student") || roles.includes("system_admin");
    if (!hasStudentAccess) {
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/applicant")) {
    const hasApplicantAccess =
      roles.includes("applicant") ||
      roles.includes("system_admin") ||
      roles.includes("admissions_officer");
    if (!hasApplicantAccess) {
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/advisor")) {
    const hasAdvisorAccess = roles.includes("academic_advisor") || roles.includes("system_admin");
    if (!hasAdvisorAccess) {
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/finance") || pathname.startsWith("/api/finance")) {
    const hasFinanceAccess =
      roles.some((r) => [...ADMIN_STAFF_ROLES, "bursar", "finance_officer", "accountant"].includes(r));
    if (!hasFinanceAccess) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Finance access required" }, { status: 403 });
      }
      return buildUnauthorizedRedirect(pathname);
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
