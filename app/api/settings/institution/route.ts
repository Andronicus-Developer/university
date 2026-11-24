import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { getUniversities } from "@/lib/superadmin/service";
import { normalizeSchoolType } from "@/lib/academics/school-terminology";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";

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

      // Parallelize all authoritative school_id lookups instead of running 5 sequential round-trips
      const [profRes, memRes, staffRes, studentRes, parentRes] = await Promise.all([
        (directAdmin as any)
          .from("profiles")
          .select("school_id, university_id")
          .eq("id", activeUserId)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
        (directAdmin as any)
          .from("school_memberships")
          .select("school_id")
          .eq("user_id", activeUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
        (directAdmin as any)
          .from("staff_profiles")
          .select("school_id")
          .eq("user_id", activeUserId)
          .limit(1)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
        (directAdmin as any)
          .from("students")
          .select("school_id")
          .or(`profile_id.eq.${activeUserId},id.eq.${activeUserId}`)
          .limit(1)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
        (() => {
          let parentQuery = (directAdmin as any)
            .from("parent_guardians")
            .select("school_id");
          parentQuery = activeEmail
            ? parentQuery.or(`user_id.eq.${activeUserId},email.eq.${activeEmail}`)
            : parentQuery.eq("user_id", activeUserId);
          return parentQuery
            .limit(1)
            .maybeSingle()
            .then((r: any) => r, () => ({ data: null }));
        })(),
      ]);

      resolvedSchoolId =
        profRes?.data?.school_id ||
        profRes?.data?.university_id ||
        memRes?.data?.school_id ||
        staffRes?.data?.school_id ||
        studentRes?.data?.school_id ||
        parentRes?.data?.school_id ||
        user?.app_metadata?.school_id ||
        user?.app_metadata?.university_id ||
        user?.user_metadata?.school_id ||
        user?.user_metadata?.university_id ||
        tenantCtx.schoolId ||
        null;

      if (resolvedSchoolId) {
        resolvedSchoolId = String(resolvedSchoolId);
      } else {
        // Virtual DB profiles fallback only when live tables had no match
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

    // Lookup target school directly by ID first (avoid scanning all tenants on every portal load)
    let matchedSchool: any = null;
    if (UUID_REGEX.test(resolvedSchoolId)) {
      try {
        const directAdmin = createDirectAdminClient();
        const { data: liveSchool } = await (directAdmin as any)
          .from("schools")
          .select(
            "id, name, short_name, slug, tenant_slug, school_type, country, city, address, email, phone, website, logo_url, motto, currency, status, academic_settings, created_at, updated_at"
          )
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
            website: liveSchool.website || "",
            logo_url: liveSchool.logo_url || "",
            motto: liveSchool.motto || "",
            default_currency: liveSchool.currency || "",
            currency_symbol:
              liveSchool.currency === "GHS" ? "GH₵" : liveSchool.currency ? "$" : "",
            status: liveSchool.status || "active",
            academic_settings: liveSchool.academic_settings || {},
            created_at: liveSchool.created_at || new Date().toISOString(),
            updated_at: liveSchool.updated_at || liveSchool.created_at,
          };
        }
      } catch {}
    }

    if (!matchedSchool) {
      const allSchools = await getUniversities();
      matchedSchool = allSchools.find(
        (u) => String(u.id).toLowerCase() === String(resolvedSchoolId).toLowerCase()
      );
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
      academic_settings: (matchedSchool as any).academic_settings || {},
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

export async function PUT(request: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const targetSchool = await resolveTargetSchoolForMutation(
      tenant,
      body.school_id || body.id
    );
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const schoolId = targetSchool.schoolId;
    const directAdmin = createDirectAdminClient();
    const nowIso = new Date().toISOString();

    const baseUpdate: Record<string, any> = {
      updated_at: nowIso,
    };
    if (typeof body.name === "string" && body.name.trim()) {
      baseUpdate.name = body.name.trim();
    }
    if (typeof body.email === "string") baseUpdate.email = body.email.trim();
    if (typeof body.phone === "string") baseUpdate.phone = body.phone.trim();
    if (typeof body.address === "string") baseUpdate.address = body.address.trim();
    if (typeof body.currency === "string" && body.currency.trim()) {
      baseUpdate.currency = body.currency.trim().toUpperCase();
    }
    if (typeof body.timezone === "string" && body.timezone.trim()) {
      baseUpdate.timezone = body.timezone.trim();
    }

    const extendedUpdate: Record<string, any> = { ...baseUpdate };
    if (typeof body.logo_url === "string") extendedUpdate.logo_url = body.logo_url.trim();
    if (typeof body.motto === "string") extendedUpdate.motto = body.motto.trim();
    if (typeof body.website === "string") extendedUpdate.website = body.website.trim();
    if (body.academic_settings && typeof body.academic_settings === "object") {
      extendedUpdate.academic_settings = body.academic_settings;
    }

    let { data: updatedSchool, error: updateErr } = await (directAdmin as any)
      .from("schools")
      .update(extendedUpdate)
      .eq("id", schoolId)
      .select("*")
      .single();

    if (
      updateErr &&
      (String(updateErr.code || "") === "42703" ||
        String(updateErr.message || "").includes("column"))
    ) {
      // Fallback to base columns if optional school columns haven't been migrated yet
      const retry = await (directAdmin as any)
        .from("schools")
        .update(baseUpdate)
        .eq("id", schoolId)
        .select("*")
        .single();
      updatedSchool = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message || "Failed to update school settings." },
        { status: 400 }
      );
    }

    // Mirror institution & academic policy settings into virtual store if available
    try {
      const virtualAdmin = createAdminClient();
      if (body.academic_settings && typeof body.academic_settings === "object") {
        await (virtualAdmin as any).from("system_settings").upsert(
          {
            setting_key: `academic_policy_${schoolId}`,
            setting_value: body.academic_settings,
            category: "academics",
            description: "School-specific grading scale and academic rules",
            updated_at: nowIso,
          },
          { onConflict: "setting_key" }
        );
      }
    } catch {
      // Non-blocking mirror
    }

    return NextResponse.json({
      success: true,
      school: updatedSchool,
      school_id: schoolId,
    });
  } catch (err: any) {
    console.error("PUT /api/settings/institution error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save school settings." },
      { status: err?.statusCode || 500 }
    );
  }
}
