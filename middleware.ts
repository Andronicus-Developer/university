import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_STAFF_ROLES = [
  "system_admin",
  "vice_chancellor",
  "registrar",
  "academic_affairs_officer",
  "dean",
  "head_of_department",
  "admissions_officer",
  "finance_officer",
  "librarian",
  "hostel_officer",
  "hr_officer",
  "auditor",
];

function getTargetDashboardForRoles(roles: string[]): string {
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
  return "/admin/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Instantly allow static files, images, favicon, and auth callbacks
  const isStaticOrAuthApi =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/auth") ||
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

  const metaRole =
    user.user_metadata?.role ||
    user.user_metadata?.default_role ||
    (user.email === "admin@university.edu.gh" ? "system_admin" : undefined);

  if (metaRole) {
    roles.push(metaRole);
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

  // If already authenticated and visiting the login page, redirect to dashboard
  if (isLoginPage) {
    const dashboardPath = getTargetDashboardForRoles(roles);
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Allow unauthorized notice page
  if (pathname === "/unauthorized") {
    return supabaseResponse;
  }

  // 5. Role-Based Access Control (RBAC) boundaries
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const hasAdminAccess = roles.some((r) => ADMIN_STAFF_ROLES.includes(r));
    if (!hasAdminAccess) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/lecturer")) {
    const hasLecturerAccess = roles.includes("lecturer") || roles.includes("system_admin");
    if (!hasLecturerAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/student")) {
    const hasStudentAccess = roles.includes("student") || roles.includes("system_admin");
    if (!hasStudentAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/applicant")) {
    const hasApplicantAccess =
      roles.includes("applicant") ||
      roles.includes("system_admin") ||
      roles.includes("admissions_officer");
    if (!hasApplicantAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/advisor")) {
    const hasAdvisorAccess = roles.includes("academic_advisor") || roles.includes("system_admin");
    if (!hasAdvisorAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
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
