import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const db = createDirectAdminClient() as any;
    let q = db.from("hostels").select("*").order("name", { ascending: true });
    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ residences: data || [] });
  } catch (err: any) {
    console.error("GET /api/admin/hostels error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "Hostel name is required." }, { status: 400 });
    }

    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    const schoolId = targetSchool.schoolId;

    const db = createDirectAdminClient() as any;
    const { data, error } = await db
      .from("hostels")
      .insert({
        school_id: schoolId,
        name: body.name.trim(),
        code: body.code ? String(body.code).trim() : `HST-${Math.floor(100 + Math.random() * 900)}`,
        gender_policy: body.gender_allocation || body.gender_policy || "mixed",
        total_rooms: Number(body.total_rooms || 20),
        total_beds: Number(body.total_capacity || body.total_beds || 40),
        address: body.address ? String(body.address).trim() : null,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ residence: data, success: true });
  } catch (err: any) {
    console.error("POST /api/admin/hostels error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
