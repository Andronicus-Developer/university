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
    const schoolId = tenant.schoolId;

    let cq = db.from("courses").select("*").order("code", { ascending: true });
    let dq = db.from("departments").select("id, name, code").order("name", { ascending: true });
    let pq = db.from("programmes").select("id, name, code, degree_level").order("name", { ascending: true });
    if (schoolId) {
      cq = cq.eq("school_id", schoolId);
      dq = dq.eq("school_id", schoolId);
      pq = pq.eq("school_id", schoolId);
    }

    const [coursesRes, deptsRes, progsRes] = await Promise.all([cq, dq, pq]);
    if (coursesRes.error) {
      return NextResponse.json({ error: coursesRes.error.message }, { status: 500 });
    }

    const deptMap = new Map<string, any>(
      (deptsRes.data || []).map((d: any) => [String(d.id), d])
    );

    const courses = (coursesRes.data || []).map((c: any) => {
      const dept = c.department_id ? deptMap.get(String(c.department_id)) : null;
      return {
        ...c,
        credits: Number(c.credits) || 3,
        contact_hours: Number(c.contact_hours) || 3,
        course_type: c.course_type || "core",
        is_active: c.is_active ?? true,
        department_name: dept?.name || "General Department",
        department_code: dept?.code || "GEN",
      };
    });

    return NextResponse.json({
      courses,
      departments: deptsRes.data || [],
      programmes: progsRes.data || [],
      stats: {
        totalCourses: courses.length,
        activeCourses: courses.filter((c: any) => c.is_active).length,
        coreCourses: courses.filter((c: any) => c.course_type === "core").length,
        electiveCourses: courses.filter((c: any) => c.course_type === "elective").length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    if (!body?.code?.trim() || !body?.name?.trim()) {
      return NextResponse.json({ error: "Course code and name are required." }, { status: 400 });
    }

    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    const schoolId = targetSchool.schoolId;

    const db = createDirectAdminClient() as any;
    const { data, error } = await db
      .from("courses")
      .insert({
        school_id: schoolId,
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        description: body.description ? String(body.description).trim() : null,
        department_id: body.department_id || null,
        programme_id: body.programme_id || null,
        credits: Number(body.credits || 3),
        contact_hours: Number(body.contact_hours || 3),
        course_type: body.course_type || "core",
        semester_number: Number(body.semester_number || 1),
        level: Number(body.level || 100),
        is_active: body.is_active !== false,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ course: data, success: true });
  } catch (err: any) {
    console.error("POST /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Course id is required." }, { status: 400 });

    const db = createDirectAdminClient() as any;
    let q = db.from("courses").delete().eq("id", id);
    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
