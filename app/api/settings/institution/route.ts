import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { getUniversities } from "@/lib/superadmin/service";
import { normalizeSchoolType } from "@/lib/academics/school-terminology";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies
      .getAll()
      .map((c) => ({ name: c.name, value: c.value }));
    const tenantCtx = resolveTenantContextFromHeaders(request.headers, cookies);
    const { user } = await updateSession(request).catch(() => ({ user: null as any }));

    const activeUserId = user?.id || tenantCtx.userId;
    const activeEmail = String(user?.email || tenantCtx.email || "").trim().toLowerCase();

    if (!activeUserId && !tenantCtx.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required.", tenant_isolated: true },
        { status: 401 }
      );
    }

    const metaRole = String(
      user?.app_metadata?.role ||
        user?.user_metadata?.role ||
        user?.user_metadata?.default_role ||
        tenantCtx.role ||
        ""
    ).toLowerCase();

    const isSuperAdmin =
      tenantCtx.isSuperAdmin ||
      activeEmail === "superadmin@university.edu.gh" ||
      metaRole === "superadmin";

    const requestedSchoolId =
      request.nextUrl.searchParams.get("school_id") ||
      request.headers.get("x-tenant-school-id") ||
      null;

    // Resolve authoritative school_id for non-SuperAdmin users across live DB, metadata, and virtual DB
    let resolvedSchoolId: string | null = isSuperAdmin ? requestedSchoolId : null;

    if (!isSuperAdmin && activeUserId) {
      const directAdmin = createDirectAdminClient();

      // 1a. Live public.profiles
      try {
        const { data: liveProf } = await (directAdmin as any)
          .from("profiles")
          .select("school_id, university_id")
          .eq("id", activeUserId)
          .maybeSingle();
        if (liveProf?.school_id || liveProf?.university_id) {
          resolvedSchoolId = String(liveProf.school_id || liveProf.university_id);
        }
      } catch {}

      // 1b. Live public.school_memberships
      if (!resolvedSchoolId) {
        try {
          const { data: liveMem } = await (directAdmin as any)
            .from("school_memberships")
            .select("school_id")
            .eq("user_id", activeUserId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (liveMem?.school_id) {
            resolvedSchoolId = String(liveMem.school_id);
          }
        } catch {}
      }

      // 1c. Live public.staff_profiles
      if (!resolvedSchoolId) {
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

      // 1c. Authenticated user metadata / JWT claims
      if (!resolvedSchoolId) {
        resolvedSchoolId =
          user?.app_metadata?.school_id ||
          user?.app_metadata?.university_id ||
          user?.user_metadata?.school_id ||
          user?.user_metadata?.university_id ||
          tenantCtx.schoolId ||
          null;
      }

      // 1d. Virtual DB profiles / university_system_admins fallback
      if (!resolvedSchoolId) {
        try {
          const adminClient = createAdminClient();
          const { data: vProf } = await (adminClient as any)
            .from("profiles")
            .select("school_id, university_id, metadata")
            .eq("id", activeUserId)
            .maybeSingle();
          const candidate =
            vProf?.school_id ||
            vProf?.university_id ||
            vProf?.metadata?.school_id ||
            vProf?.metadata?.university_id;
          if (candidate) resolvedSchoolId = String(candidate);
        } catch {}
      }
    }

    if (isSuperAdmin && !resolvedSchoolId) {
      return NextResponse.json({
        id: "",
        school_id: "",
        name: "",
        short_name: "",
        abbreviation: "",
        code: "",
        school_type: null,
        institution_type: null,
        tenant_isolated: true,
        is_super_admin: true,
      });
    }

    if (!resolvedSchoolId) {
      return NextResponse.json(
        {
          error:
            "Your account is not linked to a registered school. Contact your Super Administrator.",
          unassigned: true,
          tenant_isolated: true,
        },
        { status: 403 }
      );
    }

    // Lookup strictly by resolvedSchoolId in merged schools + live public.schools
    const allSchools = await getUniversities();
    let matchedSchool = allSchools.find(
      (u) => String(u.id).toLowerCase() === String(resolvedSchoolId).toLowerCase()
    );

    if (!matchedSchool && UUID_REGEX.test(resolvedSchoolId)) {
      try {
        const directAdmin = createDirectAdminClient();
        const { data: liveSchool } = await (directAdmin as any)
          .from("schools")
          .select("*")
          .eq("id", resolvedSchoolId)
          .maybeSingle();

        if (liveSchool?.id) {
          matchedSchool = {
            id: liveSchool.id,
            code: String(liveSchool.tenant_slug || liveSchool.slug || "SCH").toUpperCase(),
            name: liveSchool.name,
            short_name: liveSchool.short_name || liveSchool.name,
            school_type: liveSchool.school_type || "university",
            institution_type: liveSchool.school_type || "university",
            country: liveSchool.country || "",
            city: liveSchool.city || "",
            address: liveSchool.address || "",
            email: liveSchool.email || "",
            phone: liveSchool.phone || "",
            default_currency: liveSchool.currency || "",
            currency_symbol: liveSchool.currency === "GHS" ? "GH₵" : liveSchool.currency ? "$" : "",
            status: liveSchool.status || "active",
            created_at: liveSchool.created_at || new Date().toISOString(),
            updated_at: liveSchool.updated_at || liveSchool.created_at,
          };
        }
      } catch {}
    }

    if (!matchedSchool) {
      return NextResponse.json(
        {
          error: "Assigned school was not found or has been deleted.",
          school_id: resolvedSchoolId,
          tenant_isolated: true,
        },
        { status: 404 }
      );
    }

    const sType = normalizeSchoolType(
      matchedSchool.school_type || matchedSchool.institution_type
    );
    return NextResponse.json({
      id: matchedSchool.id,
      school_id: matchedSchool.id,
      name: matchedSchool.name,
      short_name: matchedSchool.short_name || matchedSchool.name,
      abbreviation: matchedSchool.code || "",
      code: matchedSchool.code || "",
      school_type: sType,
      institution_type: sType,
      subscription_plan: (matchedSchool as any).subscription_plan || "enterprise",
      subscription_status: (matchedSchool as any).subscription_status || "active",
      motto: matchedSchool.motto || "",
      logo_url: matchedSchool.logo_url || "",
      seal_url: matchedSchool.seal_url || "",
      website: matchedSchool.website || "",
      email: matchedSchool.email || "",
      phone: matchedSchool.phone || "",
      address: matchedSchool.address || "",
      city: matchedSchool.city || "",
      country: matchedSchool.country || "",
      currency: matchedSchool.default_currency || "",
      currency_symbol: matchedSchool.currency_symbol || "",
      tenant_isolated: true,
      updated_at: matchedSchool.updated_at || matchedSchool.created_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Failed to load institution settings.",
        tenant_isolated: true,
      },
      { status: 500 }
    );
  }
}
