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

function respondNotFound(
  request: NextRequest,
  sourceResponse?: NextResponse
): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.json(
      { error: "Not Found", message: "The requested resource was not found on this server." },
      { status: 404 }
    );
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  }

  // Rewrite to /not-found: preserves the URL the user typed in their browser bar,
  // renders the Not Found 404 UI, and sends HTTP status code 404.
  const notFoundUrl = new URL("/not-found", request.url);
  const res = NextResponse.rewrite(notFoundUrl, {
    status: 404,
    statusText: "Not Found",
  });

  if (sourceResponse) {
    sourceResponse.cookies.getAll().forEach((c) => {
      res.cookies.set(c);
    });
    const setCookies = sourceResponse.headers.getSetCookie?.() || [];
    setCookies.forEach((header) => {
      res.headers.append("Set-Cookie", header);
    });
  }

  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

function createRedirectWithCookies(
  url: URL,
  sourceResponse?: NextResponse
): NextResponse {
  const res = NextResponse.redirect(url);
  if (sourceResponse) {
    sourceResponse.cookies.getAll().forEach((c) => {
      res.cookies.set(c);
    });
    const setCookies = sourceResponse.headers.getSetCookie?.() || [];
    setCookies.forEach((header) => {
      res.headers.append("Set-Cookie", header);
    });
  }
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
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
  const isPublicPage = isLoginPage || pathname === "/not-found" || pathname === "/404";

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
  // ONLY login page and 404 error page are accessible to unauthenticated users.
  if (!user) {
    if (isPublicPage) {
      return supabaseResponse;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return createRedirectWithCookies(redirectUrl, supabaseResponse);
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
  // If user is NOT superadmin, verify their university and account have not been deleted
  if (!isSuperAdmin && supabase) {
    try {
      // 1. Check deleted_users blacklist in system_settings
      const { data: delUsersRow } = await (supabase
        .from("system_settings" as any)
        .select("setting_value")
        .eq("setting_key", "deleted_users")
        .maybeSingle() as any);

      const deletedUsersList = Array.isArray(delUsersRow?.setting_value) ? delUsersRow.setting_value : [];
      const isUserBlacklisted = deletedUsersList.some(
        (u: any) => u?.id === user.id || (u?.email && u.email.toLowerCase() === normalizedEmail)
      );

      if (isUserBlacklisted) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Access Denied: Your account has been permanently deleted from the database." },
            { status: 403 }
          );
        }
        const url = new URL("/unauthorized", request.url);
        url.searchParams.set("reason", "university_deleted");
        return NextResponse.redirect(url);
      }

      // 2. Query profile from database
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status, metadata")
        .eq("id", user.id)
        .maybeSingle();

      // If user profile no longer exists in DB (was deleted with university):
      if (!profile) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Access Denied: Account not found or has been deleted." },
            { status: 403 }
          );
        }
        const url = new URL("/unauthorized", request.url);
        url.searchParams.set("reason", "university_deleted");
        return NextResponse.redirect(url);
      }

      const metadata = (profile.metadata || {}) as Record<string, any>;
      const accountStatus = (profile.account_status as string) || "";
      const isBlocked =
        accountStatus === "suspended" ||
        accountStatus === "deleted" ||
        metadata.university_status === "deleted";

      if (isBlocked) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Access Denied: Your institution and account have been deleted or deactivated." },
            { status: 403 }
          );
        }
        const url = new URL("/unauthorized", request.url);
        url.searchParams.set("reason", "university_deleted");
        return NextResponse.redirect(url);
      }

      // 3. Check if user's university is in deleted_universities registry
      const userUnivId = metadata.university_id || (user.user_metadata as any)?.university_id;
      const userUnivCode = metadata.university_code || (user.user_metadata as any)?.university_code;

      if (userUnivId || userUnivCode) {
        const { data: settingRow } = await (supabase
          .from("system_settings" as any)
          .select("setting_value")
          .eq("setting_key", "deleted_universities")
          .maybeSingle() as any);

        const deletedList = Array.isArray(settingRow?.setting_value) ? settingRow.setting_value : [];
        if (
          deletedList.some(
            (d: any) =>
              (userUnivId && d?.id === userUnivId) ||
              (userUnivCode && d?.code === userUnivCode)
          )
        ) {
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
    } catch (univCheckErr) {
      console.warn("Could not perform university deletion check in middleware:", univCheckErr);
    }
  }

  // Enforce zero cache on all protected views so browser cannot serve from bfcache after logout
  supabaseResponse.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  supabaseResponse.headers.set("Pragma", "no-cache");
  supabaseResponse.headers.set("Expires", "0");

  // 4.5. Super Admin Exclusive Barrier (ONLY superadmin can access /superadmin)
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
    if (!isSuperAdmin) {
      return respondNotFound(request, supabaseResponse);
    }
    return supabaseResponse;
  }

  // 5. Role-Based Access Control (RBAC) boundaries
  // Check Admin portal access
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const hasAdminAccess = roles.some((r) => ADMIN_STAFF_ROLES.includes(r));
    if (!hasAdminAccess) {
      return respondNotFound(request, supabaseResponse);
    }

    // Granular permissions within /admin for non-system admins:
    if (!isSystemAdmin) {
      // /admin/users & /admin/settings: strictly for system administrators
      if (
        pathname.startsWith("/admin/users") ||
        pathname.startsWith("/api/admin/users") ||
        pathname.startsWith("/admin/settings") ||
        pathname.startsWith("/api/admin/settings")
      ) {
        return respondNotFound(request, supabaseResponse);
      }

      // /admin/audit: auditor, registrar
      if (
        (pathname.startsWith("/admin/audit") || pathname.startsWith("/api/admin/audit")) &&
        !roles.includes("auditor") &&
        !roles.includes("registrar")
      ) {
        return respondNotFound(request, supabaseResponse);
      }

      // /admin/fees: finance roles, registrar, dean
      if (
        (pathname.startsWith("/admin/fees") || pathname.startsWith("/api/admin/fees")) &&
        !roles.some((r) => ["bursar", "finance_officer", "accountant", "registrar", "dean"].includes(r))
      ) {
        return respondNotFound(request, supabaseResponse);
      }

      // /admin/library: librarian, dean
      if (
        (pathname.startsWith("/admin/library") || pathname.startsWith("/api/admin/library")) &&
        !roles.includes("librarian") &&
        !roles.includes("dean")
      ) {
        return respondNotFound(request, supabaseResponse);
      }

      // /admin/hostels: hostel_officer, dean
      if (
        (pathname.startsWith("/admin/hostels") || pathname.startsWith("/api/admin/hostels")) &&
        !roles.includes("hostel_officer") &&
        !roles.includes("dean")
      ) {
        return respondNotFound(request, supabaseResponse);
      }

      // /admin/admissions: admissions_officer, registrar, dean
      if (
        (pathname.startsWith("/admin/admissions") || pathname.startsWith("/api/admin/admissions")) &&
        !roles.some((r) => ["admissions_officer", "registrar", "dean", "academic_affairs_officer"].includes(r))
      ) {
        return respondNotFound(request, supabaseResponse);
      }

      // /admin/leave & /admin/staff: hr_officer, registrar, dean, vice_chancellor
      if (
        (pathname.startsWith("/admin/leave") ||
          pathname.startsWith("/api/admin/leave") ||
          pathname.startsWith("/admin/staff") ||
          pathname.startsWith("/api/admin/staff")) &&
        !roles.some((r) => ["hr_officer", "registrar", "dean", "vice_chancellor"].includes(r))
      ) {
        return respondNotFound(request, supabaseResponse);
      }
    }

    return supabaseResponse;
  }

  // System Admin and Super Admin hold universal access across non-superadmin portals
  if (isSystemAdmin) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/lecturer") || pathname.startsWith("/api/lecturer")) {
    const hasLecturerAccess = roles.includes("lecturer");
    if (!hasLecturerAccess) {
      return respondNotFound(request, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/student") || pathname.startsWith("/api/student")) {
    const hasStudentAccess = roles.includes("student");
    if (!hasStudentAccess) {
      return respondNotFound(request, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/applicant") || pathname.startsWith("/api/applicant")) {
    const hasApplicantAccess =
      roles.includes("applicant") ||
      roles.includes("admissions_officer");
    if (!hasApplicantAccess) {
      return respondNotFound(request, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/advisor") || pathname.startsWith("/api/advisor")) {
    const hasAdvisorAccess = roles.includes("academic_advisor") || roles.includes("advisor");
    if (!hasAdvisorAccess) {
      return respondNotFound(request, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/finance") || pathname.startsWith("/api/finance")) {
    const hasFinanceAccess =
      roles.some((r) => ["bursar", "finance_officer", "accountant", "auditor"].includes(r));
    if (!hasFinanceAccess) {
      return respondNotFound(request, supabaseResponse);
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
