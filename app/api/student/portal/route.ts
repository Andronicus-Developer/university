import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  isMissingTableError,
  resolveStudentRequestContext,
  safeStudentQuery,
  type StudentResolvedContext,
} from "@/lib/student/student-context";
import type { PortalSchoolType } from "@/config/schoolPortalConfig";

const SECTION_ALLOWED_TYPES: Record<string, PortalSchoolType[] | "all"> = {
  header: "all",
  dashboard: "all",
  fees: "all",
  profile: "all",
  announcements: "all",
  notifications: "all",
  timetable: ["university", "high_school"],
  registration: ["university"],
  enrolments: ["university"],
  results: ["university"],
  hostel: ["university"],
  subjects: ["high_school"],
  assignments: ["high_school"],
  attendance: ["high_school"],
  "report-card": ["high_school"],
  modules: ["vocational"],
  logbook: ["vocational"],
  competencies: ["vocational"],
  attachments: ["vocational"],
  certifications: ["vocational"],
};

const ACTION_ALLOWED_TYPES: Record<string, PortalSchoolType[] | "all"> = {
  register_course: ["university"],
  drop_course: ["university"],
  request_hostel: ["university"],
  cancel_hostel_request: ["university"],
  submit_assignment: ["high_school"],
  create_logbook_entry: ["vocational"],
  delete_logbook_entry: ["vocational"],
  submit_attachment_report: ["vocational"],
  update_profile_contact: "all",
  mark_notifications_read: "all",
};

function staffDisplayName(sp: any): string {
  if (!sp) return "Assigned Faculty";
  return (
    `${sp.first_name || ""} ${sp.last_name || ""}`.trim() ||
    sp.email ||
    "Assigned Faculty"
  );
}

function buildStaffMap(rows: any[] | null): Map<string, any> {
  const map = new Map<string, any>();
  for (const sp of rows || []) {
    map.set(String(sp.id), {
      ...sp,
      full_name: staffDisplayName(sp),
    });
  }
  return map;
}

function baseEnvelope(ctx: StudentResolvedContext) {
  return {
    school: {
      id: ctx.schoolId,
      name: ctx.schoolName,
      abbr: ctx.schoolAbbr,
      logoUrl: ctx.schoolLogo,
      schoolType: ctx.schoolType,
      currency: ctx.currency,
      currencySymbol: ctx.currencySymbol,
      maxCredits: ctx.maxCredits,
    },
    activeYear: ctx.activeYear,
    activeTerm: ctx.activeTerm,
    student: ctx.student
      ? {
          id: ctx.student.id,
          profile_id: ctx.student.profile_id,
          student_number: ctx.student.student_number,
          full_name: ctx.student.full_name,
          email: ctx.student.email,
          phone: ctx.student.phone,
          address: ctx.student.address,
          emergency_contact_name: ctx.student.emergency_contact_name,
          emergency_contact_phone: ctx.student.emergency_contact_phone,
          current_level: ctx.student.current_level,
          gpa: Number(ctx.student.gpa ?? 0),
          cgpa: Number(ctx.student.cgpa ?? 0),
          status: ctx.student.status || "active",
          programme_id: ctx.student.programme_id || null,
          programme_name: ctx.programme?.name || null,
          programme_code: ctx.programme?.code || null,
          department_id: ctx.student.department_id || null,
          department_name: ctx.department?.name || null,
          intake_id: ctx.student.intake_id || null,
          intake_name: ctx.intake?.name || null,
          cohort_year: ctx.student.cohort_year || null,
          metadata: ctx.student.metadata || {},
        }
      : null,
  };
}

