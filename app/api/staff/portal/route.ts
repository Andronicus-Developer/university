import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  isMissingTableError,
  resolveAcademicStaffContext,
  safeStaffQuery,
  staffDisplayName,
  studentDisplayName,
} from "@/lib/staff/staff-context";

function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "").trim();
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("could not find the column") ||
    msg.includes("column")
  );
}

function computeUniversityGrade(total: number): { letter: string; point: number } {
  if (total >= 80) return { letter: "A", point: 4.0 };
  if (total >= 75) return { letter: "B+", point: 3.5 };
  if (total >= 70) return { letter: "B", point: 3.0 };
  if (total >= 65) return { letter: "C+", point: 2.5 };
  if (total >= 60) return { letter: "C", point: 2.0 };
  if (total >= 50) return { letter: "D", point: 1.0 };
  return { letter: "F", point: 0.0 };
}

function computeWaecGrade(total: number): string {
  if (total >= 80) return "A1";
  if (total >= 75) return "B2";
  if (total >= 70) return "B3";
  if (total >= 65) return "C4";
  if (total >= 60) return "C5";
  if (total >= 55) return "C6";
  if (total >= 50) return "D7";
  if (total >= 45) return "E8";
  return "F9";
}

function todayDayName(): string {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return names[new Date().getDay()] || "Monday";
}

async function resolveScopedUniversityCourses(
  db: any,
  ctx: NonNullable<Awaited<ReturnType<typeof resolveAcademicStaffContext>>["ctx"]>
) {
  const { data: allCourses } = await safeStaffQuery<any[]>(
    db
      .from("courses")
      .select("*")
      .eq("school_id", ctx.schoolId)
      .order("code", { ascending: true })
  );
  const list = allCourses || [];
  const explicitSet = new Set(ctx.assignedCourseIds.map(String));
  const explicit = list.filter(
    (c) => explicitSet.has(String(c.id)) || (ctx.staffId && String(c.lecturer_id) === String(ctx.staffId))
  );
  if (explicit.length > 0) {
    return {
      courses: explicit.map((c) => ({ ...c, isExplicitlyAssigned: true })),
      scope: "assigned" as const,
    };
  }
  if (ctx.department?.id) {
    const deptCourses = list.filter((c) => String(c.department_id) === String(ctx.department.id));
    if (deptCourses.length > 0) {
      return {
        courses: deptCourses.map((c) => ({ ...c, isExplicitlyAssigned: false })),
        scope: "department" as const,
      };
    }
  }
  if (ctx.isAdmin || ctx.isSuperAdmin) {
    return {
      courses: list.map((c) => ({ ...c, isExplicitlyAssigned: false })),
      scope: "school" as const,
    };
  }
  return { courses: [], scope: "assigned" as const };
}

async function resolveScopedHighSchoolUnits(
  db: any,
  ctx: NonNullable<Awaited<ReturnType<typeof resolveAcademicStaffContext>>["ctx"]>
) {
  const [progRes, subjRes] = await Promise.all([
    safeStaffQuery<any[]>(
      db.from("programmes").select("*").eq("school_id", ctx.schoolId).order("name", { ascending: true })
    ),
    safeStaffQuery<any[]>(
      db.from("subjects").select("*").eq("school_id", ctx.schoolId).order("code", { ascending: true })
    ),
  ]);
  const allProgs = progRes.data || [];
  const allSubjects = subjRes.data || [];
  const explicitSubjSet = new Set(ctx.assignedSubjectIds.map(String));

  const explicitSubjects = allSubjects.filter(
    (s) =>
      explicitSubjSet.has(String(s.id)) ||
      (ctx.staffId && String(s.teacher_id) === String(ctx.staffId)) ||
      (ctx.assignedClassId && String(s.programme_id) === String(ctx.assignedClassId))
  );

  const scopedSubjects =
    explicitSubjects.length > 0
      ? explicitSubjects
      : ctx.isAdmin || ctx.isSuperAdmin
      ? allSubjects
      : [];

  const classIdSet = new Set<string>();
  if (ctx.assignedClassId) classIdSet.add(String(ctx.assignedClassId));
  for (const s of scopedSubjects) if (s.programme_id) classIdSet.add(String(s.programme_id));

  const scopedClasses =
    classIdSet.size > 0
      ? allProgs.filter((p) => classIdSet.has(String(p.id)))
      : ctx.isAdmin || ctx.isSuperAdmin
      ? allProgs
      : [];

  const assignedClass =
    ctx.assignedClassId
      ? allProgs.find((p) => String(p.id) === String(ctx.assignedClassId)) || null
      : null;

  return { classes: scopedClasses, allClasses: allProgs, subjects: scopedSubjects, assignedClass };
}

async function resolveScopedVocationalModules(
  db: any,
  ctx: NonNullable<Awaited<ReturnType<typeof resolveAcademicStaffContext>>["ctx"]>
) {
  const [modRes, intakeRes, stuRes] = await Promise.all([
    safeStaffQuery<any[]>(
      db
        .from("vocational_modules")
        .select("*")
        .eq("school_id", ctx.schoolId)
        .order("code", { ascending: true })
    ),
    safeStaffQuery<any[]>(
      db
        .from("vocational_intakes")
        .select("*")
        .eq("school_id", ctx.schoolId)
        .order("start_date", { ascending: false })
    ),
    safeStaffQuery<any[]>(
      db.from("students").select("*").eq("school_id", ctx.schoolId).order("first_name", { ascending: true })
    ),
  ]);

  const allModules = modRes.data || [];
  const explicitSet = new Set(ctx.assignedModuleIds.map(String));
  const explicitMods = allModules.filter(
    (m) =>
      explicitSet.has(String(m.id)) ||
      (ctx.staffId && String(m.instructor_id) === String(ctx.staffId))
  );

  let scopedModules = explicitMods;
  if (scopedModules.length === 0 && ctx.department?.id) {
    scopedModules = allModules.filter((m) => String(m.department_id) === String(ctx.department.id));
  }
  if (scopedModules.length === 0 && (ctx.isAdmin || ctx.isSuperAdmin)) {
    scopedModules = allModules;
  }

  const allTrainees = stuRes.data || [];
  const deptIds = new Set<string>();
  if (ctx.department?.id) deptIds.add(String(ctx.department.id));
  for (const m of scopedModules) if (m.department_id) deptIds.add(String(m.department_id));

  const scopedTrainees =
    deptIds.size > 0 && !ctx.isAdmin && !ctx.isSuperAdmin
      ? allTrainees.filter((t) => {
          const tDept = t.department_id || t.metadata?.department_id;
          return !tDept || deptIds.has(String(tDept));
        })
      : allTrainees;

  return {
    modules: scopedModules,
    intakes: intakeRes.data || [],
    trainees: scopedTrainees.map((t) => ({
      ...t,
      full_name: studentDisplayName(t),
      training_stage: t.metadata?.training_stage || "NVTI Foundation",
      sponsorship_type: t.metadata?.sponsorship_type || "Self-Sponsored",
    })),
  };
}

