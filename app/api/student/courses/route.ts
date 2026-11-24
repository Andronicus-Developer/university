import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveStudentRequestContext,
  safeStudentQuery,
} from "@/lib/student/student-context";

/**
 * Multi-tenant student course registration endpoint scoped strictly by authenticated
 * `(school_id, student_id)` and `school_type === 'university'`.
 */
export async function GET(request: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(request);
    if (errorResponse) return errorResponse;

    if (!ctx.student) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }
    if (!ctx.isSuperAdmin && ctx.schoolType !== "university") {
      return NextResponse.json(
        { error: "Course registration is only enabled for university portals." },
        { status: 403 }
      );
    }

    const db = createDirectAdminClient();
    const [enrolsRes, coursesRes] = await Promise.all([
      safeStudentQuery<any[]>(
        (db as any)
          .from("course_enrolments")
          .select("*")
          .eq("school_id", ctx.schoolId)
          .eq("student_id", ctx.student.id)
      ),
      safeStudentQuery<any[]>(
        (db as any)
          .from("courses")
          .select("*")
          .eq("school_id", ctx.schoolId)
          .eq("is_active", true)
          .order("code", { ascending: true })
      ),
    ]);

    const enrolments = enrolsRes.data || [];
    const registeredIds = new Set(enrolments.map((e: any) => String(e.course_id)));
    const availableCourses = (coursesRes.data || []).filter(
      (c: any) => !registeredIds.has(String(c.id))
    );

    return NextResponse.json({
      enrolments,
      availableCourses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(request);
    if (errorResponse) return errorResponse;
    if (!ctx.student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }
    if (!ctx.isSuperAdmin && ctx.schoolType !== "university") {
      return NextResponse.json({ error: "Forbidden for this school type" }, { status: 403 });
    }

    const db = createDirectAdminClient();
    const body = await request.json().catch(() => ({}));
    const courseId = String(body.courseId || "").trim();
    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    const { data: course } = await (db as any)
      .from("courses")
      .select("id")
      .eq("school_id", ctx.schoolId)
      .eq("id", courseId)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: created, error } = await (db as any)
      .from("course_enrolments")
      .insert({
        school_id: ctx.schoolId,
        student_id: ctx.student.id,
        course_id: courseId,
        academic_year_id: ctx.activeYear?.id || null,
        term_id: ctx.activeTerm?.id || null,
        status: "registered",
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, enrolment: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(request);
    if (errorResponse) return errorResponse;
    if (!ctx.student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const db = createDirectAdminClient();
    const body = await request.json().catch(() => ({}));
    const enrolmentId = String(
      body.enrolmentId || request.nextUrl.searchParams.get("enrolmentId") || ""
    ).trim();
    const courseId = String(
      body.courseId || request.nextUrl.searchParams.get("courseId") || ""
    ).trim();

    if (!enrolmentId && !courseId) {
      return NextResponse.json(
        { error: "Missing enrolmentId or courseId" },
        { status: 400 }
      );
    }

    let query = (db as any)
      .from("course_enrolments")
      .delete()
      .eq("school_id", ctx.schoolId)
      .eq("student_id", ctx.student.id);

    if (enrolmentId) {
      query = query.eq("id", enrolmentId);
    } else {
      query = query.eq("course_id", courseId);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Course dropped successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
