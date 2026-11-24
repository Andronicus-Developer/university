import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { resolveAcademicStaffContext, safeStaffQuery } from "@/lib/staff/staff-context";

export async function GET(request: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(request);
  if (errorResponse || !ctx) return errorResponse!;

  try {
    const db = createDirectAdminClient() as any;
    const [coursesRes, sessionsRes] = await Promise.all([
      safeStaffQuery<any[]>(
        db.from("courses").select("id, code, name").eq("school_id", ctx.schoolId).order("code", { ascending: true })
      ),
      safeStaffQuery<any[]>(
        db
          .from("attendance_sessions")
          .select("*")
          .eq("school_id", ctx.schoolId)
          .order("session_date", { ascending: false })
          .limit(50)
      ),
    ]);

    return NextResponse.json({
      success: true,
      courses: coursesRes.data || [],
      sessions: sessionsRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(request);
  if (errorResponse || !ctx) return errorResponse!;

  try {
    const db = createDirectAdminClient() as any;
    const body = await request.json();
    const { courseId, sessionDate, topic, records } = body;

    if (!courseId || !sessionDate || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "Course, date, and attendance records are required." },
        { status: 400 }
      );
    }

    const { data: sess, error: sErr } = await db
      .from("attendance_sessions")
      .insert({
        school_id: ctx.schoolId,
        course_id: courseId,
        staff_id: ctx.staffId,
        session_date: sessionDate,
        session_type: "lecture",
        topic: topic || "Lecture Session",
        status: "completed",
      })
      .select("*")
      .single();

    if (sErr || !sess) {
      return NextResponse.json({ success: false, error: sErr?.message || "Failed to save session" }, { status: 400 });
    }

    const rows = records.map((r: any) => ({
      school_id: ctx.schoolId,
      session_id: sess.id,
      student_id: r.studentId,
      status: r.status || "present",
    }));

    const { error: rErr } = await db.from("attendance_records").insert(rows);
    if (rErr) {
      return NextResponse.json({ success: false, error: rErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: sess });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