function computeGpaSummary(grades: any[], courseMap: Map<string, any>) {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const g of grades) {
    const course = courseMap.get(String(g.course_id));
    const credits = Number(course?.credits ?? 3);
    const gp = Number(g.grade_point ?? 0);
    totalPoints += gp * credits;
    totalCredits += credits;
  }
  const gpa =
    totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;
  return { gpa, totalCredits };
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(req);
    if (errorResponse) return errorResponse;

    const section = String(
      req.nextUrl.searchParams.get("section") || "dashboard"
    )
      .trim()
      .toLowerCase();

    const allowedTypes = SECTION_ALLOWED_TYPES[section];
    if (!allowedTypes) {
      return NextResponse.json(
        { error: `Unknown student portal section: ${section}` },
        { status: 400 }
      );
    }

    if (
      allowedTypes !== "all" &&
      !ctx.isSuperAdmin &&
      !allowedTypes.includes(ctx.schoolType)
    ) {
      return NextResponse.json(
        {
          error: `Section "${section}" is not available for a ${ctx.schoolType.replace("_", " ")} portal.`,
          forbidden_school_type: true,
        },
        { status: 403 }
      );
    }

    const db = createDirectAdminClient();
    const schoolId = ctx.schoolId;
    const studentId = ctx.student?.id ? String(ctx.student.id) : null;
    const base = baseEnvelope(ctx);

    if (section === "header") {
      return NextResponse.json(base, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (!studentId) {
      return NextResponse.json(
        {
          ...base,
          unlinkedStudent: true,
          message:
            "No student/trainee enrolment profile is linked to this login inside this school.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // SHARED FEES SECTION (ALL 3 SCHOOL TYPES)
    // ----------------------------------------------------------------------
    if (section === "fees") {
      const [feeStructsRes, invoicesRes, paymentsRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("fee_structures")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .order("name", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("invoices")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("payments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
      ]);

      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const allStructures = feeStructsRes.data || [];
      const applicableStructures = allStructures.filter(
        (fs: any) =>
          (!fs.programme_id ||
            String(fs.programme_id) === String(ctx.student.programme_id || "")) &&
          (!fs.department_id ||
            String(fs.department_id) === String(ctx.student.department_id || ""))
      );

      const totalInvoiced = invoices.reduce(
        (sum: number, i: any) => sum + Number(i.total_amount ?? 0),
        0
      );
      const totalPaid =
        payments.length > 0
          ? payments
              .filter(
                (p: any) =>
                  !p.status ||
                  ["completed", "successful", "success", "paid"].includes(
                    String(p.status).toLowerCase()
                  )
              )
              .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)
          : invoices.reduce(
              (sum: number, i: any) => sum + Number(i.paid_amount ?? 0),
              0
            );
      const balanceDue = Math.max(0, totalInvoiced - totalPaid);

      return NextResponse.json(
        {
          ...base,
          summary: {
            totalInvoiced,
            totalPaid,
            balanceDue,
          },
          feeStructures: applicableStructures,
          invoices,
          payments,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // SHARED PROFILE SECTION (ALL 3 SCHOOL TYPES)
    // ----------------------------------------------------------------------
    if (section === "profile") {
      const [directGuardiansRes, joinGuardiansRes, hostelAllocRes, intakeListRes] =
        await Promise.all([
          safeStudentQuery<any[]>(
            (db as any)
              .from("parent_guardians")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("parent_guardian_students")
              .select("parent_guardian:parent_guardian_id(*)")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          ctx.schoolType === "university"
            ? safeStudentQuery<any[]>(
                (db as any)
                  .from("hostel_allocations")
                  .select("*, hostel:hostel_id(name, code)")
                  .eq("school_id", schoolId)
                  .eq("student_id", studentId)
                  .order("allocated_at", { ascending: false })
                  .limit(1)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          safeStudentQuery<any[]>(
            (db as any)
              .from("vocational_intakes")
              .select("*")
              .eq("school_id", schoolId)
          ),
        ]);

      const guardiansById = new Map<string, any>();
      for (const g of directGuardiansRes.data || []) {
        if (g?.id) guardiansById.set(String(g.id), g);
      }
      for (const row of joinGuardiansRes.data || []) {
        const g = row?.parent_guardian;
        if (g?.id) guardiansById.set(String(g.id), g);
      }

      return NextResponse.json(
        {
          ...base,
          guardians: Array.from(guardiansById.values()),
          hostelAllocation:
            Array.isArray(hostelAllocRes.data) && hostelAllocRes.data[0]
              ? hostelAllocRes.data[0]
              : null,
          intakes: intakeListRes.data || [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // UNIVERSITY SECTIONS
    // ----------------------------------------------------------------------
    if (section === "dashboard" && ctx.schoolType === "university") {
      const [coursesRes, enrolsRes, gradesRes, timetableRes, invoicesRes, paymentsRes, hostelRes] =
        await Promise.all([
          safeStudentQuery<any[]>(
            (db as any)
              .from("courses")
              .select("*")
              .eq("school_id", schoolId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("course_enrolments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("exam_grades")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("timetable_entries")
              .select("*")
              .eq("school_id", schoolId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("invoices")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("payments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("hostel_allocations")
              .select("*, hostel:hostel_id(name, code, warden_name)")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
              .limit(1)
          ),
        ]);

      const courses = coursesRes.data || [];
      const courseMap = new Map(courses.map((c: any) => [String(c.id), c]));
      const activeEnrolments = (enrolsRes.data || []).filter(
        (e: any) => e.status === "registered" || e.enrolment_status === "enrolled"
      );
      const registeredCourseIds = new Set(
        activeEnrolments.map((e: any) => String(e.course_id))
      );
      const registeredCredits = activeEnrolments.reduce(
        (sum: number, e: any) =>
          sum + Number(courseMap.get(String(e.course_id))?.credits ?? 3),
        0
      );

      const grades = gradesRes.data || [];
      const publishedGrades = grades.filter((g: any) => g.status === "published");
      const gpaSource = publishedGrades.length > 0 ? publishedGrades : grades;
      const { gpa: liveGpa } = computeGpaSummary(gpaSource, courseMap);
      const displayCgpa =
        Number(ctx.student.cgpa) > 0
          ? Number(ctx.student.cgpa)
          : liveGpa > 0
          ? liveGpa
          : Number(ctx.student.gpa ?? 0);

      const totalInvoiced = (invoicesRes.data || []).reduce(
        (s: number, i: any) => s + Number(i.total_amount ?? 0),
        0
      );
      const totalPaid =
        (paymentsRes.data || []).length > 0
          ? (paymentsRes.data || []).reduce(
              (s: number, p: any) => s + Number(p.amount ?? 0),
              0
            )
          : (invoicesRes.data || []).reduce(
              (s: number, i: any) => s + Number(i.paid_amount ?? 0),
              0
            );
      const feeBalance = Math.max(0, totalInvoiced - totalPaid);

      const mySchedule = (timetableRes.data || [])
        .filter((t: any) => registeredCourseIds.has(String(t.course_id)))
        .map((t: any) => ({
          ...t,
          course: courseMap.get(String(t.course_id)) || null,
        }));

      const myCourses = activeEnrolments.map((e: any) => ({
        ...e,
        course: courseMap.get(String(e.course_id)) || null,
      }));

      return NextResponse.json(
        {
          ...base,
          kpis: {
            registeredCredits,
            maxCredits: ctx.maxCredits,
            registeredCoursesCount: activeEnrolments.length,
            cgpa: displayCgpa,
            feeBalance,
            scheduleCount: mySchedule.length,
          },
          courses: myCourses.slice(0, 6),
          schedule: mySchedule.slice(0, 6),
          recentGrades: grades.slice(0, 5).map((g: any) => ({
            ...g,
            course: courseMap.get(String(g.course_id)) || null,
          })),
          hostelAllocation: (hostelRes.data || [])[0] || null,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "registration") {
      const [coursesRes, enrolsRes, deptsRes, progsRes, staffRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("courses")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .order("code", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("course_enrolments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any).from("departments").select("id, name, code").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any).from("programmes").select("id, name, code").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name, email, designation")
            .eq("school_id", schoolId)
        ),
      ]);

      const deptMap = new Map((deptsRes.data || []).map((d: any) => [String(d.id), d]));
      const progMap = new Map((progsRes.data || []).map((p: any) => [String(p.id), p]));
      const staffMap = buildStaffMap(staffRes.data);

      const courses = (coursesRes.data || []).map((c: any) => ({
        ...c,
        department_name: c.department_id ? deptMap.get(String(c.department_id))?.name || "" : "",
        programme_name: c.programme_id ? progMap.get(String(c.programme_id))?.name || "" : "",
        lecturer_name: c.lecturer_id ? staffMap.get(String(c.lecturer_id))?.full_name || "" : "",
      }));
      const courseMap = new Map(courses.map((c: any) => [String(c.id), c]));

      const enrolments = (enrolsRes.data || [])
        .filter((e: any) => e.status !== "dropped" && e.status !== "withdrawn")
        .map((e: any) => ({
          ...e,
          course: courseMap.get(String(e.course_id)) || null,
        }));

      const registeredCredits = enrolments.reduce(
        (s: number, e: any) => s + Number(e.course?.credits ?? 3),
        0
      );

      return NextResponse.json(
        {
          ...base,
          enrolments,
          courses,
          registeredCredits,
          maxCredits: ctx.maxCredits,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "enrolments") {
      const [coursesRes, enrolsRes, materialsRes, staffRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any).from("courses").select("*").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("course_enrolments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("course_materials")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name, email, designation")
            .eq("school_id", schoolId)
        ),
      ]);

      const staffMap = buildStaffMap(staffRes.data);
      const courseMap = new Map(
        (coursesRes.data || []).map((c: any) => [
          String(c.id),
          {
            ...c,
            lecturer_name: c.lecturer_id ? staffMap.get(String(c.lecturer_id))?.full_name || "" : "",
            lecturer_email: c.lecturer_id ? staffMap.get(String(c.lecturer_id))?.email || "" : "",
          },
        ])
      );

      const registeredCourses = (enrolsRes.data || [])
        .filter((e: any) => e.status === "registered" || e.status === "completed")
        .map((e: any) => ({
          ...e,
          course: courseMap.get(String(e.course_id)) || null,
        }))
        .filter((e: any) => e.course);

      const registeredIds = new Set(
        registeredCourses.map((e: any) => String(e.course_id))
      );
      const materials = (materialsRes.data || []).filter((m: any) =>
        registeredIds.has(String(m.course_id))
      );

      return NextResponse.json(
        {
          ...base,
          registeredCourses,
          materials,
          materialsTableMissing: materialsRes.missing,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "results") {
      const [coursesRes, gradesRes, termsRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any).from("courses").select("*").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("exam_grades")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("terms")
            .select("id, name, code, term_number")
            .eq("school_id", schoolId)
            .order("term_number", { ascending: true })
        ),
      ]);

      const courseMap = new Map(
        (coursesRes.data || []).map((c: any) => [String(c.id), c])
      );
      const termMap = new Map(
        (termsRes.data || []).map((t: any) => [String(t.id), t])
      );

      const grades = (gradesRes.data || []).map((g: any) => ({
        ...g,
        course: courseMap.get(String(g.course_id)) || null,
        term: g.term_id ? termMap.get(String(g.term_id)) || null : null,
      }));

      const publishedOnly = grades.filter((g: any) => g.status === "published");
      const { gpa: cumulativeGpa, totalCredits } = computeGpaSummary(
        publishedOnly.length > 0 ? publishedOnly : grades,
        courseMap
      );

      return NextResponse.json(
        {
          ...base,
          grades,
          terms: termsRes.data || [],
          summary: {
            cumulativeGpa:
              cumulativeGpa > 0 ? cumulativeGpa : Number(ctx.student.cgpa ?? 0),
            totalCreditsEvaluated: totalCredits,
            publishedCount: publishedOnly.length,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "hostel") {
      const [allocRes, hostelsRes, requestsRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("hostel_allocations")
            .select("*, hostel:hostel_id(*)")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("allocated_at", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("hostels")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .order("name", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("hostel_requests")
            .select("*, hostel:hostel_id(name, code)")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
      ]);

      return NextResponse.json(
        {
          ...base,
          allocation: (allocRes.data || [])[0] || null,
          hostels: hostelsRes.data || [],
          requests: requestsRes.data || [],
          requestsTableMissing: requestsRes.missing,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // TIMETABLE SECTION (UNIVERSITY LECTURE/EXAM OR HIGH SCHOOL CLASS SCHEDULE)
    // ----------------------------------------------------------------------
    if (section === "timetable") {
      const [entriesRes, coursesRes, enrolsRes, subjectsRes, staffRes] =
        await Promise.all([
          safeStudentQuery<any[]>(
            (db as any)
              .from("timetable_entries")
              .select("*")
              .eq("school_id", schoolId)
              .order("start_time", { ascending: true })
          ),
          ctx.schoolType === "university"
            ? safeStudentQuery<any[]>(
                (db as any).from("courses").select("*").eq("school_id", schoolId)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          ctx.schoolType === "university"
            ? safeStudentQuery<any[]>(
                (db as any)
                  .from("course_enrolments")
                  .select("*")
                  .eq("school_id", schoolId)
                  .eq("student_id", studentId)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          ctx.schoolType === "high_school"
            ? safeStudentQuery<any[]>(
                (db as any).from("subjects").select("*").eq("school_id", schoolId)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          safeStudentQuery<any[]>(
            (db as any)
              .from("staff_profiles")
              .select("id, first_name, last_name, email")
              .eq("school_id", schoolId)
          ),
        ]);

      const staffMap = buildStaffMap(staffRes.data);
      const courseMap = new Map(
        (coursesRes.data || []).map((c: any) => [String(c.id), c])
      );
      const subjectMap = new Map(
        (subjectsRes.data || []).map((s: any) => [String(s.id), s])
      );

      const registeredCourseIds = new Set(
        (enrolsRes.data || [])
          .filter((e: any) => e.status !== "dropped" && e.status !== "withdrawn")
          .map((e: any) => String(e.course_id))
      );

      const allEntries = (entriesRes.data || []).map((entry: any) => ({
        ...entry,
        course: entry.course_id ? courseMap.get(String(entry.course_id)) || null : null,
        subject: entry.subject_id
          ? subjectMap.get(String(entry.subject_id)) || null
          : null,
        teacher_name: entry.teacher_id
          ? staffMap.get(String(entry.teacher_id))?.full_name || ""
          : "",
      }));

      const filtered =
        ctx.schoolType === "university"
          ? allEntries.filter(
              (entry: any) =>
                (entry.course_id && registeredCourseIds.has(String(entry.course_id))) ||
                (ctx.student.programme_id &&
                  !entry.course_id &&
                  String(entry.programme_id) === String(ctx.student.programme_id))
            )
          : allEntries.filter(
              (entry: any) =>
                !entry.programme_id ||
                !ctx.student.programme_id ||
                String(entry.programme_id) === String(ctx.student.programme_id)
            );

      return NextResponse.json(
        {
          ...base,
          entries: filtered,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // HIGH SCHOOL SECTIONS
    // ----------------------------------------------------------------------
    if (section === "dashboard" && ctx.schoolType === "high_school") {
      const [subjectsRes, attRecordsRes, conductRes, scoresRes, assignRes, subsRes, invoicesRes, paymentsRes] =
        await Promise.all([
          safeStudentQuery<any[]>(
            (db as any).from("subjects").select("*").eq("school_id", schoolId).eq("is_active", true)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("attendance_records")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("student_conduct_records")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
              .order("incident_date", { ascending: false })
              .limit(4)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("report_card_scores")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("assignments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("status", "published")
              .order("due_date", { ascending: true })
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("assignment_submissions")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("invoices").select("*").eq("school_id", schoolId).eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("payments").select("*").eq("school_id", schoolId).eq("student_id", studentId)
          ),
        ]);

      const mySubjects = (subjectsRes.data || []).filter(
        (s: any) =>
          !s.programme_id ||
          !ctx.student.programme_id ||
          String(s.programme_id) === String(ctx.student.programme_id)
      );

      const att = attRecordsRes.data || [];
      const attended = att.filter(
        (r: any) => r.status === "present" || r.status === "late"
      ).length;
      const attendanceRate =
        att.length > 0 ? Math.round((attended / att.length) * 100) : 100;

      const scores = scoresRes.data || [];
      const termAverage =
        scores.length > 0
          ? Number(
              (
                scores.reduce((sum: number, s: any) => sum + Number(s.total_score ?? 0), 0) /
                scores.length
              ).toFixed(1)
            )
          : 0;

      const totalInvoiced = (invoicesRes.data || []).reduce(
        (s: number, i: any) => s + Number(i.total_amount ?? 0),
        0
      );
      const totalPaid =
        (paymentsRes.data || []).length > 0
          ? (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
          : (invoicesRes.data || []).reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0);
      const feeBalance = Math.max(0, totalInvoiced - totalPaid);

      const submittedIds = new Set(
        (subsRes.data || []).map((s: any) => String(s.assignment_id))
      );
      const classAssignments = (assignRes.data || []).filter(
        (a: any) =>
          !a.programme_id ||
          !ctx.student.programme_id ||
          String(a.programme_id) === String(ctx.student.programme_id)
      );

      return NextResponse.json(
        {
          ...base,
          kpis: {
            classLabel: `${ctx.programme?.name || "Assigned Class"}${
              ctx.student.metadata?.stream ? ` (${ctx.student.metadata.stream})` : ""
            }`,
            attendanceRate,
            termAverage,
            subjectsCount: mySubjects.length,
            feeBalance,
            pendingAssignmentsCount: classAssignments.filter(
              (a: any) => !submittedIds.has(String(a.id))
            ).length,
          },
          subjects: mySubjects.slice(0, 6),
          upcomingAssignments: classAssignments.slice(0, 5),
          recentConduct: conductRes.data || [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "subjects") {
      const [subjectsRes, staffRes, termsRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("subjects")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .order("name", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name, email, designation")
            .eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any).from("terms").select("id, name, code").eq("school_id", schoolId)
        ),
      ]);

      const staffMap = buildStaffMap(staffRes.data);
      const termMap = new Map((termsRes.data || []).map((t: any) => [String(t.id), t]));

      const subjects = (subjectsRes.data || [])
        .filter(
          (s: any) =>
            !s.programme_id ||
            !ctx.student.programme_id ||
            String(s.programme_id) === String(ctx.student.programme_id)
        )
        .map((s: any) => ({
          ...s,
          teacher_name: s.teacher_id
            ? staffMap.get(String(s.teacher_id))?.full_name || ""
            : "",
          teacher_email: s.teacher_id
            ? staffMap.get(String(s.teacher_id))?.email || ""
            : "",
          term_name: s.term_id ? termMap.get(String(s.term_id))?.name || "" : "",
        }));

      return NextResponse.json(
        { ...base, subjects },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "assignments") {
      const [assignRes, subsRes, subjectsRes, staffRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("assignments")
            .select("*")
            .eq("school_id", schoolId)
            .neq("status", "draft")
            .order("due_date", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("assignment_submissions")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any).from("subjects").select("id, code, name").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name, email")
            .eq("school_id", schoolId)
        ),
      ]);

      const subjectMap = new Map(
        (subjectsRes.data || []).map((s: any) => [String(s.id), s])
      );
      const staffMap = buildStaffMap(staffRes.data);
      const subMap = new Map(
        (subsRes.data || []).map((s: any) => [String(s.assignment_id), s])
      );

      const assignments = (assignRes.data || [])
        .filter(
          (a: any) =>
            !a.programme_id ||
            !ctx.student.programme_id ||
            String(a.programme_id) === String(ctx.student.programme_id)
        )
        .map((a: any) => ({
          ...a,
          subject: a.subject_id ? subjectMap.get(String(a.subject_id)) || null : null,
          teacher_name: a.teacher_id
            ? staffMap.get(String(a.teacher_id))?.full_name || ""
            : "",
          submission: subMap.get(String(a.id)) || null,
        }));

      return NextResponse.json(
        {
          ...base,
          assignments,
          tableMissing: assignRes.missing || subsRes.missing,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "attendance") {
      const [recordsRes, sessionsRes, conductRes, termsRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("attendance_records")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("recorded_at", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("attendance_sessions")
            .select("*")
            .eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("student_conduct_records")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("incident_date", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any).from("terms").select("id, name, code").eq("school_id", schoolId)
        ),
      ]);

      const sessionMap = new Map(
        (sessionsRes.data || []).map((s: any) => [String(s.id), s])
      );
      const termMap = new Map((termsRes.data || []).map((t: any) => [String(t.id), t]));

      const records = (recordsRes.data || []).map((r: any) => ({
        ...r,
        session: r.session_id ? sessionMap.get(String(r.session_id)) || null : null,
      }));
      const conduct = (conductRes.data || []).map((c: any) => ({
        ...c,
        term_name: c.term_id ? termMap.get(String(c.term_id))?.name || "" : "",
      }));

      return NextResponse.json(
        { ...base, records, conduct },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "report-card") {
      const [scoresRes, subjectsRes, termsRes, conductRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("report_card_scores")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
        ),
        safeStudentQuery<any[]>(
          (db as any).from("subjects").select("id, code, name").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("terms")
            .select("id, name, code, term_number")
            .eq("school_id", schoolId)
            .order("term_number", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("student_conduct_records")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("incident_date", { ascending: false })
        ),
      ]);

      const subjectMap = new Map(
        (subjectsRes.data || []).map((s: any) => [String(s.id), s])
      );
      const termMap = new Map((termsRes.data || []).map((t: any) => [String(t.id), t]));

      const scores = (scoresRes.data || []).map((sc: any) => ({
        ...sc,
        subject: sc.subject_id ? subjectMap.get(String(sc.subject_id)) || null : null,
        term: sc.term_id ? termMap.get(String(sc.term_id)) || null : null,
      }));

      // Calculate anonymized class position strictly server-side without exposing peers
      let classPosition: number | null = null;
      let classTotalStudents = 0;
      const targetTermId =
        scores[0]?.term_id || ctx.activeTerm?.id || null;
      if (ctx.student.programme_id) {
        let peerQuery = (db as any)
          .from("report_card_scores")
          .select("student_id, total_score")
          .eq("school_id", schoolId)
          .eq("programme_id", ctx.student.programme_id);
        if (targetTermId) {
          peerQuery = peerQuery.eq("term_id", targetTermId);
        }
        const { data: peerScores } = await safeStudentQuery<any[]>(peerQuery);
        if (Array.isArray(peerScores) && peerScores.length > 0) {
          const totalsByStudent = new Map<string, { sum: number; count: number }>();
          for (const ps of peerScores) {
            const sid = String(ps.student_id);
            const cur = totalsByStudent.get(sid) || { sum: 0, count: 0 };
            cur.sum += Number(ps.total_score ?? 0);
            cur.count += 1;
            totalsByStudent.set(sid, cur);
          }
          const sortedAverages = Array.from(totalsByStudent.entries())
            .map(([sid, val]) => ({
              sid,
              avg: val.count > 0 ? val.sum / val.count : 0,
            }))
            .sort((a, b) => b.avg - a.avg);
          classTotalStudents = sortedAverages.length;
          const idx = sortedAverages.findIndex((item) => item.sid === studentId);
          if (idx >= 0) {
            classPosition = idx + 1;
          }
        }
      }

      return NextResponse.json(
        {
          ...base,
          scores,
          terms: termsRes.data || [],
          conduct: conductRes.data || [],
          classPosition,
          classTotalStudents,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // VOCATIONAL TRAINEE SECTIONS
    // ----------------------------------------------------------------------
    if (section === "dashboard" && ctx.schoolType === "vocational") {
      const [modulesRes, compRes, logsRes, attachRes, certsRes, invoicesRes, paymentsRes] =
        await Promise.all([
          safeStudentQuery<any[]>(
            (db as any)
              .from("vocational_modules")
              .select("*")
              .eq("school_id", schoolId)
              .eq("is_active", true)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("competency_assessments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("practical_logbooks")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
              .order("log_date", { ascending: false })
              .limit(5)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("industrial_attachments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
              .limit(1)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("trade_certifications")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("invoices").select("*").eq("school_id", schoolId).eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("payments").select("*").eq("school_id", schoolId).eq("student_id", studentId)
          ),
        ]);

      const tradeModules = (modulesRes.data || []).filter(
        (m: any) =>
          !m.department_id ||
          !ctx.student.department_id ||
          String(m.department_id) === String(ctx.student.department_id)
      );
      const assessments = compRes.data || [];
      const competentCount = assessments.filter(
        (c: any) => c.verdict === "competent"
      ).length;
      const progressPct =
        tradeModules.length > 0
          ? Math.min(100, Math.round((competentCount / tradeModules.length) * 100))
          : 0;

      const totalInvoiced = (invoicesRes.data || []).reduce(
        (s: number, i: any) => s + Number(i.total_amount ?? 0),
        0
      );
      const totalPaid =
        (paymentsRes.data || []).length > 0
          ? (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
          : (invoicesRes.data || []).reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0);
      const feeBalance = Math.max(0, totalInvoiced - totalPaid);

      return NextResponse.json(
        {
          ...base,
          kpis: {
            tradeLabel: ctx.department?.name || "Assigned Trade",
            intakeLabel: ctx.intake?.name || "Active Cohort",
            totalModules: tradeModules.length,
            competentModules: competentCount,
            progressPct,
            feeBalance,
            certificationsCount: (certsRes.data || []).filter(
              (c: any) => c.status === "issued"
            ).length,
          },
          modules: tradeModules.slice(0, 6),
          recentLogs: logsRes.data || [],
          attachment: (attachRes.data || [])[0] || null,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "modules") {
      const [modulesRes, scheduleRes, staffRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("vocational_modules")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .order("code", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("timetable_entries")
            .select("*")
            .eq("school_id", schoolId)
            .order("start_time", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name, email, designation")
            .eq("school_id", schoolId)
        ),
      ]);

      const staffMap = buildStaffMap(staffRes.data);
      const modules = (modulesRes.data || [])
        .filter(
          (m: any) =>
            !m.department_id ||
            !ctx.student.department_id ||
            String(m.department_id) === String(ctx.student.department_id)
        )
        .map((m: any) => ({
          ...m,
          instructor_name: m.instructor_id
            ? staffMap.get(String(m.instructor_id))?.full_name || ""
            : "",
          instructor_email: m.instructor_id
            ? staffMap.get(String(m.instructor_id))?.email || ""
            : "",
        }));

      const modIds = new Set(modules.map((m: any) => String(m.id)));
      const workshopSchedule = (scheduleRes.data || []).filter(
        (t: any) =>
          (t.module_id && modIds.has(String(t.module_id))) ||
          t.entry_type === "workshop"
      );

      return NextResponse.json(
        {
          ...base,
          modules,
          workshopSchedule,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "logbook") {
      const [logsRes, modulesRes, staffRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("practical_logbooks")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("log_date", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("vocational_modules")
            .select("*")
            .eq("school_id", schoolId)
            .eq("is_active", true)
            .order("code", { ascending: true })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name")
            .eq("school_id", schoolId)
        ),
      ]);

      const modMap = new Map(
        (modulesRes.data || []).map((m: any) => [String(m.id), m])
      );
      const staffMap = buildStaffMap(staffRes.data);

      const logs = (logsRes.data || []).map((l: any) => ({
        ...l,
        module: l.module_id ? modMap.get(String(l.module_id)) || null : null,
        signed_off_by_name: l.signed_off_by
          ? staffMap.get(String(l.signed_off_by))?.full_name || ""
          : "",
      }));

      const availableModules = (modulesRes.data || []).filter(
        (m: any) =>
          !m.department_id ||
          !ctx.student.department_id ||
          String(m.department_id) === String(ctx.student.department_id)
      );

      return NextResponse.json(
        {
          ...base,
          logs,
          modules: availableModules,
          tableMissing: logsRes.missing,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "competencies") {
      const [compRes, modulesRes, staffRes, intakesRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("competency_assessments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("assessment_date", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any).from("vocational_modules").select("*").eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("staff_profiles")
            .select("id, first_name, last_name")
            .eq("school_id", schoolId)
        ),
        safeStudentQuery<any[]>(
          (db as any).from("vocational_intakes").select("id, name, code").eq("school_id", schoolId)
        ),
      ]);

      const modMap = new Map(
        (modulesRes.data || []).map((m: any) => [String(m.id), m])
      );
      const staffMap = buildStaffMap(staffRes.data);
      const intakeMap = new Map(
        (intakesRes.data || []).map((i: any) => [String(i.id), i])
      );

      const assessments = (compRes.data || []).map((a: any) => ({
        ...a,
        module: a.module_id ? modMap.get(String(a.module_id)) || null : null,
        assessor_name: a.instructor_id
          ? staffMap.get(String(a.instructor_id))?.full_name || ""
          : "",
        intake_name: a.intake_id
          ? intakeMap.get(String(a.intake_id))?.name || ""
          : "",
      }));

      return NextResponse.json(
        {
          ...base,
          assessments,
          totalTradeModules: (modulesRes.data || []).filter(
            (m: any) =>
              !m.department_id ||
              !ctx.student.department_id ||
              String(m.department_id) === String(ctx.student.department_id)
          ).length,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "attachments") {
      const [attachRes, reportsRes] = await Promise.all([
        safeStudentQuery<any[]>(
          (db as any)
            .from("industrial_attachments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
        safeStudentQuery<any[]>(
          (db as any)
            .from("attachment_reports")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("week_number", { ascending: false })
        ),
      ]);

      return NextResponse.json(
        {
          ...base,
          attachments: attachRes.data || [],
          reports: reportsRes.data || [],
          reportsTableMissing: reportsRes.missing,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "certifications") {
      const [certsRes, compRes, logsRes, attachRes, invoicesRes, paymentsRes, modulesRes, deptsRes, intakesRes] =
        await Promise.all([
          safeStudentQuery<any[]>(
            (db as any)
              .from("trade_certifications")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
              .order("issue_date", { ascending: false })
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("competency_assessments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("practical_logbooks")
              .select("hours_spent, status")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any)
              .from("industrial_attachments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("invoices").select("total_amount, paid_amount").eq("school_id", schoolId).eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("payments").select("amount").eq("school_id", schoolId).eq("student_id", studentId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("vocational_modules").select("id, department_id").eq("school_id", schoolId).eq("is_active", true)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("departments").select("id, name").eq("school_id", schoolId)
          ),
          safeStudentQuery<any[]>(
            (db as any).from("vocational_intakes").select("id, name").eq("school_id", schoolId)
          ),
        ]);

      const deptMap = new Map((deptsRes.data || []).map((d: any) => [String(d.id), d]));
      const intakeMap = new Map((intakesRes.data || []).map((i: any) => [String(i.id), i]));

      const tradeModules = (modulesRes.data || []).filter(
        (m: any) =>
          !m.department_id ||
          !ctx.student.department_id ||
          String(m.department_id) === String(ctx.student.department_id)
      );
      const competentModules = (compRes.data || []).filter(
        (c: any) => c.verdict === "competent"
      ).length;
      const loggedHours = (logsRes.data || []).reduce(
        (s: number, l: any) => s + Number(l.hours_spent ?? 0),
        0
      );
      const attachmentCompleted = (attachRes.data || []).some(
        (a: any) => a.status === "completed" || a.status === "placed"
      );

      const totalInvoiced = (invoicesRes.data || []).reduce(
        (s: number, i: any) => s + Number(i.total_amount ?? 0),
        0
      );
      const totalPaid =
        (paymentsRes.data || []).length > 0
          ? (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0)
          : (invoicesRes.data || []).reduce((s: number, i: any) => s + Number(i.paid_amount ?? 0), 0);

      const certifications = (certsRes.data || []).map((cert: any) => ({
        ...cert,
        trade_name: cert.department_id
          ? deptMap.get(String(cert.department_id))?.name || ""
          : ctx.department?.name || "",
        intake_name: cert.intake_id
          ? intakeMap.get(String(cert.intake_id))?.name || ""
          : ctx.intake?.name || "",
      }));

      return NextResponse.json(
        {
          ...base,
          certifications,
          readiness: {
            competentModules,
            requiredModules: tradeModules.length,
            loggedHours,
            attachmentCompleted,
            feesCleared: totalInvoiced - totalPaid <= 0,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "announcements") {
      const annRes = await safeStudentQuery<any[]>(
        (db as any)
          .from("school_events")
          .select("id, title, description, event_type, start_date, end_date")
          .eq("school_id", schoolId)
          .order("start_date", { ascending: false })
          .limit(30)
      );
      return NextResponse.json(
        {
          ...base,
          announcements: annRes.data || [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (section === "notifications") {
      const notifRes = await safeStudentQuery<any[]>(
        (db as any)
          .from("user_notifications")
          .select("*")
          .eq("school_id", schoolId)
          .eq("user_id", ctx.userId)
          .order("created_at", { ascending: false })
          .limit(50)
      );
      return NextResponse.json(
        {
          ...base,
          notifications: notifRes.data || [],
          missingTables: notifRes.missing ? ["user_notifications"] : [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(base);
  } catch (err: any) {
    console.error("GET /api/student/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load student portal data." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(req);
    if (errorResponse) return errorResponse;

    if (!ctx.student?.id) {
      return NextResponse.json(
        { error: "No student record linked to your account." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const allowedTypes = ACTION_ALLOWED_TYPES[action];

    if (!allowedTypes) {
      return NextResponse.json(
        { error: `Unsupported action: ${action}` },
        { status: 400 }
      );
    }

    if (
      allowedTypes !== "all" &&
      !ctx.isSuperAdmin &&
      !allowedTypes.includes(ctx.schoolType)
    ) {
      return NextResponse.json(
        { error: `Action "${action}" is restricted to ${allowedTypes.join(", ")} portals.` },
        { status: 403 }
      );
    }

    const db = createDirectAdminClient();
    const schoolId = ctx.schoolId;
    const studentId = String(ctx.student.id);

    // ----------------------------------------------------------------------
    // UNIVERSITY: REGISTER COURSE
    // ----------------------------------------------------------------------
    if (action === "register_course") {
      const courseId = String(body.courseId || "").trim();
      if (!courseId) {
        return NextResponse.json({ error: "courseId is required." }, { status: 400 });
      }

      const { data: targetCourse } = await (db as any)
        .from("courses")
        .select("*")
        .eq("school_id", schoolId)
        .eq("id", courseId)
        .maybeSingle();

      if (!targetCourse) {
        return NextResponse.json(
          { error: "Course not found in your institution." },
          { status: 404 }
        );
      }

      const { data: existingEnrols } = await (db as any)
        .from("course_enrolments")
        .select("id, course_id, status")
        .eq("school_id", schoolId)
        .eq("student_id", studentId);

      const activeEnrols = (existingEnrols || []).filter(
        (e: any) => e.status === "registered" || e.status === "completed"
      );

      if (activeEnrols.some((e: any) => String(e.course_id) === courseId)) {
        return NextResponse.json(
          { error: `You are already registered for ${targetCourse.code}.` },
          { status: 400 }
        );
      }

      // Compute current registered credit total against school limit
      const activeIds = activeEnrols.map((e: any) => e.course_id).filter(Boolean);
      let currentCredits = 0;
      if (activeIds.length > 0) {
        const { data: activeCourseRows } = await (db as any)
          .from("courses")
          .select("id, credits")
          .eq("school_id", schoolId)
          .in("id", activeIds);
        currentCredits = (activeCourseRows || []).reduce(
          (sum: number, c: any) => sum + Number(c.credits ?? 3),
          0
        );
      }

      const nextCredits = currentCredits + Number(targetCourse.credits ?? 3);
      if (nextCredits > ctx.maxCredits) {
        return NextResponse.json(
          {
            error: `Credit limit exceeded (${nextCredits} / ${ctx.maxCredits} allowed credits). Drop a course first.`,
          },
          { status: 400 }
        );
      }

      const { data: inserted, error } = await (db as any)
        .from("course_enrolments")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          course_id: courseId,
          academic_year_id: ctx.activeYear?.id || null,
          term_id: ctx.activeTerm?.id || null,
          status: "registered",
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message || "Failed to register course." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Registered for ${targetCourse.code} — ${targetCourse.name}.`,
        enrolment: inserted,
      });
    }

    // ----------------------------------------------------------------------
    // UNIVERSITY: DROP COURSE
    // ----------------------------------------------------------------------
    if (action === "drop_course") {
      const enrolmentId = String(body.enrolmentId || "").trim();
      const courseId = String(body.courseId || "").trim();
      if (!enrolmentId && !courseId) {
        return NextResponse.json(
          { error: "enrolmentId or courseId is required." },
          { status: 400 }
        );
      }

      let delQ = (db as any)
        .from("course_enrolments")
        .delete()
        .eq("school_id", schoolId)
        .eq("student_id", studentId);

      if (enrolmentId) {
        delQ = delQ.eq("id", enrolmentId);
      } else {
        delQ = delQ.eq("course_id", courseId);
      }

      const { error } = await delQ;
      if (error) {
        return NextResponse.json(
          { error: error.message || "Failed to drop course." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Course dropped from your registration.",
      });
    }

    // ----------------------------------------------------------------------
    // UNIVERSITY: REQUEST HOSTEL ACCOMMODATION
    // ----------------------------------------------------------------------
    if (action === "request_hostel") {
      const hostelId = body.hostelId ? String(body.hostelId).trim() : null;
      const roomPreference = String(body.roomPreference || "").trim();
      const notes = String(body.notes || "").trim();

      if (hostelId) {
        const { data: h } = await (db as any)
          .from("hostels")
          .select("id")
          .eq("school_id", schoolId)
          .eq("id", hostelId)
          .maybeSingle();
        if (!h) {
          return NextResponse.json({ error: "Selected hostel not found." }, { status: 404 });
        }
      }

      const { data: created, error } = await (db as any)
        .from("hostel_requests")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          hostel_id: hostelId || null,
          academic_year_id: ctx.activeYear?.id || null,
          room_preference: roomPreference || "Standard Shared Room",
          notes,
          status: "pending",
        })
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json(
            {
              error:
                "Table `public.hostel_requests` missing. Run migration 20261124000006_student_portal_tables_and_rls.sql in Supabase.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Hostel accommodation request submitted for warden review.",
        request: created,
      });
    }

    if (action === "cancel_hostel_request") {
      const requestId = String(body.requestId || "").trim();
      if (!requestId) {
        return NextResponse.json({ error: "requestId is required." }, { status: 400 });
      }
      const { error } = await (db as any)
        .from("hostel_requests")
        .delete()
        .eq("id", requestId)
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .eq("status", "pending");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Pending accommodation request cancelled.",
      });
    }

    // ----------------------------------------------------------------------
    // HIGH SCHOOL: SUBMIT ASSIGNMENT / HOMEWORK
    // ----------------------------------------------------------------------
    if (action === "submit_assignment") {
      const assignmentId = String(body.assignmentId || "").trim();
      const responseText = String(body.responseText || "").trim();
      const submissionUrl = String(body.submissionUrl || "").trim();

      if (!assignmentId) {
        return NextResponse.json({ error: "assignmentId is required." }, { status: 400 });
      }
      if (!responseText && !submissionUrl) {
        return NextResponse.json(
          { error: "Please provide written answers or attach a homework link/file." },
          { status: 400 }
        );
      }

      const { data: assign } = await (db as any)
        .from("assignments")
        .select("id, title")
        .eq("school_id", schoolId)
        .eq("id", assignmentId)
        .maybeSingle();

      if (!assign) {
        return NextResponse.json(
          { error: "Assignment not found in your school." },
          { status: 404 }
        );
      }

      const { data: sub, error } = await (db as any)
        .from("assignment_submissions")
        .upsert(
          {
            school_id: schoolId,
            assignment_id: assignmentId,
            student_id: studentId,
            response_text: responseText,
            submission_url: submissionUrl || null,
            submitted_at: new Date().toISOString(),
            status: "submitted",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,student_id" }
        )
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json(
            {
              error:
                "Table `public.assignment_submissions` missing. Run migration 20261124000006_student_portal_tables_and_rls.sql in Supabase.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Submitted "${assign.title}" successfully.`,
        submission: sub,
      });
    }

    // ----------------------------------------------------------------------
    // VOCATIONAL: CREATE / DELETE PRACTICAL LOGBOOK ENTRY
    // ----------------------------------------------------------------------
    if (action === "create_logbook_entry") {
      const moduleId = String(body.moduleId || "").trim();
      const taskTitle = String(body.taskTitle || "").trim();
      const taskDescription = String(body.taskDescription || "").trim();
      const toolsUsed = String(body.toolsUsed || "").trim();
      const logDate =
        String(body.logDate || "").trim() || new Date().toISOString().slice(0, 10);
      const hoursSpent = Math.max(0.5, Number(body.hoursSpent || 2));
      const evidenceUrl = String(body.evidenceUrl || "").trim();

      if (!moduleId || !taskTitle || !taskDescription) {
        return NextResponse.json(
          { error: "Trade module, task title, and description are required." },
          { status: 400 }
        );
      }

      const { data: mod } = await (db as any)
        .from("vocational_modules")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("id", moduleId)
        .maybeSingle();

      if (!mod) {
        return NextResponse.json(
          { error: "Trade module not found for your school." },
          { status: 404 }
        );
      }

      const { data: entry, error } = await (db as any)
        .from("practical_logbooks")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          module_id: moduleId,
          intake_id: ctx.student.intake_id || null,
          log_date: logDate,
          task_title: taskTitle,
          task_description: taskDescription,
          tools_used: toolsUsed || null,
          hours_spent: hoursSpent,
          evidence_url: evidenceUrl || null,
          status: "submitted",
        })
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json(
            {
              error:
                "Table `public.practical_logbooks` missing. Run migration 20261124000006_student_portal_tables_and_rls.sql in Supabase.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Practical workshop log submitted for instructor sign-off.",
        entry,
      });
    }

    if (action === "delete_logbook_entry") {
      const entryId = String(body.entryId || "").trim();
      if (!entryId) {
        return NextResponse.json({ error: "entryId is required." }, { status: 400 });
      }
      const { error } = await (db as any)
        .from("practical_logbooks")
        .delete()
        .eq("id", entryId)
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .neq("status", "signed_off");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Practical logbook entry deleted.",
      });
    }

    // ----------------------------------------------------------------------
    // VOCATIONAL: SUBMIT WEEKLY INDUSTRIAL ATTACHMENT REPORT
    // ----------------------------------------------------------------------
    if (action === "submit_attachment_report") {
      const attachmentId = String(body.attachmentId || "").trim();
      const weekNumber = Math.max(1, Number.parseInt(String(body.weekNumber || "1"), 10) || 1);
      const reportDate =
        String(body.reportDate || "").trim() || new Date().toISOString().slice(0, 10);
      const activitiesSummary = String(body.activitiesSummary || "").trim();
      const skillsLearned = String(body.skillsLearned || "").trim();
      const challenges = String(body.challenges || "").trim();
      const hoursWorked = Math.max(1, Number(body.hoursWorked || 40));

      if (!attachmentId || !activitiesSummary) {
        return NextResponse.json(
          { error: "Placement selection and activities summary are required." },
          { status: 400 }
        );
      }

      const { data: placement } = await (db as any)
        .from("industrial_attachments")
        .select("id")
        .eq("school_id", schoolId)
        .eq("student_id", studentId)
        .eq("id", attachmentId)
        .maybeSingle();

      if (!placement) {
        return NextResponse.json(
          { error: "Industrial attachment placement not found." },
          { status: 404 }
        );
      }

      const { data: report, error } = await (db as any)
        .from("attachment_reports")
        .insert({
          school_id: schoolId,
          attachment_id: attachmentId,
          student_id: studentId,
          week_number: weekNumber,
          report_date: reportDate,
          activities_summary: activitiesSummary,
          skills_learned: skillsLearned || null,
          challenges: challenges || null,
          hours_worked: hoursWorked,
          status: "submitted",
        })
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json(
            {
              error:
                "Table `public.attachment_reports` missing. Run migration 20261124000006_student_portal_tables_and_rls.sql in Supabase.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Week ${weekNumber} attachment report submitted.`,
        report,
      });
    }

    // ----------------------------------------------------------------------
    // SHARED: UPDATE CONTACT & EMERGENCY DETAILS
    // ----------------------------------------------------------------------
    if (action === "update_profile_contact") {
      const phone = String(body.phone || "").trim();
      const address = String(body.address || "").trim();
      const emergencyContactName = String(body.emergencyContactName || "").trim();
      const emergencyContactPhone = String(body.emergencyContactPhone || "").trim();

      const nextMetadata = {
        ...(ctx.student.metadata && typeof ctx.student.metadata === "object"
          ? ctx.student.metadata
          : {}),
        phone,
        address,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
      };

      const { error: stuUpdateErr } = await (db as any)
        .from("students")
        .update({
          phone,
          address,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          metadata: nextMetadata,
        })
        .eq("school_id", schoolId)
        .eq("id", studentId);

      if (stuUpdateErr && isMissingTableError(stuUpdateErr)) {
        await (db as any)
          .from("students")
          .update({
            phone,
            metadata: nextMetadata,
          })
          .eq("school_id", schoolId)
          .eq("id", studentId);
      } else if (stuUpdateErr) {
        return NextResponse.json({ error: stuUpdateErr.message }, { status: 400 });
      }

      if (ctx.student.profile_id || ctx.userId) {
        await safeStudentQuery(
          (db as any)
            .from("profiles")
            .update({ phone })
            .eq("id", ctx.student.profile_id || ctx.userId)
        );
      }

      return NextResponse.json({
        success: true,
        message: "Contact and emergency details updated successfully.",
      });
    }

    if (action === "mark_notifications_read") {
      const { error: readErr } = await (db as any)
        .from("user_notifications")
        .update({ is_read: true })
        .eq("school_id", schoolId)
        .eq("user_id", ctx.userId)
        .eq("is_read", false);
      if (readErr && !isMissingTableError(readErr)) {
        return NextResponse.json({ error: readErr.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unhandled action." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/student/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save student portal action." },
      { status: 500 }
    );
  }
}
