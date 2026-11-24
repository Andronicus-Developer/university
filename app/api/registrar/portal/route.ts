import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  isMissingTableOrColumnError,
  resolveRegistrarPortalContext,
  safeRegistrarQuery,
} from "@/lib/registrar/registrar-context";
import { resolveLearnerEntityType } from "@/lib/id-numbering/config";
import {
  generateNextSchoolId,
  getSchoolIdSequences,
} from "@/lib/id-numbering/service";

function fullNameOf(row: any): string {
  const full = `${row?.first_name || ""} ${row?.last_name || ""}`.trim();
  return full || row?.student_number || "Student";
}

function defaultIdPrefix(schoolType: string) {
  if (schoolType === "vocational") return "VOC";
  if (schoolType === "high_school") return "HS";
  return "MAT";
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveRegistrarPortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const section = req.nextUrl.searchParams.get("section") || "dashboard";
    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;

    const baseInfo = {
      school: {
        id: schoolId,
        name: ctx.schoolName,
        school_type: ctx.schoolType,
        currency: ctx.currency,
        logo_url: ctx.schoolLogo,
      },
      missingTables: [] as string[],
    };

    const [yearsRes, termsRes, progsRes, deptsRes, classesRes, intakesRes] =
      await Promise.all([
        safeRegistrarQuery(
          db
            .from("academic_years")
            .select("id, code, name, start_date, end_date, is_current")
            .eq("school_id", schoolId)
            .order("start_date", { ascending: false })
        ),
        safeRegistrarQuery(
          db
            .from("terms")
            .select(
              "id, academic_year_id, term_number, name, code, start_date, end_date, is_active, is_current, registration_open_date, registration_deadline, exam_start_date, exam_end_date"
            )
            .eq("school_id", schoolId)
            .order("term_number", { ascending: true })
        ),
        safeRegistrarQuery(
          db.from("programmes").select("id, code, name, degree_level").eq("school_id", schoolId).order("name")
        ),
        safeRegistrarQuery(
          db.from("departments").select("id, code, name").eq("school_id", schoolId).order("name")
        ),
        safeRegistrarQuery(
          db.from("class_groups").select("id, name, grade_level, academic_year_id").eq("school_id", schoolId).order("name")
        ),
        safeRegistrarQuery(
          db
            .from("vocational_intakes")
            .select("id, department_id, name, code, start_date, end_date, capacity, status")
            .eq("school_id", schoolId)
            .order("start_date", { ascending: false })
        ),
      ]);

    const academicYears = yearsRes.data || [];
    const terms = termsRes.data || [];
    const programmes = progsRes.data || [];
    const departments = deptsRes.data || [];
    const classGroups = classesRes.data || [];
    const intakes = intakesRes.data || [];

    const activeYear = academicYears.find((y: any) => y.is_current) || academicYears[0] || null;
    const activeTerm = terms.find((t: any) => t.is_current || t.is_active) || terms[0] || null;

    const progMap = new Map(programmes.map((p: any) => [String(p.id), p.name]));
    const deptMap = new Map(departments.map((d: any) => [String(d.id), d.name]));
    const classMap = new Map(classGroups.map((c: any) => [String(c.id), c.name]));
    const intakeMap = new Map(intakes.map((i: any) => [String(i.id), i.name]));

    if (section === "dashboard") {
      const [studentsRes, appsRes, enrolsRes, clearRes] = await Promise.all([
        safeRegistrarQuery(
          db.from("students").select("id, status").eq("school_id", schoolId)
        ),
        safeRegistrarQuery(
          db
            .from("admissions_applications")
            .select(
              "id, application_number, first_name, last_name, email, phone, gender, programme_id, department_id, class_group_id, intake_id, target_level, entry_term_id, status, created_at"
            )
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        ),
        safeRegistrarQuery(
          db
            .from("course_enrolments")
            .select("id, status")
            .eq("school_id", schoolId)
            .eq("status", "pending")
        ),
        safeRegistrarQuery(
          db
            .from("graduation_clearances")
            .select("id, overall_status")
            .eq("school_id", schoolId)
        ),
      ]);

      const missingTables: string[] = [];
      if (appsRes.missing) missingTables.push("admissions_applications");
      if (clearRes.missing) missingTables.push("graduation_clearances");

      const students = studentsRes.data || [];
      const activeStudents = students.filter((s: any) => s.status === "active").length;
      const apps = appsRes.data || [];
      const pendingApps = apps.filter((a: any) =>
        ["submitted", "under_review", "approved"].includes(String(a.status || ""))
      );
      const pendingEnrols = (enrolsRes.data || []).length;
      const clearances = clearRes.data || [];
      const candidates = clearances.filter((c: any) =>
        ["pending", "cleared"].includes(String(c.overall_status || ""))
      ).length;

      return NextResponse.json({
        ...baseInfo,
        missingTables,
        activeYear,
        activeTerm,
        kpis: {
          totalEnrolled: activeStudents,
          totalRegistry: students.length,
          pendingAdmissionsAndReg: pendingApps.length + pendingEnrols,
          activeSessionLabel: activeTerm
            ? `${activeYear?.name ? `${activeYear.name} • ` : ""}${activeTerm.name}`
            : activeYear?.name || "Not Configured",
          clearanceCandidates: candidates,
        },
        recentApplications: pendingApps.slice(0, 6).map((a: any) => ({
          ...a,
          full_name: `${a.first_name || ""} ${a.last_name || ""}`.trim(),
          unit_name:
            (a.class_group_id ? classMap.get(String(a.class_group_id)) : null) ||
            (a.programme_id ? progMap.get(String(a.programme_id)) : null) ||
            (a.intake_id ? intakeMap.get(String(a.intake_id)) : null) ||
            (a.department_id ? deptMap.get(String(a.department_id)) : null) ||
            "Unassigned",
        })),
      });
    }

    if (section === "admissions") {
      const [appsRes, nextIdInfo] = await Promise.all([
        safeRegistrarQuery(
          db
            .from("admissions_applications")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        ),
        getSchoolIdSequences(schoolId, ctx.schoolType).catch(() => null),
      ]);
      const missingTables = appsRes.missing ? ["admissions_applications"] : [];
      const applications = (appsRes.data || []).map((a: any) => ({
        ...a,
        full_name: `${a.first_name || ""} ${a.last_name || ""}`.trim(),
        unit_name:
          (a.class_group_id ? classMap.get(String(a.class_group_id)) : null) ||
          (a.programme_id ? progMap.get(String(a.programme_id)) : null) ||
          (a.intake_id ? intakeMap.get(String(a.intake_id)) : null) ||
          (a.department_id ? deptMap.get(String(a.department_id)) : null) ||
          "Unassigned",
      }));

      return NextResponse.json({
        ...baseInfo,
        missingTables,
        nextStudentIdPreview:
          nextIdInfo?.previewMap?.[resolveLearnerEntityType(ctx.schoolType)] ||
          null,
        applications,
        programmes,
        departments,
        classGroups,
        intakes,
        terms,
      });
    }

    if (section === "students") {
      const [{ data: studentRows }, nextIdInfo] = await Promise.all([
        safeRegistrarQuery(
          db
            .from("students")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        ),
        getSchoolIdSequences(schoolId, ctx.schoolType).catch(() => null),
      ]);

      const students = (studentRows || []).map((s: any) => ({
        ...s,
        full_name: fullNameOf(s),
        programme_name: s.programme_id ? progMap.get(String(s.programme_id)) || null : null,
        department_name: s.department_id ? deptMap.get(String(s.department_id)) || null : null,
        class_group_name: s.class_group_id ? classMap.get(String(s.class_group_id)) || null : null,
        intake_name: s.intake_id ? intakeMap.get(String(s.intake_id)) || null : null,
      }));

      return NextResponse.json({
        ...baseInfo,
        nextStudentIdPreview:
          nextIdInfo?.previewMap?.[resolveLearnerEntityType(ctx.schoolType)] ||
          null,
        students,
        programmes,
        departments,
        classGroups,
        intakes,
      });
    }

    if (section === "registrations") {
      const [studentsRes, coursesRes, enrolRes, subjectsRes, modulesRes] =
        await Promise.all([
          safeRegistrarQuery(
            db
              .from("students")
              .select("id, student_number, first_name, last_name, status, programme_id, class_group_id, intake_id, department_id")
              .eq("school_id", schoolId)
              .order("first_name")
          ),
          safeRegistrarQuery(
            db.from("courses").select("id, code, name, credits, semester_number").eq("school_id", schoolId).order("code")
          ),
          safeRegistrarQuery(
            db
              .from("course_enrolments")
              .select("*")
              .eq("school_id", schoolId)
              .order("created_at", { ascending: false })
          ),
          safeRegistrarQuery(
            db.from("subjects").select("id, code, name, category, programme_id").eq("school_id", schoolId).order("name")
          ),
          safeRegistrarQuery(
            db.from("vocational_modules").select("id, code, name, department_id, practical_hours, theory_hours").eq("school_id", schoolId).order("code")
          ),
        ]);

      const students = (studentsRes.data || []).map((s: any) => ({
        ...s,
        full_name: fullNameOf(s),
        class_group_name: s.class_group_id ? classMap.get(String(s.class_group_id)) || null : null,
        programme_name: s.programme_id ? progMap.get(String(s.programme_id)) || null : null,
        intake_name: s.intake_id ? intakeMap.get(String(s.intake_id)) || null : null,
      }));
      const sMap = new Map<string, any>(students.map((s: any) => [String(s.id), s]));
      const cMap = new Map<string, any>((coursesRes.data || []).map((c: any) => [String(c.id), c]));
      const tMap = new Map<string, string>(terms.map((t: any) => [String(t.id), String(t.name || "Term")]));

      const courseEnrolments = (enrolRes.data || []).map((e: any) => {
        const st = sMap.get(String(e.student_id));
        const cr = cMap.get(String(e.course_id));
        return {
          ...e,
          student_name: st?.full_name || "Student",
          student_number: st?.student_number || "N/A",
          course_code: cr?.code || "",
          course_name: cr?.name || "Course",
          credits: cr?.credits || 3,
          term_name: e.term_id ? tMap.get(String(e.term_id)) || "Term" : "Current",
        };
      });

      const subjects = (subjectsRes.data || []).map((sub: any) => ({
        ...sub,
        programme_name: sub.programme_id ? progMap.get(String(sub.programme_id)) || "All Streams" : "All Streams",
      }));

      const modules = (modulesRes.data || []).map((mod: any) => ({
        ...mod,
        department_name: mod.department_id ? deptMap.get(String(mod.department_id)) || "Trade Unit" : "Trade Unit",
      }));

      return NextResponse.json({
        ...baseInfo,
        students,
        courses: coursesRes.data || [],
        courseEnrolments,
        subjects,
        modules,
        programmes,
        classGroups,
        intakes,
        terms,
        academicYears,
      });
    }

    if (section === "calendar") {
      return NextResponse.json({
        ...baseInfo,
        academicYears,
        terms,
        intakes,
        departments,
      });
    }

    if (section === "transcripts") {
      const requestedStudentId = req.nextUrl.searchParams.get("studentId") || "";
      const { data: studentRows } = await safeRegistrarQuery(
        db
          .from("students")
          .select("*")
          .eq("school_id", schoolId)
          .order("first_name", { ascending: true })
      );

      const students = (studentRows || []).map((s: any) => ({
        ...s,
        full_name: fullNameOf(s),
        programme_name: s.programme_id ? progMap.get(String(s.programme_id)) || null : null,
        department_name: s.department_id ? deptMap.get(String(s.department_id)) || null : null,
        class_group_name: s.class_group_id ? classMap.get(String(s.class_group_id)) || null : null,
        intake_name: s.intake_id ? intakeMap.get(String(s.intake_id)) || null : null,
      }));

      const selectedStudent =
        students.find((s: any) => s.id === requestedStudentId) || students[0] || null;

      let uniGrades: any[] = [];
      let hsScores: any[] = [];
      let vocCompetencies: any[] = [];
      let certifications: any[] = [];

      if (selectedStudent) {
        const termMap = new Map(terms.map((t: any) => [String(t.id), t.name]));
        const [uRes, hRes, vRes, cRes] = await Promise.all([
          safeRegistrarQuery(
            db
              .from("exam_grades")
              .select("*, courses:course_id(code, name, credits)")
              .eq("school_id", schoolId)
              .eq("student_id", selectedStudent.id)
          ),
          safeRegistrarQuery(
            db
              .from("report_card_scores")
              .select("*, subjects:subject_id(code, name)")
              .eq("school_id", schoolId)
              .eq("student_id", selectedStudent.id)
          ),
          safeRegistrarQuery(
            db
              .from("competency_assessments")
              .select("*, vocational_modules:module_id(code, name)")
              .eq("school_id", schoolId)
              .eq("student_id", selectedStudent.id)
          ),
          safeRegistrarQuery(
            db
              .from("trade_certifications")
              .select("*")
              .eq("school_id", schoolId)
              .eq("student_id", selectedStudent.id)
              .order("issue_date", { ascending: false })
          ),
        ]);

        uniGrades = (uRes.data || []).map((g: any) => ({
          ...g,
          course_code: g.courses?.code || "",
          course_name: g.courses?.name || "Course",
          credits: Number(g.courses?.credits || 3),
          term_name: g.term_id ? termMap.get(String(g.term_id)) || "Term" : "Semester",
        }));

        hsScores = (hRes.data || []).map((r: any) => ({
          ...r,
          subject_code: r.subjects?.code || "",
          subject_name: r.subjects?.name || "Subject",
          term_name: r.term_id ? termMap.get(String(r.term_id)) || "Term" : "Term",
        }));

        vocCompetencies = (vRes.data || []).map((c: any) => ({
          ...c,
          module_code: c.vocational_modules?.code || "",
          module_name: c.vocational_modules?.name || "Trade Module",
        }));

        certifications = cRes.data || [];
      }

      return NextResponse.json({
        ...baseInfo,
        students,
        selectedStudent,
        uniGrades,
        hsScores,
        vocCompetencies,
        certifications,
      });
    }

    if (section === "clearance") {
      const [clearRes, studentsRes, invRes] = await Promise.all([
        safeRegistrarQuery(
          db
            .from("graduation_clearances")
            .select("*")
            .eq("school_id", schoolId)
            .order("updated_at", { ascending: false })
        ),
        safeRegistrarQuery(
          db
            .from("students")
            .select("id, student_number, first_name, last_name, status, programme_id, class_group_id, intake_id")
            .eq("school_id", schoolId)
            .order("first_name")
        ),
        safeRegistrarQuery(
          db.from("invoices").select("student_id, balance").eq("school_id", schoolId)
        ),
      ]);

      const missingTables = clearRes.missing ? ["graduation_clearances"] : [];
      const balMap = new Map<string, number>();
      for (const inv of invRes.data || []) {
        const sid = String(inv.student_id);
        balMap.set(sid, (balMap.get(sid) || 0) + Math.max(0, Number(inv.balance || 0)));
      }

      const students = (studentsRes.data || []).map((s: any) => ({
        ...s,
        full_name: fullNameOf(s),
        fee_balance: balMap.get(String(s.id)) || 0,
      }));
      const sMap = new Map<string, any>(students.map((s: any) => [String(s.id), s]));

      const clearances = (clearRes.data || []).map((c: any) => {
        const st = sMap.get(String(c.student_id));
        return {
          ...c,
          student_name: st?.full_name || "Student",
          student_number: st?.student_number || "N/A",
          fee_balance: st?.fee_balance ?? 0,
        };
      });

      return NextResponse.json({
        ...baseInfo,
        missingTables,
        clearances,
        students,
        academicYears,
      });
    }

    if (section === "profile") {
      return NextResponse.json({
        ...baseInfo,
        profile: {
          full_name: ctx.fullName,
          email: ctx.email,
          phone: ctx.staffProfile?.phone || "",
          designation: ctx.staffProfile?.designation || "Academic Registrar",
        },
      });
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/registrar/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveRegistrarPortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;

    if (action === "create_application") {
      const firstName = String(body?.firstName || "").trim();
      const lastName = String(body?.lastName || "").trim();
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: "Applicant first and last name are required." },
          { status: 400 }
        );
      }
      const appNo = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await db
        .from("admissions_applications")
        .insert({
          school_id: schoolId,
          application_number: appNo,
          first_name: firstName,
          last_name: lastName,
          email: body?.email ? String(body.email).trim().toLowerCase() : null,
          phone: body?.phone ? String(body.phone).trim() : null,
          gender: body?.gender || null,
          guardian_name: body?.guardianName ? String(body.guardianName).trim() : null,
          guardian_phone: body?.guardianPhone ? String(body.guardianPhone).trim() : null,
          programme_id: body?.programmeId || null,
          department_id: body?.departmentId || null,
          class_group_id: body?.classGroupId || null,
          intake_id: body?.intakeId || null,
          previous_school: body?.previousSchool ? String(body.previousSchool).trim() : null,
          notes: body?.notes ? String(body.notes).trim() : null,
          status: "submitted",
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, application: data });
    }

    if (action === "update_application_status") {
      const id = String(body?.applicationId || "");
      const status = String(body?.status || "under_review");
      const { error } = await db
        .from("admissions_applications")
        .update({
          status,
          review_notes: body?.reviewNotes ? String(body.reviewNotes).trim() : null,
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "approve_and_enroll") {
      let firstName = String(body?.firstName || "").trim();
      let lastName = String(body?.lastName || "").trim();
      let email = body?.email ? String(body.email).trim().toLowerCase() : "";
      let phone = body?.phone ? String(body.phone).trim() : null;
      let gender = body?.gender || null;
      let programmeId = body?.programmeId || null;
      let departmentId = body?.departmentId || null;
      let classGroupId = body?.classGroupId || null;
      let intakeId = body?.intakeId || null;
      const applicationId = body?.applicationId ? String(body.applicationId) : null;

      if (applicationId) {
        const { data: appRow } = await db
          .from("admissions_applications")
          .select("*")
          .eq("id", applicationId)
          .eq("school_id", schoolId)
          .maybeSingle();
        if (appRow) {
          firstName = firstName || appRow.first_name;
          lastName = lastName || appRow.last_name;
          email = email || (appRow.email ? String(appRow.email).toLowerCase() : "");
          phone = phone || appRow.phone || null;
          gender = gender || appRow.gender || null;
          programmeId = programmeId || appRow.programme_id || null;
          departmentId = departmentId || appRow.department_id || null;
          classGroupId = classGroupId || appRow.class_group_id || null;
          intakeId = intakeId || appRow.intake_id || null;
        }
      }

      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: "First name and last name are required to enroll." },
          { status: 400 }
        );
      }

      const manualNumber = String(body?.studentNumber || "").trim().toUpperCase();
      let studentNumber = manualNumber;

      if (studentNumber) {
        const { data: existingStu } = await db
          .from("students")
          .select("id")
          .eq("school_id", schoolId)
          .eq("student_number", studentNumber)
          .maybeSingle();
        if (existingStu?.id) {
          return NextResponse.json(
            {
              error: `ID "${studentNumber}" is already assigned to another student in this school.`,
            },
            { status: 400 }
          );
        }
      } else {
        studentNumber = await generateNextSchoolId(
          schoolId,
          resolveLearnerEntityType(ctx.schoolType),
          { checkTable: "students", idColumn: "student_number" }
        );
      }

      let profileId: string | null = null;
      const tempPassword = String(body?.loginPassword || "").trim();

      if (email && body?.createLoginAccount) {
        const pw = tempPassword.length >= 8 ? tempPassword : `Sch@${Math.random().toString(36).slice(2, 10)}`;
        const { data: createdAuth, error: authErr } = await db.auth.admin.createUser({
          email,
          password: pw,
          email_confirm: true,
          user_metadata: {
            full_name: `${firstName} ${lastName}`,
            role: "student",
            school_id: schoolId,
          },
          app_metadata: {
            role: "student",
            school_id: schoolId,
          },
        });
        if (!authErr && createdAuth?.user?.id) {
          profileId = createdAuth.user.id;
          await db.from("profiles").upsert({
            id: profileId,
            email,
            full_name: `${firstName} ${lastName}`,
            phone,
            role: "student",
            school_id: schoolId,
            account_status: "active",
          });
          await db.from("school_memberships").insert({
            school_id: schoolId,
            user_id: profileId,
            role: "student",
            status: "active",
          });
        }
      }

      const { data: studentRow, error: stuErr } = await db
        .from("students")
        .insert({
          school_id: schoolId,
          profile_id: profileId,
          student_number: studentNumber,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone,
          gender,
          programme_id: programmeId,
          department_id: departmentId,
          class_group_id: classGroupId,
          intake_id: intakeId,
          current_level: body?.currentLevel ? Number(body.currentLevel) : 100,
          status: "active",
          enrolled_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (stuErr) return NextResponse.json({ error: stuErr.message }, { status: 400 });

      if (applicationId) {
        await db
          .from("admissions_applications")
          .update({
            status: "enrolled",
            enrolled_student_id: studentRow.id,
            reviewed_by: ctx.userId,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId)
          .eq("school_id", schoolId);
      }

      return NextResponse.json({ ok: true, student: studentRow });
    }

    if (action === "update_student_record") {
      const id = String(body?.studentId || "");
      if (!id) return NextResponse.json({ error: "studentId required" }, { status: 400 });

      const { data, error } = await db
        .from("students")
        .update({
          first_name: String(body?.firstName || "").trim(),
          last_name: String(body?.lastName || "").trim(),
          student_number: String(body?.studentNumber || "").trim(),
          email: body?.email ? String(body.email).trim() : null,
          phone: body?.phone ? String(body.phone).trim() : null,
          status: String(body?.status || "active"),
          programme_id: body?.programmeId || null,
          department_id: body?.departmentId || null,
          class_group_id: body?.classGroupId || null,
          intake_id: body?.intakeId || null,
          current_level: body?.currentLevel ? Number(body.currentLevel) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, student: data });
    }

    if (action === "approve_course_enrolment") {
      const id = String(body?.enrolmentId || "");
      const { error } = await db
        .from("course_enrolments")
        .update({ status: String(body?.status || "registered"), updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "drop_course_enrolment") {
      const id = String(body?.enrolmentId || "");
      const { error } = await db
        .from("course_enrolments")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "create_course_enrolment") {
      const studentId = String(body?.studentId || "");
      const courseId = String(body?.courseId || "");
      if (!studentId || !courseId) {
        return NextResponse.json({ error: "Student and course are required." }, { status: 400 });
      }
      const { data, error } = await db
        .from("course_enrolments")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          course_id: courseId,
          term_id: body?.termId || null,
          academic_year_id: body?.academicYearId || null,
          status: "registered",
          registered_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, enrolment: data });
    }

    if (action === "assign_student_intake") {
      const studentId = String(body?.studentId || "");
      const { error } = await db
        .from("students")
        .update({
          intake_id: body?.intakeId || null,
          class_group_id: body?.classGroupId || null,
          programme_id: body?.programmeId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_academic_year") {
      const name = String(body?.name || "").trim();
      const code = String(body?.code || name).trim();
      if (!name) return NextResponse.json({ error: "Academic year name required." }, { status: 400 });
      const { data, error } = await db
        .from("academic_years")
        .insert({
          school_id: schoolId,
          name,
          code,
          start_date: body?.startDate || null,
          end_date: body?.endDate || null,
          is_current: Boolean(body?.isCurrent),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, year: data });
    }

    if (action === "set_current_academic_year") {
      const id = String(body?.id || "");
      await db.from("academic_years").update({ is_current: false }).eq("school_id", schoolId);
      const { error } = await db
        .from("academic_years")
        .update({ is_current: true })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_term") {
      const name = String(body?.name || "").trim();
      const code = String(body?.code || name).trim();
      if (!name) return NextResponse.json({ error: "Term/Semester name required." }, { status: 400 });

      let { data, error } = await db
        .from("terms")
        .insert({
          school_id: schoolId,
          academic_year_id: body?.academicYearId || null,
          name,
          code,
          term_number: Number(body?.termNumber || 1),
          start_date: body?.startDate || null,
          end_date: body?.endDate || null,
          registration_open_date: body?.registrationOpenDate || null,
          registration_deadline: body?.registrationDeadline || null,
          is_current: Boolean(body?.isCurrent),
          is_active: true,
        })
        .select("*")
        .single();

      if (error && isMissingTableOrColumnError(error)) {
        const fb = await db
          .from("terms")
          .insert({
            school_id: schoolId,
            academic_year_id: body?.academicYearId || null,
            name,
            code,
            term_number: Number(body?.termNumber || 1),
            start_date: body?.startDate || null,
            end_date: body?.endDate || null,
            is_current: Boolean(body?.isCurrent),
            is_active: true,
          })
          .select("*")
          .single();
        data = fb.data;
        error = fb.error;
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, term: data });
    }

    if (action === "set_current_term") {
      const id = String(body?.id || "");
      await db.from("terms").update({ is_current: false }).eq("school_id", schoolId);
      const { error } = await db
        .from("terms")
        .update({ is_current: true, is_active: true })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "verify_grades_status") {
      const studentId = String(body?.studentId || "");
      const { error } = await db
        .from("exam_grades")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("school_id", schoolId)
        .eq("student_id", studentId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "issue_trade_certificate") {
      const studentId = String(body?.studentId || "");
      const qualificationTitle = String(body?.qualificationTitle || "").trim();
      if (!studentId || !qualificationTitle) {
        return NextResponse.json(
          { error: "Trainee and qualification title required." },
          { status: 400 }
        );
      }
      const certNo =
        String(body?.certificateNumber || "").trim() ||
        `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await db
        .from("trade_certifications")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          certificate_number: certNo,
          qualification_title: qualificationTitle,
          issue_date: body?.issueDate || new Date().toISOString().slice(0, 10),
          status: "issued",
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, certificate: data });
    }

    if (action === "save_clearance") {
      const studentId = String(body?.studentId || "");
      if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

      const academic = Boolean(body?.academicCleared);
      const finance = Boolean(body?.financeCleared);
      const library = Boolean(body?.libraryCleared);
      const hostel = Boolean(body?.hostelCleared);
      const workshop = Boolean(body?.workshopCleared);
      const allCleared = academic && finance && library && hostel && workshop;
      const requestedStatus = body?.overallStatus ? String(body.overallStatus) : "";
      const overallStatus =
        requestedStatus || (allCleared ? "cleared" : "pending");

      const { data, error } = await db
        .from("graduation_clearances")
        .upsert(
          {
            school_id: schoolId,
            student_id: studentId,
            academic_year_id: body?.academicYearId || null,
            cohort_label: body?.cohortLabel ? String(body.cohortLabel).trim() : null,
            academic_cleared: academic,
            finance_cleared: finance,
            library_cleared: library,
            hostel_cleared: hostel,
            workshop_cleared: workshop,
            overall_status: overallStatus,
            remarks: body?.remarks ? String(body.remarks).trim() : null,
            updated_by: ctx.userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "school_id,student_id" }
        )
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, clearance: data });
    }

    if (action === "mark_graduated") {
      const clearanceId = String(body?.clearanceId || "");
      const studentId = String(body?.studentId || "");
      if (clearanceId) {
        const { error } = await db
          .from("graduation_clearances")
          .update({
            overall_status: "graduated",
            graduated_at: new Date().toISOString(),
            updated_by: ctx.userId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clearanceId)
          .eq("school_id", schoolId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (studentId) {
        await db
          .from("students")
          .update({ status: "graduated", updated_at: new Date().toISOString() })
          .eq("id", studentId)
          .eq("school_id", schoolId);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "update_profile") {
      const fullName = String(body?.fullName || "").trim();
      const phone = String(body?.phone || "").trim();
      if (fullName) {
        await db
          .from("profiles")
          .update({ full_name: fullName, phone: phone || null })
          .eq("id", ctx.userId);
      }
      if (ctx.staffProfile?.id) {
        await db
          .from("staff_profiles")
          .update({ phone: phone || null, updated_at: new Date().toISOString() })
          .eq("id", ctx.staffProfile.id)
          .eq("school_id", schoolId);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "change_password") {
      const newPassword = String(body?.newPassword || "");
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long." },
          { status: 400 }
        );
      }
      const { error } = await db.auth.admin.updateUserById(ctx.userId, {
        password: newPassword,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/registrar/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
