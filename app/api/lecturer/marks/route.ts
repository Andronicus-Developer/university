import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { resolveAcademicStaffContext, safeStaffQuery } from "@/lib/staff/staff-context";

export async function GET(request: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(request);
  if (errorResponse || !ctx) return errorResponse!;

  try {
    const db = createDirectAdminClient() as any;
    const courseId = request.nextUrl.searchParams.get("courseId");
    let query = db.from("exam_grades").select("*").eq("school_id", ctx.schoolId);
    if (courseId) query = query.eq("course_id", courseId);
    const { data: grades } = await safeStaffQuery<any[]>(query);
    return NextResponse.json({ success: true, grades: grades || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(request);
  if (errorResponse || !ctx) return errorResponse!;

  return NextResponse.json(
    {
      success: false,
      error: "Use POST /api/staff/portal (action: save_exam_grades) for verified grade submissions.",
    },
    { status: 400 }
  );
}
