import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const db = supabase as any;

    const { data, error } = await db
      .from("system_settings")
      .select("setting_value, updated_at")
      .eq("setting_key", "institution_info")
      .maybeSingle();

    if (error) {
      console.warn("Failed to fetch institution_info:", error.message);
    }

    const value = (data?.setting_value as Record<string, any>) || {};

    return NextResponse.json({
      name: value.name || "Accra Institute of Technology",
      short_name: value.short_name || "Premier Tech",
      abbreviation: value.abbreviation || "AIT",
      motto: value.motto || "",
      logo_url: value.logo_url || "",
      seal_url: value.seal_url || "",
      website: value.website || "",
      email: value.email || "",
      phone: value.phone || "",
      address: value.address || "",
      city: value.city || "Accra",
      region: value.region || "Greater Accra Region",
      country: value.country || "Ghana",
      currency: value.currency || "GHS",
      currency_symbol: value.currency_symbol || "GH₵",
      updated_at: data?.updated_at || new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        name: "Accra Institute of Technology",
        short_name: "Premier Tech",
        abbreviation: "AIT",
        logo_url: "",
        seal_url: "",
        city: "Accra",
        country: "Ghana",
        error: err.message,
      },
      { status: 200 }
    );
  }
}
