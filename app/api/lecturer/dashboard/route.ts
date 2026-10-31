import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry, extractUserFromCookies } from "@/lib/supabase/fetch";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (input, init) => supabaseFetchWithRetry(input, init, 2, 8000),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// In-memory task state storage if dedicated lecturer_tasks table is not in schema
const memoryTasks: Record<string, { id: string; title: string; due: string; priority: string; completed: boolean }[]> = {};

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    // 1. Identify user / lecturer
    const user = extractUserFromCookies(request.cookies.getAll());

    // Find the faculty staff record
    let staffQuery = supabase
      .from("staff")
      .select("id, profile_id, staff_number, job_title, department_id, department:department_id(name), profile:profile_id(id, full_name, email)");

    if (user?.id && user?.user_metadata?.role === "lecturer") {
      staffQuery = staffQuery.eq("profile_id", user.id);
    }

    const { data: staffList } = await staffQuery.limit(1);
    const lecturerStaff = staffList?.[0];
    const lecturerProfileId = lecturerStaff?.profile_id || user?.id;

    // 2. Fetch assigned courses via teaching_assignments
    let offerings: any[] = [];
    if (lecturerStaff?.id) {
      const { data: assignments } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          role,
          is_primary,
          course_offering:course_offering_id(
            id,
            section,
            enrolled_count,
            delivery_mode,
            status,
            term_id,
            course:course_id(id, code, name, credits, contact_hours, description)
          )
        `)
        .eq("staff_id", lecturerStaff.id);

      if (assignments && assignments.length > 0) {
        offerings = assignments
          .map((a: any) => ({
            ...a.course_offering,
            assignment_role: a.role,
            is_primary: a.is_primary,
          }))
          .filter(Boolean);
      }
    }

    // Fallback: if no assignments specific to this staff, fetch active course offerings
    if (offerings.length === 0) {
      const { data: allOfferings } = await supabase
        .from("course_offerings")
        .select(`
          id,
          section,
          enrolled_count,
          delivery_mode,
          status,
          term_id,
          course:course_id(id, code, name, credits, contact_hours, description)
        `)
        .limit(4);
      offerings = allOfferings || [];
    }

    const offeringIds = offerings.map((o) => o.id);

    // 3. Timetable events & Schedule
    let timetableEvents: any[] = [];
    if (offeringIds.length > 0) {
      const { data: ttEvents } = await supabase
        .from("timetable_events")
        .select(`
          id,
          course_offering_id,
          room_id,
          day_of_week,
          start_time,
          end_time,
          recurrence_pattern,
          room:room_id(id, code, name, capacity, building:building_id(name)),
          course_offering:course_offering_id(
            id,
            section,
            course:course_id(code, name)
          )
        `)
        .in("course_offering_id", offeringIds)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      timetableEvents = ttEvents || [];
    }

    // 4. Class sessions & Attendance
    let classSessions: any[] = [];
    let totalAttendanceRecords = 0;
    let presentAttendanceCount = 0;

    if (offeringIds.length > 0) {
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select(`
          id,
          course_offering_id,
          session_date,
          start_time,
          end_time,
          topic,
          created_at,
          course_offering:course_offering_id(
            id,
            section,
            course:course_id(code, name)
          )
        `)
        .in("course_offering_id", offeringIds)
        .order("session_date", { ascending: false })
        .limit(10);

      classSessions = sessions || [];

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id);
        const { data: attList } = await supabase
          .from("attendance_records")
          .select("id, status")
          .in("class_session_id", sessionIds);

        if (attList) {
          totalAttendanceRecords = attList.length;
          presentAttendanceCount = attList.filter((a) =>
            ["present", "late"].includes(a.status)
          ).length;
        }
      }
    }

    const attendanceRate =
      totalAttendanceRecords > 0
        ? Math.round((presentAttendanceCount / totalAttendanceRecords) * 100)
        : 100;

    // 5. Assessment Components & Results
    let assessmentComponents: any[] = [];
    if (offeringIds.length > 0) {
      const { data: assessments } = await supabase
        .from("assessment_components")
        .select(`
          id,
          course_offering_id,
          name,
          component_type,
          weight_percentage,
          max_marks,
          created_at,
          course_offering:course_offering_id(
            id,
            section,
            course:course_id(code, name)
          )
        `)
        .in("course_offering_id", offeringIds)
        .order("created_at", { ascending: false });

      assessmentComponents = assessments || [];
    }

    // 6. Result Submissions & Moderation status
    let resultSubmissions: any[] = [];
    if (offeringIds.length > 0) {
      const { data: submissions } = await supabase
        .from("result_submissions")
        .select(`
          id,
          course_offering_id,
          submitted_at,
          status,
          submission_notes,
          course_offering:course_offering_id(
            id,
            section,
            course:course_id(code, name)
          )
        `)
        .in("course_offering_id", offeringIds)
        .order("submitted_at", { ascending: false });

      resultSubmissions = submissions || [];
    }

    // 7. Enrolled Scholars / Students
    let enrolledStudents: any[] = [];
    if (offeringIds.length > 0) {
      const { data: enrolments } = await supabase
        .from("course_enrolments")
        .select(`
          id,
          student_id,
          course_offering_id,
          enrolment_status,
          registered_at,
          student:student_id(
            id,
            student_number,
            profile:profile_id(full_name, email, phone)
          ),
          course_offering:course_offering_id(
            id,
            course:course_id(code, name)
          )
        `)
        .in("course_offering_id", offeringIds)
        .limit(20);

      if (enrolments) {
        enrolledStudents = enrolments.map((e: any) => ({
          enrolment_id: e.id,
          student_id: e.student_id,
          student_number: e.student?.student_number || "STU-000",
          full_name: e.student?.profile?.full_name || "Enrolled Student",
          email: e.student?.profile?.email || "",
          course_code: e.course_offering?.course?.code || "",
          course_name: e.course_offering?.course?.name || "",
          status: e.enrolment_status,
        }));
      }
    }

    // 8. Announcements for Lecturers / Faculty
    const { data: announcements } = await supabase
      .from("announcements")
      .select("id, title, content, target_audience, published_at, is_pinned")
      .or("target_audience.eq.lecturers,target_audience.eq.staff,target_audience.eq.all")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(6);

    // 9. Support Cases / Advising Referrals
    const { data: supportCases } = await supabase
      .from("support_cases")
      .select(`
        id,
        category,
        priority,
        subject,
        description,
        status,
        created_at,
        student:student_id(
          id,
          student_number,
          profile:profile_id(full_name, email)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(6);

    // 10. Overall KPI counts
    const totalStudents = offerings.reduce(
      (sum, o) => sum + (Number(o.enrolled_count) || enrolledStudents.length || 0),
      0
    );
    const activeClasses = offerings.length;
    const pendingAssessments = assessmentComponents.filter(
      (a) => a.component_type !== "final_exam"
    ).length;

    // Default Tasks for this lecturer
    const taskKey = lecturerProfileId || "default";
    if (!memoryTasks[taskKey]) {
      memoryTasks[taskKey] = [
        {
          id: "task-1",
          title: "Submit Mid-Semester Continuous Assessment marks to HOD",
          due: "Due Nov 05",
          priority: "high",
          completed: false,
        },
        {
          id: "task-2",
          title: "Upload Week 8 Practical Laboratory Sheet for CS102",
          due: "Due Nov 08",
          priority: "medium",
          completed: true,
        },
        {
          id: "task-3",
          title: "Sign and verify attendance sheet for Accra Central Campus sessions",
          due: "Due Nov 12",
          priority: "medium",
          completed: false,
        },
      ];
    }

    return NextResponse.json({
      success: true,
      lecturer: {
        id: lecturerStaff?.id,
        profile_id: lecturerProfileId,
        staff_number: lecturerStaff?.staff_number || "FAC20260001",
        full_name:
          (Array.isArray((lecturerStaff as any)?.profile)
            ? (lecturerStaff as any).profile[0]?.full_name
            : (lecturerStaff as any)?.profile?.full_name) || "Faculty Member",
        email:
          (Array.isArray((lecturerStaff as any)?.profile)
            ? (lecturerStaff as any).profile[0]?.email
            : (lecturerStaff as any)?.profile?.email) || "adaahessel@university.edu.gh",
        job_title: lecturerStaff?.job_title || "Senior Lecturer",
        department:
          (Array.isArray((lecturerStaff as any)?.department)
            ? (lecturerStaff as any).department[0]?.name
            : (lecturerStaff as any)?.department?.name) || "Department of Computer Science",
      },
      stats: {
        totalStudents: Math.max(totalStudents, enrolledStudents.length),
        activeClasses,
        attendanceRate,
        pendingAssessments,
        totalSessionsConducted: classSessions.length,
        moderationPendingCount: resultSubmissions.filter((r) => r.status === "submitted").length,
      },
      offerings,
      timetable: timetableEvents,
      recentSessions: classSessions,
      assessments: assessmentComponents,
      resultSubmissions,
      scholars: enrolledStudents,
      announcements: announcements || [],
      supportCases: supportCases || [],
      tasks: memoryTasks[taskKey],
    });
  } catch (err: unknown) {
    console.error("Lecturer dashboard API exception:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, completed, profileId } = body;
    const taskKey = profileId || "default";

    if (memoryTasks[taskKey] && taskId) {
      memoryTasks[taskKey] = memoryTasks[taskKey].map((t) =>
        t.id === taskId ? { ...t, completed: Boolean(completed) } : t
      );
    }

    return NextResponse.json({ success: true, tasks: memoryTasks[taskKey] });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update task" },
      { status: 500 }
    );
  }
}
