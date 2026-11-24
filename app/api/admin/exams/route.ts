import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { resolveAdminTenantRequest } from "@/lib/admin/tenant-provisioning";

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const db = createDirectAdminClient() as any;
    const schoolId = tenant.schoolId;

    let gq = db
      .from("exam_grades")
      .select("*, courses:course_id(id, code, name)")
      .order("created_at", { ascending: false });
    let cq = db.from("courses").select("id, code, name").order("code", { ascending: true });
    if (schoolId) {
      gq = gq.eq("school_id", schoolId);
      cq = cq.eq("school_id", schoolId);
    }

    const [gradesRes, coursesRes] = await Promise.all([gq, cq]);
    if (gradesRes.error) {
      return NextResponse.json({ error: gradesRes.error.message }, { status: 500 });
    }

    const grades = gradesRes.data || [];
    return NextResponse.json({
      exams: grades.map((g: any) => ({
        id: g.id,
        course_id: g.course_id,
        course_code: g.courses?.code || "",
        course_name: g.courses?.name || "Course",
        total_score: g.total_score,
        grade_letter: g.grade_letter,
        status: g.status || "published",
        created_at: g.created_at,
      })),
      courses: coursesRes.data || [],
      stats: {
        totalExams: grades.length,
        published: grades.filter((g: any) => g.status === "published").length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/exams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
