import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";
import { getUniversities } from "@/lib/superadmin/service";

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies
      .getAll()
      .map((c) => ({ name: c.name, value: c.value }));
    const tenantCtx = resolveTenantContextFromHeaders(request.headers, cookies);

    // 1. If the user belongs to a specific tenant school, return that school's exact profile
    if (tenantCtx.isAuthenticated && tenantCtx.schoolId) {
      const allSchools = await getUniversities();
      const matchedSchool = allSchools.find(
        (u) => String(u.id) === String(tenantCtx.schoolId)
      );

      if (matchedSchool) {
        const sType =
          matchedSchool.school_type ||
          matchedSchool.institution_type ||
          "university";
        return NextResponse.json({
          id: matchedSchool.id,
          school_id: matchedSchool.id,
          name: matchedSchool.name,
          short_name: matchedSchool.short_name || matchedSchool.name,
          abbreviation: matchedSchool.code,
          code: matchedSchool.code,
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
          city: matchedSchool.city || "Accra",
          country: matchedSchool.country || "Ghana",
          currency: matchedSchool.default_currency || "GHS",
          currency_symbol: matchedSchool.currency_symbol || "GH₵",
          tenant_isolated: true,
          updated_at: matchedSchool.updated_at || matchedSchool.created_at,
        });
      }
    }

    // 2. Fallback to system_settings institution_info
    const supabase = createAdminClient();
    const db = supabase as any;

    const { data } = await db
      .from("system_settings")
      .select("setting_value, updated_at")
      .eq("setting_key", "institution_info")
      .maybeSingle();

    const value = (data?.setting_value as Record<string, any>) || {};

    return NextResponse.json({
      id: tenantCtx.schoolId || "",
      school_id: tenantCtx.schoolId || "",
      name: value.name || "",
      short_name: value.short_name || value.name || "",
      abbreviation: value.abbreviation || "",
      code: value.abbreviation || "",
      school_type: value.school_type || "university",
      institution_type: value.school_type || "university",
      subscription_plan: value.subscription_plan || "enterprise",
      subscription_status: value.subscription_status || "active",
      motto: value.motto || "",
      logo_url: value.logo_url || "",
      seal_url: value.seal_url || "",
      website: value.website || "",
      email: value.email || "",
      phone: value.phone || "",
      address: value.address || "",
      city: value.city || "",
      region: value.region || "",
      country: value.country || "",
      currency: value.currency || "USD",
      currency_symbol: value.currency_symbol || "$",
      tenant_isolated: true,
      updated_at: data?.updated_at || new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        name: "",
        short_name: "",
        abbreviation: "",
        code: "",
        school_type: "university",
        subscription_plan: "enterprise",
        tenant_isolated: true,
        city: "",
        country: "",
      },
      { status: 200 }
    );
  }
}
