import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAcademicStaffContext,
  safeStaffQuery,
  studentDisplayName,
} from "@/lib/staff/staff-context";

export async function GET(request: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(request);
  if (errorResponse || !ctx) return errorResponse!;

  try {
    const db = createDirectAdminClient() as any;
    const [coursesRes, enrRes, gradesRes, ttRes] = await Promise.all([
      safeStaffQuery<any[]>(
        db
          .from("courses")
          .select("id, code, name, credits, department_id, programme_id, lecturer_id, semester_number, is_active")
          .eq("school_id", ctx.schoolId)
          .order("code", { ascending: true })
      ),
      safeStaffQuery<any[]>(
        db
          .from("course_enrolments")
          .select("id, student_id, course_id, status")
          .eq("school_id", ctx.schoolId)
      ),
      safeStaffQuery<any[]>(
        db
          .from("exam_grades")
          .select("id, student_id, course_id, term_id, status")
          .eq("school_id", ctx.schoolId)
      ),
      safeStaffQuery<any[]>(
        db
          .from("timetable_entries")
          .select("id, programme_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, term_id, course_id")
          .eq("school_id", ctx.schoolId)
      ),
    ]);

    const explicitSet = new Set(ctx.assignedCourseIds.map(String));
    const courses = (coursesRes.data || []).filter((c) =>
      explicitSet.size > 0
        ? explicitSet.has(String(c.id)) || (ctx.staffId && String(c.lecturer_id) === String(ctx.staffId))
        : true
    );
    const courseIds = new Set(courses.map((c) => String(c.id)));
    const enrolments = (enrRes.data || []).filter(
      (e) => e.status !== "dropped" && courseIds.has(String(e.course_id))
    );
    const grades = (gradesRes.data || []).filter((g) => courseIds.has(String(g.course_id)));
    const timetable = (ttRes.data || []).filter((t) => courseIds.has(String(t.course_id)));

    return NextResponse.json({
      success: true,
      school: { id: ctx.schoolId, name: ctx.schoolName, schoolType: ctx.schoolType },
      staff: ctx.staffProfile,
      courses,
      enrolmentsCount: enrolments.length,
      gradesCount: grades.length,
      timetable,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(request);
  if (errorResponse || !ctx) return errorResponse!;

  return NextResponse.json(
    {
      success: true,
      message: `Authenticated staff context verified for ${studentDisplayName(ctx.staffProfile)}. Use /api/staff/portal for mutations.`,
    },
    { status: 200 }
  );
}