export async function GET(req: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(req);
  if (errorResponse || !ctx) return errorResponse!;

  const section = String(req.nextUrl.searchParams.get("section") || "dashboard")
    .trim()
    .toLowerCase();
  const db = createDirectAdminClient() as any;

  const base = {
    school: {
      id: ctx.schoolId,
      name: ctx.schoolName,
      abbr: ctx.schoolAbbr,
      logoUrl: ctx.schoolLogo,
      schoolType: ctx.schoolType,
    },
    staffProfile: ctx.staffProfile,
    department: ctx.department,
    activeYear: ctx.activeYear,
    activeTerm: ctx.activeTerm,
    userEmail: ctx.email,
    isClassTeacher: ctx.isClassTeacher,
    assignedClassId: ctx.assignedClassId,
  };

  try {
    // ----------------------------------------------------------------------
    // HEADER
    // ----------------------------------------------------------------------
    if (section === "header") {
      let assignedClassName = ctx.staffProfile?.metadata?.assigned_class_name || "";
      if (!assignedClassName && ctx.assignedClassId) {
        const { data: cls } = await safeStaffQuery<any>(
          db
            .from("programmes")
            .select("name")
            .eq("school_id", ctx.schoolId)
            .eq("id", ctx.assignedClassId)
            .maybeSingle()
        );
        if (cls?.name) assignedClassName = cls.name;
      }
      return NextResponse.json({ ...base, assignedClassName }, { headers: { "Cache-Control": "no-store" } });
    }

    // ----------------------------------------------------------------------
    // SHARED PROFILE
    // ----------------------------------------------------------------------
    if (section === "profile") {
      const [uniRes, hsRes, vocRes] = await Promise.all([
        ctx.schoolType === "university"
          ? resolveScopedUniversityCourses(db, ctx)
          : Promise.resolve({ courses: [] }),
        ctx.schoolType === "high_school"
          ? resolveScopedHighSchoolUnits(db, ctx)
          : Promise.resolve({ subjects: [], assignedClass: null }),
        ctx.schoolType === "vocational"
          ? resolveScopedVocationalModules(db, ctx)
          : Promise.resolve({ modules: [] }),
      ]);

      return NextResponse.json(
        {
          ...base,
          assignedCourses: uniRes.courses || [],
          assignedSubjects: hsRes.subjects || [],
          assignedClass: hsRes.assignedClass || null,
          assignedModules: vocRes.modules || [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ----------------------------------------------------------------------
    // DASHBOARD (SCHOOL-TYPE ADAPTIVE)
    // ----------------------------------------------------------------------
    if (section === "dashboard") {
      const dayToday = todayDayName();

      if (ctx.schoolType === "university") {
        const { courses } = await resolveScopedUniversityCourses(db, ctx);
        const courseIds = courses.map((c) => c.id);

        const [enrRes, gradeRes, ttRes, matRes] = await Promise.all([
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("course_enrolments")
                  .select("id, student_id, course_id, status")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("exam_grades")
                  .select("id, student_id, course_id, status")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          safeStaffQuery<any[]>(
            db
              .from("timetable_entries")
              .select("*")
              .eq("school_id", ctx.schoolId)
          ),
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("course_materials")
                  .select("id, course_id")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
        ]);

        const activeEnrolments = (enrRes.data || []).filter((e) => e.status !== "dropped");
        const uniqueStudents = new Set(activeEnrolments.map((e) => String(e.student_id)));
        const gradedKeySet = new Set(
          (gradeRes.data || []).map((g) => `${g.student_id}:${g.course_id}`)
        );
        const pendingGradeEntries = activeEnrolments.filter(
          (e) => !gradedKeySet.has(`${e.student_id}:${e.course_id}`)
        ).length;

        const courseMap = new Map(courses.map((c) => [String(c.id), c]));
        const courseIdSet = new Set(courseIds.map(String));
        const relevantTT = (ttRes.data || []).filter(
          (t) =>
            (ctx.staffId && String(t.teacher_id) === String(ctx.staffId)) ||
            (t.course_id && courseIdSet.has(String(t.course_id)))
        );
        const todaySchedule = relevantTT
          .filter((t) => String(t.day_of_week || "").toLowerCase() === dayToday.toLowerCase())
          .map((t) => ({
            ...t,
            course_code: courseMap.get(String(t.course_id))?.code || "",
            course_name: courseMap.get(String(t.course_id))?.name || "",
          }));

        const coursesSummary = courses.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          credits: c.credits,
          enrolledCount: activeEnrolments.filter((e) => String(e.course_id) === String(c.id)).length,
        }));

        return NextResponse.json(
          {
            ...base,
            kpis: {
              assignedCoursesCount: courses.length,
              totalEnrolledStudents: uniqueStudents.size,
              pendingGradeEntries,
              todaysLecturesCount: todaySchedule.length,
            },
            todaySchedule,
            coursesSummary,
            recentMaterialsCount: (matRes.data || []).length,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (ctx.schoolType === "high_school") {
        const { classes, subjects, assignedClass } = await resolveScopedHighSchoolUnits(db, ctx);
        const classIds = classes.map((c) => String(c.id));
        const subjIds = subjects.map((s) => String(s.id));

        const [stuRes, ttRes, asgRes, conductRes] = await Promise.all([
          safeStaffQuery<any[]>(db.from("students").select("id, programme_id").eq("school_id", ctx.schoolId)),
          safeStaffQuery<any[]>(db.from("timetable_entries").select("*").eq("school_id", ctx.schoolId)),
          safeStaffQuery<any[]>(db.from("assignments").select("id, programme_id, subject_id, status").eq("school_id", ctx.schoolId)),
          safeStaffQuery<any[]>(db.from("student_conduct_records").select("id").eq("school_id", ctx.schoolId)),
        ]);

        const classSet = new Set(classIds);
        const scopedStudents =
          classSet.size > 0
            ? (stuRes.data || []).filter((s) => classSet.has(String(s.programme_id)))
            : stuRes.data || [];

        const subjSet = new Set(subjIds);
        const subjMap = new Map(subjects.map((s) => [String(s.id), s]));
        const classMap = new Map(classes.map((c) => [String(c.id), c]));

        const scopedTT = (ttRes.data || []).filter(
          (t) =>
            (ctx.staffId && String(t.teacher_id) === String(ctx.staffId)) ||
            (t.subject_id && subjSet.has(String(t.subject_id))) ||
            (t.programme_id && classSet.has(String(t.programme_id)))
        );
        const todaySchedule = scopedTT
          .filter((t) => String(t.day_of_week || "").toLowerCase() === dayToday.toLowerCase())
          .map((t) => ({
            ...t,
            subject_name: subjMap.get(String(t.subject_id))?.name || "",
            class_name: classMap.get(String(t.programme_id))?.name || "",
          }));

        const activeAssignments = (asgRes.data || []).filter(
          (a) =>
            (subjSet.size === 0 || subjSet.has(String(a.subject_id)) || classSet.has(String(a.programme_id))) &&
            a.status === "published"
        );

        return NextResponse.json(
          {
            ...base,
            kpis: {
              assignedUnitsCount: subjects.length || classes.length,
              totalStudentsCount: scopedStudents.length,
              todaysPeriodsCount: todaySchedule.length,
              pendingAssessmentsCount: activeAssignments.length,
            },
            assignedClass,
            classesSummary: classes.map((c) => ({
              id: c.id,
              name: c.name,
              code: c.code,
              studentCount: (stuRes.data || []).filter((s) => String(s.programme_id) === String(c.id)).length,
            })),
            subjectsSummary: subjects.slice(0, 6),
            todaySchedule,
            recentConductCount: (conductRes.data || []).length,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      // Vocational dashboard
      const { modules, trainees } = await resolveScopedVocationalModules(db, ctx);
      const traineeIds = new Set(trainees.map((t) => String(t.id)));
      const modIds = new Set(modules.map((m) => String(m.id)));

      const [logRes, invRes, compRes] = await Promise.all([
        safeStaffQuery<any[]>(
          db
            .from("practical_logbooks")
            .select("*")
            .eq("school_id", ctx.schoolId)
            .order("created_at", { ascending: false })
        ),
        safeStaffQuery<any[]>(db.from("workshop_inventory").select("*").eq("school_id", ctx.schoolId)),
        safeStaffQuery<any[]>(db.from("competency_assessments").select("id, verdict").eq("school_id", ctx.schoolId)),
      ]);

      const scopedLogs = (logRes.data || []).filter(
        (l) => modIds.has(String(l.module_id)) || traineeIds.has(String(l.student_id))
      );
      const pendingLogbooks = scopedLogs.filter((l) => l.status === "submitted");
      const lowStockCount = (invRes.data || []).filter(
        (i) => Number(i.quantity || 0) <= Number(i.min_stock_threshold || 0)
      ).length;

      const traineeMap = new Map(trainees.map((t) => [String(t.id), t]));
      const modMap = new Map(modules.map((m) => [String(m.id), m]));

      return NextResponse.json(
        {
          ...base,
          kpis: {
            workshopName: ctx.department?.name || "Trade Workshop",
            activeTraineesCount: trainees.length,
            pendingLogbooksCount: pendingLogbooks.length,
            modulesTaughtCount: modules.length,
          },
          modulesSummary: modules.map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            practical_hours: m.practical_hours,
            theory_hours: m.theory_hours,
          })),
          recentLogbooks: pendingLogbooks.slice(0, 6).map((l) => ({
            ...l,
            student_name: traineeMap.get(String(l.student_id))?.full_name || "Trainee",
            module_code: modMap.get(String(l.module_id))?.code || "",
          })),
          lowStockCount,
          competencyCount: (compRes.data || []).length,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ======================================================================
    // UNIVERSITY SECTIONS
    // ======================================================================
    if (section.startsWith("uni_")) {
      if (ctx.schoolType !== "university" && !ctx.isAdmin) {
        return NextResponse.json(
          { error: "University Lecturer access only." },
          { status: 403 }
        );
      }

      const { courses, scope } = await resolveScopedUniversityCourses(db, ctx);
      const courseIds = courses.map((c) => c.id);

      if (section === "uni_courses") {
        const [enrRes, matRes] = await Promise.all([
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("course_enrolments")
                  .select("id, course_id, status")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          safeStaffQuery<any[]>(
            db
              .from("course_materials")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("created_at", { ascending: false })
          ),
        ]);

        const missingTables: string[] = [];
        if (matRes.missing) missingTables.push("course_materials");

        const activeEnr = (enrRes.data || []).filter((e) => e.status !== "dropped");
        const cIdSet = new Set(courseIds.map(String));
        const materials = (matRes.data || []).filter(
          (m) => m.course_id && cIdSet.has(String(m.course_id))
        );

        return NextResponse.json(
          {
            ...base,
            assignmentScope: scope,
            courses: courses.map((c) => ({
              ...c,
              enrolledCount: activeEnr.filter((e) => String(e.course_id) === String(c.id)).length,
            })),
            materials,
            missingTables,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "uni_attendance") {
        const [enrRes, stuRes, sessRes, recRes] = await Promise.all([
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("course_enrolments")
                  .select("id, student_id, course_id, status")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          safeStaffQuery<any[]>(
            db.from("students").select("*").eq("school_id", ctx.schoolId)
          ),
          safeStaffQuery<any[]>(
            db
              .from("attendance_sessions")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("session_date", { ascending: false })
              .limit(60)
          ),
          safeStaffQuery<any[]>(
            db
              .from("attendance_records")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .limit(1000)
          ),
        ]);

        const stuMap = new Map((stuRes.data || []).map((s) => [String(s.id), s]));
        const enrolmentsByCourse: Record<string, any[]> = {};
        for (const c of courses) enrolmentsByCourse[String(c.id)] = [];
        for (const e of enrRes.data || []) {
          if (e.status === "dropped") continue;
          const st = stuMap.get(String(e.student_id));
          if (!st) continue;
          const cid = String(e.course_id);
          if (!enrolmentsByCourse[cid]) enrolmentsByCourse[cid] = [];
          enrolmentsByCourse[cid].push({
            enrolment_id: e.id,
            student_id: st.id,
            full_name: studentDisplayName(st),
            student_number: st.student_number,
            email: st.email || "",
            level: st.current_level || 100,
          });
        }

        const cIdSet = new Set(courseIds.map(String));
        const courseMap = new Map(courses.map((c) => [String(c.id), c]));
        const recsBySess = new Map<string, any[]>();
        for (const r of recRes.data || []) {
          const sid = String(r.session_id);
          if (!recsBySess.has(sid)) recsBySess.set(sid, []);
          recsBySess.get(sid)!.push(r);
        }

        const sessions = (sessRes.data || [])
          .filter((s) => s.course_id && cIdSet.has(String(s.course_id)))
          .map((s) => {
            const list = recsBySess.get(String(s.id)) || [];
            return {
              ...s,
              course_code: courseMap.get(String(s.course_id))?.code || "",
              course_name: courseMap.get(String(s.course_id))?.name || "",
              present_count: list.filter((r) => r.status === "present").length,
              late_count: list.filter((r) => r.status === "late").length,
              absent_count: list.filter((r) => r.status === "absent").length,
              excused_count: list.filter((r) => r.status === "excused").length,
              total_count: list.length,
            };
          });

        return NextResponse.json(
          { ...base, courses, enrolmentsByCourse, sessions, missingTables: [] },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "uni_assignments") {
        const [asgRes, subRes, stuRes] = await Promise.all([
          safeStaffQuery<any[]>(
            db
              .from("assignments")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("created_at", { ascending: false })
          ),
          safeStaffQuery<any[]>(
            db
              .from("assignment_submissions")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("submitted_at", { ascending: false })
          ),
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId)),
        ]);

        const missingTables: string[] = [];
        if (asgRes.missing) missingTables.push("assignments");
        if (subRes.missing) missingTables.push("assignment_submissions");

        const cIdSet = new Set(courseIds.map(String));
        const courseMap = new Map(courses.map((c) => [String(c.id), c]));
        const stuMap = new Map((stuRes.data || []).map((s) => [String(s.id), s]));

        const subsByAsg = new Map<string, any[]>();
        for (const sub of subRes.data || []) {
          const aid = String(sub.assignment_id);
          if (!subsByAsg.has(aid)) subsByAsg.set(aid, []);
          const st = stuMap.get(String(sub.student_id));
          subsByAsg.get(aid)!.push({
            ...sub,
            student_name: studentDisplayName(st),
            student_number: st?.student_number || "",
          });
        }

        const scopedAssignments = (asgRes.data || [])
          .filter(
            (a) =>
              (a.course_id && cIdSet.has(String(a.course_id))) ||
              (ctx.staffId && String(a.teacher_id) === String(ctx.staffId))
          )
          .map((a) => ({
            ...a,
            course_code: courseMap.get(String(a.course_id))?.code || "",
            course_name: courseMap.get(String(a.course_id))?.name || "",
            submissions: subsByAsg.get(String(a.id)) || [],
          }));

        return NextResponse.json(
          { ...base, courses, assignments: scopedAssignments, missingTables },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "uni_grades") {
        const [enrRes, stuRes, gradeRes] = await Promise.all([
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("course_enrolments")
                  .select("id, student_id, course_id, status")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId)),
          courseIds.length > 0
            ? safeStaffQuery<any[]>(
                db
                  .from("exam_grades")
                  .select("*")
                  .eq("school_id", ctx.schoolId)
                  .in("course_id", courseIds)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
        ]);

        const stuMap = new Map((stuRes.data || []).map((s) => [String(s.id), s]));
        const enrolmentsByCourse: Record<string, any[]> = {};
        for (const c of courses) enrolmentsByCourse[String(c.id)] = [];
        for (const e of enrRes.data || []) {
          if (e.status === "dropped") continue;
          const st = stuMap.get(String(e.student_id));
          if (!st) continue;
          const cid = String(e.course_id);
          if (!enrolmentsByCourse[cid]) enrolmentsByCourse[cid] = [];
          enrolmentsByCourse[cid].push({
            enrolment_id: e.id,
            student_id: st.id,
            full_name: studentDisplayName(st),
            student_number: st.student_number,
          });
        }

        return NextResponse.json(
          {
            ...base,
            courses,
            enrolmentsByCourse,
            grades: gradeRes.data || [],
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "uni_timetable") {
        const { data: ttAll } = await safeStaffQuery<any[]>(
          db
            .from("timetable_entries")
            .select("*")
            .eq("school_id", ctx.schoolId)
            .order("start_time", { ascending: true })
        );
        const courseMap = new Map(courses.map((c) => [String(c.id), c]));
        const cIdSet = new Set(courseIds.map(String));
        const scoped = (ttAll || [])
          .filter(
            (t) =>
              (ctx.staffId && String(t.teacher_id) === String(ctx.staffId)) ||
              (t.course_id && cIdSet.has(String(t.course_id)))
          )
          .map((t) => ({
            ...t,
            course_code: courseMap.get(String(t.course_id))?.code || "",
            course_name: courseMap.get(String(t.course_id))?.name || "",
          }));

        return NextResponse.json(
          {
            ...base,
            lectures: scoped.filter((t) => String(t.entry_type || "class").toLowerCase() !== "exam"),
            exams: scoped.filter((t) => String(t.entry_type || "").toLowerCase() === "exam"),
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "uni_advising") {
        const [stuRes, notesRes, progRes] = await Promise.all([
          safeStaffQuery<any[]>(
            db.from("students").select("*").eq("school_id", ctx.schoolId).order("first_name", { ascending: true })
          ),
          safeStaffQuery<any[]>(
            db
              .from("student_advising_notes")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("session_date", { ascending: false })
              .order("created_at", { ascending: false })
          ),
          safeStaffQuery<any[]>(db.from("programmes").select("id, name").eq("school_id", ctx.schoolId)),
        ]);

        const missingTables: string[] = [];
        if (notesRes.missing) missingTables.push("student_advising_notes");

        const progMap = new Map((progRes.data || []).map((p) => [String(p.id), p.name]));
        const allStudents = (stuRes.data || []).filter((s) =>
          ctx.department?.id && !ctx.isAdmin && !ctx.isSuperAdmin && s.department_id
            ? String(s.department_id) === String(ctx.department.id)
            : true
        );
        const stuMap = new Map(allStudents.map((s) => [String(s.id), s]));

        const notes = (notesRes.data || [])
          .filter((n) =>
            ctx.staffId && !ctx.isAdmin && !ctx.isSuperAdmin
              ? !n.staff_id || String(n.staff_id) === String(ctx.staffId)
              : true
          )
          .map((n) => {
            const st = stuMap.get(String(n.student_id));
            return {
              ...n,
              student_name: studentDisplayName(st),
              student_number: st?.student_number || "",
            };
          });

        return NextResponse.json(
          {
            ...base,
            students: allStudents.map((s) => ({
              id: s.id,
              full_name: studentDisplayName(s),
              student_number: s.student_number,
              email: s.email || "",
              current_level: s.current_level || 100,
              programme_name: progMap.get(String(s.programme_id)) || "",
            })),
            notes,
            missingTables,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // ======================================================================
    // HIGH SCHOOL SECTIONS
    // ======================================================================
    if (section.startsWith("hs_")) {
      if (ctx.schoolType !== "high_school" && !ctx.isAdmin) {
        return NextResponse.json(
          { error: "High School Teacher access only." },
          { status: 403 }
        );
      }

      const { classes, allClasses, subjects, assignedClass } =
        await resolveScopedHighSchoolUnits(db, ctx);
      const classMap = new Map(allClasses.map((c) => [String(c.id), c]));

      if (section === "hs_classes") {
        const [stuRes, pgRes, joinRes] = await Promise.all([
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId).order("first_name", { ascending: true })),
          safeStaffQuery<any[]>(db.from("parent_guardians").select("*").eq("school_id", ctx.schoolId)),
          safeStaffQuery<any[]>(db.from("parent_guardian_students").select("*").eq("school_id", ctx.schoolId)),
        ]);

        const allStu = stuRes.data || [];
        const pgById = new Map((pgRes.data || []).map((p) => [String(p.id), p]));
        const parentsByStudent = new Map<string, any>();
        for (const p of pgRes.data || []) {
          if (p.student_id && !parentsByStudent.has(String(p.student_id))) {
            parentsByStudent.set(String(p.student_id), p);
          }
        }
        for (const j of joinRes.data || []) {
          const p = pgById.get(String(j.parent_guardian_id));
          if (p && j.student_id && !parentsByStudent.has(String(j.student_id))) {
            parentsByStudent.set(String(j.student_id), p);
          }
        }

        const formClassRoster = assignedClass
          ? {
              id: assignedClass.id,
              name: assignedClass.name,
              code: assignedClass.code,
              students: allStu
                .filter((s) => String(s.programme_id) === String(assignedClass.id))
                .map((s) => {
                  const guardian = parentsByStudent.get(String(s.id));
                  return {
                    id: s.id,
                    full_name: studentDisplayName(s),
                    student_number: s.student_number,
                    email: s.email || "",
                    phone: s.phone || "",
                    boarding_status: s.metadata?.boarding_status || "Day",
                    stream_track: s.metadata?.stream_track || "",
                    guardian_name: guardian?.full_name || s.metadata?.guardian_name || "",
                    guardian_phone: guardian?.phone || s.metadata?.guardian_phone || "",
                    guardian_email: guardian?.email || s.metadata?.guardian_email || "",
                  };
                }),
            }
          : null;

        return NextResponse.json(
          {
            ...base,
            classes: classes.map((c) => ({
              id: c.id,
              name: c.name,
              code: c.code,
              studentCount: allStu.filter((s) => String(s.programme_id) === String(c.id)).length,
              isAssignedClass: Boolean(ctx.assignedClassId && String(c.id) === String(ctx.assignedClassId)),
            })),
            subjects: subjects.map((s) => ({
              ...s,
              programme_name: classMap.get(String(s.programme_id))?.name || "",
            })),
            formClass: formClassRoster,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "hs_attendance") {
        const [stuRes, sessRes, recRes, condRes] = await Promise.all([
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId).order("first_name", { ascending: true })),
          safeStaffQuery<any[]>(
            db.from("attendance_sessions").select("*").eq("school_id", ctx.schoolId).order("session_date", { ascending: false }).limit(60)
          ),
          safeStaffQuery<any[]>(db.from("attendance_records").select("*").eq("school_id", ctx.schoolId).limit(1000)),
          safeStaffQuery<any[]>(
            db.from("student_conduct_records").select("*").eq("school_id", ctx.schoolId).order("incident_date", { ascending: false }).limit(100)
          ),
        ]);

        const allStu = stuRes.data || [];
        const stuMap = new Map(allStu.map((s) => [String(s.id), s]));
        const studentsByClass: Record<string, any[]> = {};
        for (const c of classes) studentsByClass[String(c.id)] = [];
        for (const s of allStu) {
          const pid = String(s.programme_id || "");
          if (pid && studentsByClass[pid]) {
            studentsByClass[pid].push({
              id: s.id,
              full_name: studentDisplayName(s),
              student_number: s.student_number,
              programme_id: pid,
            });
          }
        }

        const recsBySess = new Map<string, any[]>();
        for (const r of recRes.data || []) {
          const sid = String(r.session_id);
          if (!recsBySess.has(sid)) recsBySess.set(sid, []);
          recsBySess.get(sid)!.push(r);
        }

        const classIdSet = new Set(classes.map((c) => String(c.id)));
        const subjIdSet = new Set(subjects.map((s) => String(s.id)));
        const subjMap = new Map(subjects.map((s) => [String(s.id), s]));

        const sessions = (sessRes.data || [])
          .filter(
            (s) =>
              (!s.programme_id && !s.subject_id) ||
              (s.programme_id && classIdSet.has(String(s.programme_id))) ||
              (s.subject_id && subjIdSet.has(String(s.subject_id))) ||
              (ctx.staffId && String(s.staff_id) === String(ctx.staffId))
          )
          .map((s) => {
            const list = recsBySess.get(String(s.id)) || [];
            return {
              ...s,
              class_name: classMap.get(String(s.programme_id))?.name || "",
              subject_name: subjMap.get(String(s.subject_id))?.name || "",
              present_count: list.filter((r) => r.status === "present").length,
              late_count: list.filter((r) => r.status === "late").length,
              absent_count: list.filter((r) => r.status === "absent").length,
              total_count: list.length,
            };
          });

        const conductRecords = (condRes.data || [])
          .filter((r) => {
            const st = stuMap.get(String(r.student_id));
            return !st || classIdSet.size === 0 || classIdSet.has(String(st.programme_id));
          })
          .map((r) => {
            const st = stuMap.get(String(r.student_id));
            return {
              ...r,
              student_name: studentDisplayName(st),
              student_number: st?.student_number || "",
            };
          });

        return NextResponse.json(
          {
            ...base,
            classes,
            subjects,
            studentsByClass,
            allStudents: allStu.map((s) => ({
              id: s.id,
              full_name: studentDisplayName(s),
              student_number: s.student_number,
              programme_id: s.programme_id,
            })),
            sessions,
            conductRecords,
            missingTables: [],
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "hs_homework") {
        const [asgRes, subRes, stuRes] = await Promise.all([
          safeStaffQuery<any[]>(
            db.from("assignments").select("*").eq("school_id", ctx.schoolId).order("created_at", { ascending: false })
          ),
          safeStaffQuery<any[]>(
            db.from("assignment_submissions").select("*").eq("school_id", ctx.schoolId).order("submitted_at", { ascending: false })
          ),
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId)),
        ]);

        const missingTables: string[] = [];
        if (asgRes.missing) missingTables.push("assignments");
        if (subRes.missing) missingTables.push("assignment_submissions");

        const subjMap = new Map(subjects.map((s) => [String(s.id), s]));
        const stuMap = new Map((stuRes.data || []).map((s) => [String(s.id), s]));
        const subjIdSet = new Set(subjects.map((s) => String(s.id)));
        const classIdSet = new Set(classes.map((c) => String(c.id)));

        const subsByAsg = new Map<string, any[]>();
        for (const sub of subRes.data || []) {
          const aid = String(sub.assignment_id);
          if (!subsByAsg.has(aid)) subsByAsg.set(aid, []);
          const st = stuMap.get(String(sub.student_id));
          subsByAsg.get(aid)!.push({
            ...sub,
            student_name: studentDisplayName(st),
            student_number: st?.student_number || "",
          });
        }

        const assignments = (asgRes.data || [])
          .filter(
            (a) =>
              !a.course_id &&
              ((ctx.staffId && String(a.teacher_id) === String(ctx.staffId)) ||
                (a.subject_id && subjIdSet.has(String(a.subject_id))) ||
                (a.programme_id && classIdSet.has(String(a.programme_id))) ||
                ctx.isAdmin ||
                ctx.isSuperAdmin)
          )
          .map((a) => ({
            ...a,
            subject_name: subjMap.get(String(a.subject_id))?.name || "",
            class_name: classMap.get(String(a.programme_id))?.name || "",
            submissions: subsByAsg.get(String(a.id)) || [],
          }));

        return NextResponse.json(
          { ...base, classes, subjects, assignments, missingTables },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "hs_report_cards") {
        const [stuRes, scoreRes] = await Promise.all([
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId).order("first_name", { ascending: true })),
          safeStaffQuery<any[]>(db.from("report_card_scores").select("*").eq("school_id", ctx.schoolId)),
        ]);

        const allStu = stuRes.data || [];
        const studentsByClass: Record<string, any[]> = {};
        for (const c of classes) studentsByClass[String(c.id)] = [];
        for (const s of allStu) {
          const pid = String(s.programme_id || "");
          if (pid && studentsByClass[pid]) {
            studentsByClass[pid].push({
              id: s.id,
              full_name: studentDisplayName(s),
              student_number: s.student_number,
            });
          }
        }

        return NextResponse.json(
          {
            ...base,
            classes,
            subjects,
            studentsByClass,
            scores: scoreRes.data || [],
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "hs_timetable") {
        const { data: ttAll } = await safeStaffQuery<any[]>(
          db.from("timetable_entries").select("*").eq("school_id", ctx.schoolId).order("start_time", { ascending: true })
        );
        const subjMap = new Map(subjects.map((s) => [String(s.id), s]));
        const subjIdSet = new Set(subjects.map((s) => String(s.id)));
        const classIdSet = new Set(classes.map((c) => String(c.id)));

        const entries = (ttAll || [])
          .filter(
            (t) =>
              (ctx.staffId && String(t.teacher_id) === String(ctx.staffId)) ||
              (t.subject_id && subjIdSet.has(String(t.subject_id))) ||
              (t.programme_id && classIdSet.has(String(t.programme_id)))
          )
          .map((t) => ({
            ...t,
            subject_code: subjMap.get(String(t.subject_id))?.code || "",
            subject_name: subjMap.get(String(t.subject_id))?.name || "",
            class_name: classMap.get(String(t.programme_id))?.name || "",
          }));

        return NextResponse.json({ ...base, entries }, { headers: { "Cache-Control": "no-store" } });
      }

      if (section === "hs_messages") {
        const [stuRes, pgRes, joinRes, msgRes] = await Promise.all([
          safeStaffQuery<any[]>(db.from("students").select("*").eq("school_id", ctx.schoolId).order("first_name", { ascending: true })),
          safeStaffQuery<any[]>(db.from("parent_guardians").select("*").eq("school_id", ctx.schoolId)),
          safeStaffQuery<any[]>(db.from("parent_guardian_students").select("*").eq("school_id", ctx.schoolId)),
          safeStaffQuery<any[]>(
            db.from("parent_teacher_messages").select("*").eq("school_id", ctx.schoolId).order("created_at", { ascending: false }).limit(120)
          ),
        ]);

        const missingTables: string[] = [];
        if (msgRes.missing) missingTables.push("parent_teacher_messages");

        const classIdSet = new Set(classes.map((c) => String(c.id)));
        const scopedStu = (stuRes.data || []).filter(
          (s) => classIdSet.size === 0 || classIdSet.has(String(s.programme_id))
        );
        const pgList = pgRes.data || [];
        const pgById = new Map(pgList.map((p) => [String(p.id), p]));
        const parentsByStu = new Map<string, any[]>();
        const pushGuardian = (sid: string, g: any) => {
          if (!parentsByStu.has(sid)) parentsByStu.set(sid, []);
          const arr = parentsByStu.get(sid)!;
          if (!arr.some((x) => String(x.id) === String(g.id))) arr.push(g);
        };
        for (const p of pgList) if (p.student_id) pushGuardian(String(p.student_id), p);
        for (const j of joinRes.data || []) {
          const p = pgById.get(String(j.parent_guardian_id));
          if (p && j.student_id) pushGuardian(String(j.student_id), p);
        }

        const stuMap = new Map(scopedStu.map((s) => [String(s.id), s]));

        return NextResponse.json(
          {
            ...base,
            students: scopedStu.map((s) => ({
              id: s.id,
              full_name: studentDisplayName(s),
              student_number: s.student_number,
              programme_id: s.programme_id,
              class_name: classMap.get(String(s.programme_id))?.name || "",
              parents: parentsByStu.get(String(s.id)) || [],
            })),
            messages: (msgRes.data || []).map((m) => ({
              ...m,
              parent_name: pgById.get(String(m.parent_guardian_id))?.full_name || "Parent / Guardian",
              student_name: stuMap.get(String(m.student_id))
                ? studentDisplayName(stuMap.get(String(m.student_id)))
                : "",
            })),
            missingTables,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // ======================================================================
    // VOCATIONAL INSTRUCTOR SECTIONS
    // ======================================================================
    if (section.startsWith("voc_")) {
      if (ctx.schoolType !== "vocational" && !ctx.isAdmin) {
        return NextResponse.json(
          { error: "Vocational Instructor access only." },
          { status: 403 }
        );
      }

      const { modules, intakes, trainees } = await resolveScopedVocationalModules(db, ctx);
      const modMap = new Map(modules.map((m) => [String(m.id), m]));
      const modIdSet = new Set(modules.map((m) => String(m.id)));
      const traineeMap = new Map(trainees.map((t) => [String(t.id), t]));
      const traineeIdSet = new Set(trainees.map((t) => String(t.id)));

      if (section === "voc_modules") {
        const matRes = await safeStaffQuery<any[]>(
          db
            .from("course_materials")
            .select("*")
            .eq("school_id", ctx.schoolId)
            .order("created_at", { ascending: false })
        );
        const missingTables: string[] = [];
        if (matRes.missing) missingTables.push("course_materials");

        const materials = (matRes.data || []).filter(
          (m) => (m.module_id && modIdSet.has(String(m.module_id))) || (!m.course_id && !m.subject_id)
        );

        return NextResponse.json(
          { ...base, modules, intakes, trainees, materials, missingTables },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "voc_attendance") {
        const [sessRes, recRes] = await Promise.all([
          safeStaffQuery<any[]>(
            db
              .from("attendance_sessions")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("session_date", { ascending: false })
              .limit(60)
          ),
          safeStaffQuery<any[]>(db.from("attendance_records").select("*").eq("school_id", ctx.schoolId).limit(1000)),
        ]);

        const recsBySess = new Map<string, any[]>();
        for (const r of recRes.data || []) {
          const sid = String(r.session_id);
          if (!recsBySess.has(sid)) recsBySess.set(sid, []);
          recsBySess.get(sid)!.push(r);
        }

        const sessions = (sessRes.data || [])
          .filter(
            (s) =>
              (s.module_id && modIdSet.has(String(s.module_id))) ||
              (ctx.staffId && String(s.staff_id) === String(ctx.staffId)) ||
              s.session_type === "workshop"
          )
          .map((s) => {
            const list = recsBySess.get(String(s.id)) || [];
            return {
              ...s,
              module_code: modMap.get(String(s.module_id))?.code || "",
              module_name: modMap.get(String(s.module_id))?.name || "",
              present_count: list.filter((r) => r.status === "present").length,
              absent_count: list.filter((r) => r.status === "absent").length,
              ppe_compliant_count: list.filter((r) => r.ppe_compliant !== false).length,
              total_count: list.length,
            };
          });

        return NextResponse.json(
          { ...base, modules, trainees, sessions, missingTables: [] },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "voc_logbooks") {
        const logRes = await safeStaffQuery<any[]>(
          db
            .from("practical_logbooks")
            .select("*")
            .eq("school_id", ctx.schoolId)
            .order("log_date", { ascending: false })
            .order("created_at", { ascending: false })
        );
        const missingTables: string[] = [];
        if (logRes.missing) missingTables.push("practical_logbooks");

        const logs = (logRes.data || [])
          .filter(
            (l) =>
              modIdSet.has(String(l.module_id)) ||
              traineeIdSet.has(String(l.student_id)) ||
              ctx.isAdmin ||
              ctx.isSuperAdmin
          )
          .map((l) => ({
            ...l,
            student_name: traineeMap.get(String(l.student_id))?.full_name || "Trainee",
            student_number: traineeMap.get(String(l.student_id))?.student_number || "",
            module_code: modMap.get(String(l.module_id))?.code || "",
            module_name: modMap.get(String(l.module_id))?.name || "",
          }));

        return NextResponse.json(
          { ...base, logs, modules, missingTables },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "voc_competencies") {
        const compRes = await safeStaffQuery<any[]>(
          db
            .from("competency_assessments")
            .select("*")
            .eq("school_id", ctx.schoolId)
            .order("assessment_date", { ascending: false })
        );

        const assessments = (compRes.data || [])
          .filter(
            (a) =>
              modIdSet.has(String(a.module_id)) ||
              traineeIdSet.has(String(a.student_id)) ||
              ctx.isAdmin ||
              ctx.isSuperAdmin
          )
          .map((a) => ({
            ...a,
            student_name: traineeMap.get(String(a.student_id))?.full_name || "Trainee",
            student_number: traineeMap.get(String(a.student_id))?.student_number || "",
            module_code: modMap.get(String(a.module_id))?.code || "",
            module_name: modMap.get(String(a.module_id))?.name || "",
          }));

        return NextResponse.json(
          { ...base, modules, trainees, intakes, assessments },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "voc_attachments") {
        const [attRes, repRes] = await Promise.all([
          safeStaffQuery<any[]>(
            db
              .from("industrial_attachments")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("created_at", { ascending: false })
          ),
          safeStaffQuery<any[]>(
            db
              .from("attachment_reports")
              .select("*")
              .eq("school_id", ctx.schoolId)
              .order("week_number", { ascending: false })
          ),
        ]);

        const missingTables: string[] = [];
        if (repRes.missing) missingTables.push("attachment_reports");

        const repsByAtt = new Map<string, any[]>();
        for (const r of repRes.data || []) {
          const aid = String(r.attachment_id);
          if (!repsByAtt.has(aid)) repsByAtt.set(aid, []);
          repsByAtt.get(aid)!.push(r);
        }

        const attachments = (attRes.data || [])
          .filter((a) => traineeIdSet.has(String(a.student_id)) || ctx.isAdmin || ctx.isSuperAdmin)
          .map((a) => ({
            ...a,
            student_name: traineeMap.get(String(a.student_id))?.full_name || "Trainee",
            student_number: traineeMap.get(String(a.student_id))?.student_number || "",
            reports: repsByAtt.get(String(a.id)) || [],
          }));

        return NextResponse.json(
          { ...base, attachments, missingTables },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      if (section === "voc_inventory") {
        const [invRes, reqRes] = await Promise.all([
          safeStaffQuery<any[]>(
            db.from("workshop_inventory").select("*").eq("school_id", ctx.schoolId).order("item_code", { ascending: true })
          ),
          safeStaffQuery<any[]>(
            db.from("workshop_equipment_requests").select("*").eq("school_id", ctx.schoolId).order("created_at", { ascending: false })
          ),
        ]);

        const missingTables: string[] = [];
        if (reqRes.missing) missingTables.push("workshop_equipment_requests");

        const inventory = (invRes.data || []).filter((i) =>
          ctx.department?.id && !ctx.isAdmin && !ctx.isSuperAdmin && i.department_id
            ? String(i.department_id) === String(ctx.department.id)
            : true
        );

        return NextResponse.json(
          { ...base, inventory, requests: reqRes.data || [], missingTables },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/staff/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load staff portal section." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { ctx, errorResponse } = await resolveAcademicStaffContext(req);
  if (errorResponse || !ctx) return errorResponse!;

  const db = createDirectAdminClient() as any;

  try {
    const body = await req.json();
    const action = String(body.action || "").trim();

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    // ----------------------------------------------------------------------
    // 1. Update Own Profile Contact / Bio
    // ----------------------------------------------------------------------
    if (action === "update_profile") {
      if (!ctx.staffId) {
        return NextResponse.json(
          { error: "No staff_profiles row is linked to your account." },
          { status: 400 }
        );
      }
      const phone = String(body.phone || "").trim();
      const bio = String(body.bio || "").trim();
      const nextMeta = { ...(ctx.staffProfile?.metadata || {}), bio };

      const { error: spErr } = await db
        .from("staff_profiles")
        .update({ phone: phone || null, bio: bio || null, metadata: nextMeta, updated_at: new Date().toISOString() })
        .eq("id", ctx.staffId)
        .eq("school_id", ctx.schoolId);

      if (spErr && isMissingColumnError(spErr)) {
        const { error: fallbackErr } = await db
          .from("staff_profiles")
          .update({ phone: phone || null, metadata: nextMeta, updated_at: new Date().toISOString() })
          .eq("id", ctx.staffId)
          .eq("school_id", ctx.schoolId);
        if (fallbackErr) {
          return NextResponse.json({ error: fallbackErr.message }, { status: 400 });
        }
      } else if (spErr) {
        return NextResponse.json({ error: spErr.message }, { status: 400 });
      }

      if (ctx.userId) {
        await db.from("profiles").update({ phone: phone || null }).eq("id", ctx.userId);
      }

      return NextResponse.json({ success: true, message: "Profile details updated." });
    }

    // ----------------------------------------------------------------------
    // 2. Course Syllabi & Workshop Manuals (`course_materials`)
    // ----------------------------------------------------------------------
    if (action === "create_material") {
      const title = String(body.title || "").trim();
      const materialType = String(body.materialType || "lecture_notes").trim();
      const description = String(body.description || "").trim();
      const fileUrl = String(body.fileUrl || "").trim();
      const courseId = body.courseId ? String(body.courseId).trim() : null;
      const moduleId = body.moduleId ? String(body.moduleId).trim() : null;
      const subjectId = body.subjectId ? String(body.subjectId).trim() : null;

      if (!title) {
        return NextResponse.json({ error: "Material title is required." }, { status: 400 });
      }
      if (!courseId && !moduleId && !subjectId) {
        return NextResponse.json({ error: "Select a course, module, or subject." }, { status: 400 });
      }

      const fullPayload: Record<string, any> = {
        school_id: ctx.schoolId,
        course_id: courseId,
        module_id: moduleId,
        subject_id: subjectId,
        uploaded_by: ctx.staffId,
        title,
        material_type: materialType,
        description: description || null,
        file_url: fileUrl || null,
      };

      let { data: created, error: insErr } = await db
        .from("course_materials")
        .insert(fullPayload)
        .select("*")
        .single();

      if (insErr && isMissingColumnError(insErr)) {
        const mappedType = ["syllabus", "lecture_notes", "reading", "lab_guide", "past_paper"].includes(materialType)
          ? materialType
          : "lab_guide";
        const { error: fbErr, data: fbData } = await db
          .from("course_materials")
          .insert({
            school_id: ctx.schoolId,
            course_id: courseId,
            uploaded_by: ctx.staffId,
            title,
            material_type: mappedType,
            description: description || null,
            file_url: fileUrl || null,
          })
          .select("*")
          .single();
        created = fbData;
        insErr = fbErr;
      }

      if (insErr) {
        return NextResponse.json(
          {
            error: isMissingTableError(insErr)
              ? "Run migration 20261124000006 & 20261124000008 in Supabase to create course_materials."
              : insErr.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, record: created, message: "Study material published." });
    }

    if (action === "delete_material") {
      const materialId = String(body.materialId || "").trim();
      if (!materialId) return NextResponse.json({ error: "Material ID is required." }, { status: 400 });
      const { error } = await db
        .from("course_materials")
        .delete()
        .eq("id", materialId)
        .eq("school_id", ctx.schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Material removed." });
    }

    // ----------------------------------------------------------------------
    // 3. Record Live Attendance Session (University, High School, Vocational)
    // ----------------------------------------------------------------------
    if (action === "record_attendance") {
      const sessionDate = String(body.sessionDate || "").trim() || new Date().toISOString().slice(0, 10);
      const topic = String(body.topic || "").trim() || "Class Session";
      const courseId = body.courseId ? String(body.courseId).trim() : null;
      const subjectId = body.subjectId ? String(body.subjectId).trim() : null;
      const programmeId = body.programmeId ? String(body.programmeId).trim() : null;
      const moduleId = body.moduleId ? String(body.moduleId).trim() : null;
      const sessionType = String(
        body.sessionType || (ctx.schoolType === "vocational" ? "workshop" : ctx.schoolType === "university" ? "lecture" : "class")
      );
      const safetyBriefingCompleted = Boolean(body.safetyBriefingCompleted);
      const safetyNotes = String(body.safetyNotes || "").trim() || null;
      const records: Array<{ studentId: string; status: string; remarks?: string; ppeCompliant?: boolean }> =
        Array.isArray(body.records) ? body.records : [];

      if (records.length === 0) {
        return NextResponse.json({ error: "Select at least one student/trainee record." }, { status: 400 });
      }

      const fullSession: Record<string, any> = {
        school_id: ctx.schoolId,
        course_id: courseId,
        subject_id: subjectId,
        programme_id: programmeId,
        module_id: moduleId,
        staff_id: ctx.staffId,
        session_date: sessionDate,
        session_type: sessionType,
        topic,
        safety_briefing_completed: safetyBriefingCompleted,
        safety_notes: safetyNotes,
        status: "completed",
      };

      let { data: sess, error: sessErr } = await db
        .from("attendance_sessions")
        .insert(fullSession)
        .select("*")
        .single();

      if (sessErr && isMissingColumnError(sessErr)) {
        const retrySess = await db
          .from("attendance_sessions")
          .insert({
            school_id: ctx.schoolId,
            session_date: sessionDate,
            session_type: sessionType,
            status: "completed",
          })
          .select("*")
          .single();
        sess = retrySess.data;
        sessErr = retrySess.error;
      }

      if (sessErr || !sess?.id) {
        return NextResponse.json({ error: sessErr?.message || "Failed to create attendance session." }, { status: 400 });
      }

      const fullAttRows = records.map((r) => ({
        school_id: ctx.schoolId,
        session_id: sess.id,
        student_id: r.studentId,
        status: ["present", "absent", "late", "excused"].includes(String(r.status).toLowerCase())
          ? String(r.status).toLowerCase()
          : "present",
        remarks: r.remarks ? String(r.remarks).trim() : null,
        ppe_compliant: r.ppeCompliant !== false,
      }));

      let { error: recErr } = await db.from("attendance_records").insert(fullAttRows);
      if (recErr && isMissingColumnError(recErr)) {
        const baseAttRows = fullAttRows.map(({ school_id, session_id, student_id, status }) => ({
          school_id,
          session_id,
          student_id,
          status,
        }));
        const retryRec = await db.from("attendance_records").insert(baseAttRows);
        recErr = retryRec.error;
      }

      if (recErr) {
        return NextResponse.json({ error: recErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        session: sess,
        message: `Attendance saved for ${records.length} ${ctx.schoolType === "vocational" ? "trainees" : "students"}.`,
      });
    }

    // ----------------------------------------------------------------------
    // 4. High School Conduct Remarks (`student_conduct_records`)
    // ----------------------------------------------------------------------
    if (action === "create_conduct_record") {
      const studentId = String(body.studentId || "").trim();
      const recordType = String(body.recordType || "commendation").trim();
      const conductGrade = String(body.conductGrade || "Good").trim();
      const notes = String(body.notes || "").trim();
      const incidentDate = String(body.incidentDate || "").trim() || new Date().toISOString().slice(0, 10);

      if (!studentId || !notes) {
        return NextResponse.json({ error: "Student and conduct remarks are required." }, { status: 400 });
      }

      const { data: rec, error } = await db
        .from("student_conduct_records")
        .insert({
          school_id: ctx.schoolId,
          student_id: studentId,
          term_id: ctx.activeTerm?.id || null,
          incident_date: incidentDate,
          record_type: recordType,
          conduct_grade: conductGrade,
          notes,
          recorded_by: ctx.fullName,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, record: rec, message: "Conduct record saved." });
    }

    if (action === "delete_conduct_record") {
      const recordId = String(body.recordId || "").trim();
      if (!recordId) return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
      const { error } = await db
        .from("student_conduct_records")
        .delete()
        .eq("id", recordId)
        .eq("school_id", ctx.schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Conduct record removed." });
    }

    // ----------------------------------------------------------------------
    // 5. Assignments / CA / Homework & Grading Submissions
    // ----------------------------------------------------------------------
    if (action === "create_assignment") {
      const title = String(body.title || "").trim();
      const instructions = String(body.instructions || "").trim();
      const dueDate = String(body.dueDate || "").trim() || null;
      const maxScore = Math.max(1, Number(body.maxScore || 100));
      const attachmentUrl = String(body.attachmentUrl || "").trim() || null;
      const courseId = body.courseId ? String(body.courseId).trim() : null;
      const programmeId = body.programmeId ? String(body.programmeId).trim() : null;
      const subjectId = body.subjectId ? String(body.subjectId).trim() : null;
      const assessmentType = String(body.assessmentType || "assignment").trim();
      const weightPercentage = Math.min(100, Math.max(0, Number(body.weightPercentage || 0)));

      if (!title) {
        return NextResponse.json({ error: "Title is required." }, { status: 400 });
      }

      const fullAsg: Record<string, any> = {
        school_id: ctx.schoolId,
        course_id: courseId,
        programme_id: programmeId,
        subject_id: subjectId,
        teacher_id: ctx.staffId,
        term_id: ctx.activeTerm?.id || null,
        title,
        assessment_type: assessmentType,
        weight_percentage: weightPercentage,
        instructions: instructions || null,
        due_date: dueDate,
        max_score: maxScore,
        attachment_url: attachmentUrl,
        status: "published",
      };

      let { data: created, error } = await db
        .from("assignments")
        .insert(fullAsg)
        .select("*")
        .single();

      if (error && isMissingColumnError(error)) {
        const retryAsg = await db
          .from("assignments")
          .insert({
            school_id: ctx.schoolId,
            programme_id: programmeId,
            subject_id: subjectId,
            teacher_id: ctx.staffId,
            term_id: ctx.activeTerm?.id || null,
            title,
            instructions: instructions || null,
            due_date: dueDate,
            max_score: maxScore,
            attachment_url: attachmentUrl,
            status: "published",
          })
          .select("*")
          .single();
        created = retryAsg.data;
        error = retryAsg.error;
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, record: created, message: "Published to students." });
    }

    if (action === "delete_assignment") {
      const assignmentId = String(body.assignmentId || "").trim();
      if (!assignmentId) return NextResponse.json({ error: "Assignment ID is required." }, { status: 400 });
      const { error } = await db
        .from("assignments")
        .delete()
        .eq("id", assignmentId)
        .eq("school_id", ctx.schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Assignment deleted." });
    }

    if (action === "grade_submission") {
      const submissionId = String(body.submissionId || "").trim();
      const score = Number(body.score ?? 0);
      const feedback = String(body.feedback || "").trim() || null;
      if (!submissionId) {
        return NextResponse.json({ error: "Submission ID is required." }, { status: 400 });
      }
      const { data: updated, error } = await db
        .from("assignment_submissions")
        .update({
          score,
          feedback,
          status: "graded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId)
        .eq("school_id", ctx.schoolId)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, record: updated, message: "Submission graded." });
    }

    // ----------------------------------------------------------------------
    // 6. University Exam Grades (`exam_grades`)
    // ----------------------------------------------------------------------
    if (action === "save_exam_grades") {
      const courseId = String(body.courseId || "").trim();
      const publishStatus = body.status === "published" ? "published" : "draft";
      const entries: Array<{ studentId: string; caScore: number; examScore: number; remarks?: string }> =
        Array.isArray(body.entries) ? body.entries : [];

      if (!courseId || entries.length === 0) {
        return NextResponse.json({ error: "Course and student grade entries are required." }, { status: 400 });
      }

      const termId = ctx.activeTerm?.id || null;
      let savedCount = 0;

      for (const entry of entries) {
        if (!entry.studentId) continue;
        const ca = Math.min(100, Math.max(0, Number(entry.caScore || 0)));
        const exam = Math.min(100, Math.max(0, Number(entry.examScore || 0)));
        const total = Number(Math.min(100, ca + exam).toFixed(2));
        const { letter, point } = computeUniversityGrade(total);

        let existingQ = db
          .from("exam_grades")
          .select("id")
          .eq("school_id", ctx.schoolId)
          .eq("student_id", entry.studentId)
          .eq("course_id", courseId);
        existingQ = termId ? existingQ.eq("term_id", termId) : existingQ.is("term_id", null);
        const { data: existing } = await existingQ.maybeSingle();

        const payload = {
          school_id: ctx.schoolId,
          student_id: entry.studentId,
          course_id: courseId,
          term_id: termId,
          ca_score: ca,
          exam_score: exam,
          total_score: total,
          grade_letter: letter,
          grade_point: point,
          remarks: entry.remarks ? String(entry.remarks).trim() : null,
          status: publishStatus,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await db.from("exam_grades").update(payload).eq("id", existing.id);
          if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        } else {
          const { error } = await db.from("exam_grades").insert(payload);
          if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        }
        savedCount++;
      }

      return NextResponse.json({
        success: true,
        message:
          publishStatus === "published"
            ? `Published ${savedCount} grade(s) to student transcripts.`
            : `Saved ${savedCount} draft grade(s).`,
      });
    }

    // ----------------------------------------------------------------------
    // 7. High School Term Report Card Scores (`report_card_scores`)
    // ----------------------------------------------------------------------
    if (action === "save_report_card_scores") {
      const programmeId = body.programmeId ? String(body.programmeId).trim() : null;
      const subjectId = String(body.subjectId || "").trim();
      const entries: Array<{ studentId: string; caScore: number; examScore: number; teacherRemarks?: string }> =
        Array.isArray(body.entries) ? body.entries : [];

      if (!subjectId || entries.length === 0) {
        return NextResponse.json({ error: "Subject and student score entries are required." }, { status: 400 });
      }

      const termId = ctx.activeTerm?.id || null;
      let savedCount = 0;

      for (const entry of entries) {
        if (!entry.studentId) continue;
        const ca = Math.min(100, Math.max(0, Number(entry.caScore || 0)));
        const exam = Math.min(100, Math.max(0, Number(entry.examScore || 0)));
        const total = Number(Math.min(100, ca + exam).toFixed(2));
        const grade = computeWaecGrade(total);

        let existingQ = db
          .from("report_card_scores")
          .select("id")
          .eq("school_id", ctx.schoolId)
          .eq("student_id", entry.studentId)
          .eq("subject_id", subjectId);
        existingQ = termId ? existingQ.eq("term_id", termId) : existingQ.is("term_id", null);
        const { data: existing } = await existingQ.maybeSingle();

        const payload = {
          school_id: ctx.schoolId,
          student_id: entry.studentId,
          programme_id: programmeId,
          subject_id: subjectId,
          term_id: termId,
          ca_score: ca,
          exam_score: exam,
          total_score: total,
          grade,
          teacher_remarks: entry.teacherRemarks ? String(entry.teacherRemarks).trim() : null,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await db.from("report_card_scores").update(payload).eq("id", existing.id);
          if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        } else {
          const { error } = await db.from("report_card_scores").insert(payload);
          if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        }
        savedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Saved ${savedCount} term report card score(s).`,
      });
    }

    // ----------------------------------------------------------------------
    // 8. University Advising Notes (`student_advising_notes`)
    // ----------------------------------------------------------------------
    if (action === "create_advising_note") {
      const studentId = String(body.studentId || "").trim();
      const topic = String(body.topic || "").trim();
      const notes = String(body.notes || "").trim();
      const advisingType = String(body.advisingType || "academic").trim();
      const sessionDate = String(body.sessionDate || "").trim() || new Date().toISOString().slice(0, 10);
      const actionItems = String(body.actionItems || "").trim() || null;
      const followUpDate = String(body.followUpDate || "").trim() || null;

      if (!studentId || !topic || !notes) {
        return NextResponse.json({ error: "Student, topic, and advising notes are required." }, { status: 400 });
      }

      const { data: created, error } = await db
        .from("student_advising_notes")
        .insert({
          school_id: ctx.schoolId,
          student_id: studentId,
          staff_id: ctx.staffId,
          advisor_name: ctx.fullName,
          session_date: sessionDate,
          advising_type: advisingType,
          topic,
          notes,
          action_items: actionItems,
          follow_up_date: followUpDate,
          status: "open",
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, record: created, message: "Advising note recorded." });
    }

    if (action === "update_advising_note") {
      const noteId = String(body.noteId || "").trim();
      const status = body.status === "resolved" ? "resolved" : "open";
      if (!noteId) return NextResponse.json({ error: "Note ID is required." }, { status: 400 });
      const { error } = await db
        .from("student_advising_notes")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("school_id", ctx.schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: `Advising case marked ${status}.` });
    }

    if (action === "delete_advising_note") {
      const noteId = String(body.noteId || "").trim();
      if (!noteId) return NextResponse.json({ error: "Note ID is required." }, { status: 400 });
      const { error } = await db
        .from("student_advising_notes")
        .delete()
        .eq("id", noteId)
        .eq("school_id", ctx.schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Advising note deleted." });
    }

    // ----------------------------------------------------------------------
    // 9. High School Parent Messages (`parent_teacher_messages`)
    // ----------------------------------------------------------------------
    if (action === "send_parent_message") {
      const parentGuardianId = String(body.parentGuardianId || "").trim();
      const studentId = body.studentId ? String(body.studentId).trim() : null;
      const category = String(body.category || "academic").trim();
      const subject = String(body.subject || "").trim();
      const msgBody = String(body.body || "").trim();

      if (!parentGuardianId || !subject || !msgBody) {
        return NextResponse.json({ error: "Parent contact, subject, and message are required." }, { status: 400 });
      }

      const { data: created, error } = await db
        .from("parent_teacher_messages")
        .insert({
          school_id: ctx.schoolId,
          parent_guardian_id: parentGuardianId,
          student_id: studentId,
          staff_id: ctx.staffId,
          sender_role: "teacher",
          sender_name: ctx.fullName,
          category,
          subject,
          body: msgBody,
          is_read: false,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, record: created, message: "Notice sent to parent/guardian." });
    }

    // ----------------------------------------------------------------------
    // 10. Vocational Logbook Sign-Off (`practical_logbooks`)
    // ----------------------------------------------------------------------
    if (action === "review_logbook") {
      const entryId = String(body.entryId || "").trim();
      const status = body.status === "needs_revision" ? "needs_revision" : "signed_off";
      const instructorFeedback = String(body.instructorFeedback || "").trim() || null;

      if (!entryId) return NextResponse.json({ error: "Logbook entry ID is required." }, { status: 400 });

      const { data: updated, error } = await db
        .from("practical_logbooks")
        .update({
          status,
          instructor_feedback: instructorFeedback,
          signed_off_by: status === "signed_off" ? ctx.staffId : null,
          signed_off_at: status === "signed_off" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId)
        .eq("school_id", ctx.schoolId)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({
        success: true,
        record: updated,
        message: status === "signed_off" ? "Logbook entry signed off." : "Returned to trainee for revision.",
      });
    }

    // ----------------------------------------------------------------------
    // 11. Vocational Competency Assessment (`competency_assessments`)
    // ----------------------------------------------------------------------
    if (action === "save_competency_assessment") {
      const studentId = String(body.studentId || "").trim();
      const moduleId = String(body.moduleId || "").trim();
      const intakeId = body.intakeId ? String(body.intakeId).trim() : null;
      const assessmentDate = String(body.assessmentDate || "").trim() || new Date().toISOString().slice(0, 10);
      const practicalScore = Math.min(100, Math.max(0, Number(body.practicalScore || 0)));
      const verdict = ["competent", "not_yet_competent", "in_progress"].includes(String(body.verdict))
        ? String(body.verdict)
        : practicalScore >= 60
        ? "competent"
        : "not_yet_competent";
      const assessorNotes = String(body.assessorNotes || "").trim() || null;

      if (!studentId || !moduleId) {
        return NextResponse.json({ error: "Trainee and trade module are required." }, { status: 400 });
      }

      const { data: existing } = await db
        .from("competency_assessments")
        .select("id")
        .eq("school_id", ctx.schoolId)
        .eq("student_id", studentId)
        .eq("module_id", moduleId)
        .maybeSingle();

      const payload = {
        school_id: ctx.schoolId,
        student_id: studentId,
        module_id: moduleId,
        intake_id: intakeId,
        instructor_id: ctx.staffId,
        assessment_date: assessmentDate,
        practical_score: practicalScore,
        verdict,
        assessor_notes: assessorNotes,
        updated_at: new Date().toISOString(),
      };

      const { error } = existing?.id
        ? await db.from("competency_assessments").update(payload).eq("id", existing.id)
        : await db.from("competency_assessments").insert(payload);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Competency verdict recorded." });
    }

    // ----------------------------------------------------------------------
    // 12. Vocational Industrial Attachment Review & Evaluation
    // ----------------------------------------------------------------------
    if (action === "review_attachment_report") {
      const reportId = String(body.reportId || "").trim();
      const status = body.status === "approved" ? "approved" : "reviewed";
      const supervisorRemarks = String(body.supervisorRemarks || "").trim() || null;
      if (!reportId) return NextResponse.json({ error: "Report ID is required." }, { status: 400 });

      const { error } = await db
        .from("attachment_reports")
        .update({ status, supervisor_remarks: supervisorRemarks, updated_at: new Date().toISOString() })
        .eq("id", reportId)
        .eq("school_id", ctx.schoolId);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: `Weekly report marked ${status}.` });
    }

    if (action === "evaluate_attachment") {
      const attachmentId = String(body.attachmentId || "").trim();
      const supervisorScore = Math.min(100, Math.max(0, Number(body.supervisorScore ?? 0)));
      const evaluationNotes = String(body.evaluationNotes || "").trim() || null;
      const status = ["pending", "placed", "completed", "terminated"].includes(String(body.status))
        ? String(body.status)
        : "completed";

      if (!attachmentId) return NextResponse.json({ error: "Attachment ID is required." }, { status: 400 });

      let { error } = await db
        .from("industrial_attachments")
        .update({
          supervisor_score: supervisorScore,
          instructor_id: ctx.staffId,
          evaluated_at: new Date().toISOString(),
          evaluation_notes: evaluationNotes,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attachmentId)
        .eq("school_id", ctx.schoolId);

      if (error && isMissingColumnError(error)) {
        const retry = await db
          .from("industrial_attachments")
          .update({
            evaluation_notes: `Score: ${supervisorScore}% — ${evaluationNotes || ""}`.trim(),
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", attachmentId)
          .eq("school_id", ctx.schoolId);
        error = retry.error;
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Industrial attachment evaluation saved." });
    }

    // ----------------------------------------------------------------------
    // 13. Vocational Equipment & Material Requests (`workshop_equipment_requests`)
    // ----------------------------------------------------------------------
    if (action === "create_equipment_request") {
      const requestType = String(body.requestType || "tool_request").trim();
      const itemName = String(body.itemName || "").trim();
      const quantity = Math.max(1, Number(body.quantity || 1));
      const urgency = String(body.urgency || "normal").trim();
      const description = String(body.description || "").trim();
      const inventoryId = body.inventoryId ? String(body.inventoryId).trim() : null;

      if (!itemName || !description) {
        return NextResponse.json({ error: "Item name and description are required." }, { status: 400 });
      }

      const { data: created, error } = await db
        .from("workshop_equipment_requests")
        .insert({
          school_id: ctx.schoolId,
          department_id: ctx.department?.id || null,
          inventory_id: inventoryId,
          staff_id: ctx.staffId,
          requested_by_name: ctx.fullName,
          request_type: requestType,
          item_name: itemName,
          quantity,
          urgency,
          description,
          status: "pending",
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, record: created, message: "Workshop request submitted." });
    }

    if (action === "delete_equipment_request") {
      const requestId = String(body.requestId || "").trim();
      if (!requestId) return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
      const { error } = await db
        .from("workshop_equipment_requests")
        .delete()
        .eq("id", requestId)
        .eq("school_id", ctx.schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, message: "Request cancelled." });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/staff/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to execute staff portal action." },
      { status: 500 }
    );
  }
}
