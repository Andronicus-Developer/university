import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveStudentRequestContext,
  safeStudentQuery,
} from "@/lib/student/student-context";

/**
 * Hardened multi-tenant endpoint delegating to strict authenticated `(school_id, student_id)` resolution.
 * Never falls back to another student's record.
 */
export async function GET(request: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(request);
    if (errorResponse) return errorResponse;

    if (!ctx.student) {
      return NextResponse.json(
        { error: "Student profile not linked to this account." },
        { status: 404 }
      );
    }

    const db = createDirectAdminClient();
    const schoolId = ctx.schoolId;
    const studentId = String(ctx.student.id);

    const [coursesRes, enrolsRes, gradesRes, invoicesRes, paymentsRes] =
      await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("courses")
            .select("id, school_id, department_id, programme_id, code, name, credits, contact_hours, course_type, semester_number, is_active")
            .eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("course_enrolments")
            .select("id, school_id, student_id, course_id, academic_year_id, term_id, status, registered_at, created_at")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("exam_grades")
            .select("id, school_id, student_id, course_id, term_id, ca_score, exam_score, total_score, grade_letter, grade_point, remarks, status, created_at")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("invoices")
            .select("id, school_id, student_id, invoice_number, description, total_amount, paid_amount, balance, currency, status, due_date, created_at")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("payments")
            .select("id, school_id, student_id, invoice_id, amount, currency, payment_method, provider_reference, receipt_number, payment_date, status, created_at")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
      ]);

    const totalInvoiced = (invoicesRes.data || []).reduce(
      (sum: number, inv: any) => sum + Number(inv.total_amount ?? 0),
      0
    );
    const totalPaid =
      (paymentsRes.data || []).length > 0
        ? (paymentsRes.data || []).reduce(
            (sum: number, pay: any) => sum + Number(pay.amount ?? 0),
            0
          )
        : (invoicesRes.data || []).reduce(
            (sum: number, inv: any) => sum + Number(inv.paid_amount ?? 0),
            0
          );

    return NextResponse.json({
      activeTerm: ctx.activeTerm,
      student: {
        id: ctx.student.id,
        profileId: ctx.student.profile_id,
        studentNumber: ctx.student.student_number,
        fullName: ctx.student.full_name,
        email: ctx.student.email,
        phone: ctx.student.phone,
        address: ctx.student.address,
        level: ctx.student.current_level || 100,
        gpa: Number(ctx.student.gpa ?? 0),
        cgpa: Number(ctx.student.cgpa ?? 0),
        programme: ctx.programme?.name || "",
        programmeCode: ctx.programme?.code || "",
        department: ctx.department?.name || "",
      },
      courses: coursesRes.data || [],
      enrolments: enrolsRes.data || [],
      grades: gradesRes.data || [],
      finance: {
        totalInvoiced,
        totalPaid,
        balanceDue: Math.max(0, totalInvoiced - totalPaid),
        invoices: invoicesRes.data || [],
        payments: paymentsRes.data || [],
      },
    });
  } catch (error: any) {
    console.error("Student dashboard GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch student dashboard data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(request);
    if (errorResponse) return errorResponse;

    if (!ctx.student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const db = createDirectAdminClient();
    const body = await request.json().catch(() => ({}));
    if (body.action === "update_contact") {
      await (db as any)
        .from("students")
        .update({
          phone: String(body.phone || "").trim(),
          address: String(body.address || "").trim(),
        })
        .eq("school_id", ctx.schoolId)
        .eq("id", ctx.student.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Use /api/student/portal for tenant-scoped actions." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
