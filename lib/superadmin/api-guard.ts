import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";

/**
 * Defense-in-depth route guard for all /api/superadmin/* handlers.
 * Returns null if the caller is a verified Super Admin, otherwise returns 401 or 403 NextResponse.
 */
export async function requireSuperAdminApi(
  req: NextRequest
): Promise<NextResponse | null> {
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
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  let isSuperAdmin =
    tenantCtx.isSuperAdmin ||
    activeEmail === "superadmin@university.edu.gh" ||
    user?.app_metadata?.role === "superadmin" ||
    user?.app_metadata?.default_role === "superadmin";

  if (!isSuperAdmin && activeUserId) {
    try {
      const db = createDirectAdminClient() as any;
      const [{ data: prof }, { data: mems }] = await Promise.all([
        db.from("profiles").select("role").eq("id", activeUserId).maybeSingle(),
        db
          .from("school_memberships")
          .select("role")
          .eq("user_id", activeUserId)
          .eq("status", "active"),
      ]);
      if (String(prof?.role || "").toLowerCase() === "superadmin") {
        isSuperAdmin = true;
      }
      if ((mems || []).some((m: any) => String(m.role || "").toLowerCase() === "superadmin")) {
        isSuperAdmin = true;
      }
    } catch {
      // fall through
    }
  }

  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Super Admin privileges required." },
      { status: 403 }
    );
  }

  return null;
}
