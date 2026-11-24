import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveSchoolSummary,
  scopeQueryBySchool,
} from "@/lib/admin/tenant-provisioning";
import {
  listDepartments,
  listPrograms,
} from "@/lib/academics/departments-programs-service";
import {
  getSchoolTerminology,
  normalizeSchoolType,
} from "@/lib/academics/school-terminology";

const FACULTY_ROLES = new Set([
  "lecturer",
  "teacher",
  "dean",
  "head_of_department",
  "academic_advisor",
]);

const STAFF_ROLES = new Set([
  "registrar",
  "academic_affairs_officer",
  "admissions_officer",
  "finance_officer",
  "bursar",
  "accountant",
  "librarian",
  "hostel_officer",
  "hr_officer",
  "auditor",
  "system_admin",
  "school_admin",
  "admin",
  "administrator",
  "staff",
]);

const FACULTY_TITLE_REGEX =
  /lecturer|professor|teacher|instructor|faculty|dean|academic advisor|fellow|researcher/i;

function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err || "");
  return (
    err.code === "PGRST205" ||
    msg.includes("Could not find the table") ||
    msg.includes("does not exist")
  );
}

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const requestedSchoolId = req.nextUrl.searchParams.get("school_id") || null;
    const schoolId = tenant.schoolId || (tenant.isSuperAdmin ? requestedSchoolId : null);

    if (!schoolId) {
      if (!tenant.isSuperAdmin) {
        return NextResponse.json(
          { error: "No school context is linked to this account." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Please select or pass a school_id to view tenant dashboard metrics." },
        { status: 400 }
      );
    }

    const directAdmin = createDirectAdminClient();
    const virtualAdmin = createAdminClient();
    const queryErrors: string[] = [];

    const checkLiveError = (label: string, res: any) => {
      if (res?.error && !isMissingTableError(res.error)) {
        console.error(`[GET /api/admin/dashboard] ${label} query error:`, res.error);
        queryErrors.push(`${label}: ${res.error.message || "Query failed"}`);
      }
    };

    const [
      schoolSummary,
      liveStudentsRes,
      liveStaffProfilesRes,
      liveMembershipsRes,
      liveProfilesRes,
      livePaymentsRes,
      liveInvoicesRes,
      liveAttendanceRes,
      liveSubjectsCountRes,
      liveModulesCountRes,
      virtualStudentsRes,
      virtualStaffRes,
      deptResult,
      progResult,
    ] = await Promise.all([
      resolveSchoolSummary(directAdmin, schoolId).catch((err: any) => {
        console.error("[GET /api/admin/dashboard] school summary error:", err);
        queryErrors.push(`school: ${err?.message || "Failed to load school"}`);
        return { schoolName: tenant.schoolName || "", schoolCode: tenant.schoolCode || "" };
      }),
      (directAdmin as any)
        .from("students")
        .select("id, school_id, student_number, first_name, last_name, status, class_group_id, created_at")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("staff_profiles")
        .select("id, school_id, user_id, staff_number, first_name, last_name, designation, department, employment_status, email, created_at")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("school_memberships")
        .select("id, school_id, user_id, role, status, created_at")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("profiles")
        .select("id, email, full_name, role, school_id, account_status, created_at")
        .eq("school_id", schoolId)
        .neq("account_status", "deleted"),
      (directAdmin as any)
        .from("payments")
        .select("amount, created_at, status, currency")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("invoices")
        .select("total_amount, paid_amount, balance, status, created_at")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("attendance_records")
        .select("status")
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("subjects")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId),
      (directAdmin as any)
        .from("vocational_modules")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId),
      scopeQueryBySchool(
        (virtualAdmin as any)
          .from("students")
          .select("id, school_id, profile_id, student_number, status, programme:programme_id(name), profile:profile_id(full_name)"),
        schoolId
      ),
      scopeQueryBySchool(
        (virtualAdmin as any)
          .from("staff")
          .select("id, school_id, profile_id, staff_number, job_title, status, department:department_id(name), profile:profile_id(full_name)"),
        schoolId
      ),
      listDepartments(schoolId).catch((err: any) => {
        console.error("[GET /api/admin/dashboard] departments error:", err);
        queryErrors.push(`departments: ${err?.message || "Failed to load departments"}`);
        return { departments: [], schools: [], stats: { totalDepartments: 0, activeDepartments: 0, linkedProgramsCount: 0, withHeadCount: 0 }, school_type: "university" as const };
      }),
      listPrograms(schoolId).catch((err: any) => {
        console.error("[GET /api/admin/dashboard] programs error:", err);
        queryErrors.push(`programmes: ${err?.message || "Failed to load programs"}`);
        return { programs: [], departments: [], schools: [], stats: { totalPrograms: 0, activePrograms: 0, undergraduateCount: 0, postgraduateCount: 0, diplomaCount: 0 }, school_type: "university" as const };
      }),
    ]);

    checkLiveError("students", liveStudentsRes);
    checkLiveError("staff_profiles", liveStaffProfilesRes);
    checkLiveError("school_memberships", liveMembershipsRes);
    checkLiveError("profiles", liveProfilesRes);
    checkLiveError("payments", livePaymentsRes);
    checkLiveError("invoices", liveInvoicesRes);
    checkLiveError("attendance_records", liveAttendanceRes);

    // 1. Students metrics (deduplicated across live students, student profiles/memberships, virtual students)
    const studentMap = new Map<string, { active: boolean; name: string; subtitle: string; badge: string }>();
    for (const s of virtualStudentsRes?.data || []) {
      const key = String(s.profile_id || s.student_number || s.id).toLowerCase();
      const status = String(s.status || "active").toLowerCase();
      studentMap.set(key, {
        active: status === "active" || status === "admitted" || status === "enrolled",
        name: s.profile?.full_name || "Student",
        subtitle: s.programme?.name || "",
        badge: s.student_number ? `ID ${s.student_number}` : "",
      });
    }
    for (const m of liveMembershipsRes?.data || []) {
      const role = String(m?.role || "").toLowerCase();
      const mStatus = String(m?.status || "active").toLowerCase();
      if (role === "student" && m.user_id && mStatus !== "deleted") {
        const key = String(m.user_id).toLowerCase();
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            active: mStatus === "active",
            name: "Student",
            subtitle: "",
            badge: "",
          });
        }
      }
    }
    for (const p of liveProfilesRes?.data || []) {
      const role = String(p?.role || "").toLowerCase();
      if (role === "student" && p?.id) {
        const key = String(p.id).toLowerCase();
        const prev = studentMap.get(key);
        const st = String(p.account_status || "active").toLowerCase();
        studentMap.set(key, {
          active: prev ? prev.active : st === "active",
          name: p.full_name || prev?.name || "Student",
          subtitle: prev?.subtitle || "",
          badge: prev?.badge || "",
        });
      }
    }
    for (const s of liveStudentsRes?.data || []) {
      const key = String(s.student_number || s.id).toLowerCase();
      const status = String(s.status || "active").toLowerCase();
      const fullName = `${s.first_name || ""} ${s.last_name || ""}`.trim();
      studentMap.set(key, {
        active: status === "active" || status === "admitted" || status === "enrolled",
        name: fullName || studentMap.get(key)?.name || "Student",
        subtitle: studentMap.get(key)?.subtitle || "",
        badge: s.student_number ? `ID ${s.student_number}` : "",
      });
    }

    const studentEntries = Array.from(studentMap.values());
    const totalStudents = studentEntries.length;
    const activeStudents = studentEntries.filter((s) => s.active).length;
    const inactiveStudents = totalStudents - activeStudents;

    // 2. Teachers & Staff metrics (deduplicated across live staff_profiles, school_memberships, profiles, virtual staff)
    const peopleByKey = new Map<
      string,
      {
        role: string;
        jobTitle: string;
        active: boolean;
        name: string;
        department: string;
      }
    >();

    for (const p of liveProfilesRes?.data || []) {
      if (!p?.id) continue;
      const role = String(p.role || "").trim().toLowerCase();
      if (
        role === "superadmin" ||
        role === "student" ||
        role === "parent" ||
        role === "parent_sponsor" ||
        role === "guardian" ||
        role === "applicant"
      ) {
        continue;
      }
      const key = String(p.id).toLowerCase();
      peopleByKey.set(key, {
        role,
        jobTitle: "",
        active: String(p.account_status || "active").toLowerCase() === "active",
        name: p.full_name || p.email || "Staff Member",
        department: "",
      });
    }

    for (const m of liveMembershipsRes?.data || []) {
      if (!m?.user_id) continue;
      const status = String(m.status || "active").toLowerCase();
      if (status === "deleted") continue;
      const role = String(m.role || "").trim().toLowerCase();
      if (
        role === "superadmin" ||
        role === "student" ||
        role === "parent" ||
        role === "parent_sponsor" ||
        role === "guardian" ||
        role === "applicant"
      ) {
        continue;
      }
      const key = String(m.user_id).toLowerCase();
      const prev = peopleByKey.get(key);
      peopleByKey.set(key, {
        role: role || prev?.role || "",
        jobTitle: prev?.jobTitle || "",
        active: status === "active",
        name: prev?.name || "Staff Member",
        department: prev?.department || "",
      });
    }

    for (const sp of liveStaffProfilesRes?.data || []) {
      const key = String(sp.user_id || sp.id || "").toLowerCase();
      if (!key) continue;
      const prev = peopleByKey.get(key);
      const fullName = `${sp.first_name || ""} ${sp.last_name || ""}`.trim();
      const st = String(sp.employment_status || "active").toLowerCase();
      peopleByKey.set(key, {
        role: prev?.role || "",
        jobTitle: sp.designation || prev?.jobTitle || "",
        active: st === "active",
        name: fullName || prev?.name || "Staff Member",
        department: sp.department || prev?.department || "",
      });
    }

    for (const vs of virtualStaffRes?.data || []) {
      const key = String(vs.profile_id || vs.id || "").toLowerCase();
      if (!key) continue;
      if (!peopleByKey.has(key)) {
        peopleByKey.set(key, {
          role: "",
          jobTitle: vs.job_title || "",
          active: String(vs.status || "active").toLowerCase() === "active",
          name: vs.profile?.full_name || "Staff Member",
          department: vs.department?.name || "",
        });
      }
    }

    let totalTeachers = 0;
    let activeTeachers = 0;
    let totalStaff = 0;
    let activeStaff = 0;
    let bestPerformer: { name: string; role: string; department: string } | null = null;

    for (const person of peopleByKey.values()) {
      const isFaculty =
        FACULTY_ROLES.has(person.role) ||
        FACULTY_TITLE_REGEX.test(person.jobTitle);
      const isEligibleStaff =
        STAFF_ROLES.has(person.role) || person.jobTitle.trim().length > 0;

      if (isFaculty) {
        totalTeachers += 1;
        if (person.active) activeTeachers += 1;
        if (!bestPerformer) {
          bestPerformer = {
            name: person.name,
            role: person.jobTitle || "Faculty",
            department: person.department,
          };
        }
      } else if (isEligibleStaff) {
        totalStaff += 1;
        if (person.active) activeStaff += 1;
      }
    }

    if (!bestPerformer && peopleByKey.size > 0) {
      const first = Array.from(peopleByKey.values())[0];
      bestPerformer = {
        name: first.name,
        role: first.jobTitle || first.role.replace(/_/g, " ") || "Staff",
        department: first.department,
      };
    }

    // 3. Dynamic 4th KPI Card (Programs / Classes based on school_type)
    const schoolType = normalizeSchoolType(
      progResult.school_type || deptResult.school_type
    );
    const terminology = getSchoolTerminology(schoolType);

    let academicCardLabel = "Total Programs";
    let academicCardHref = "/admin/programs";
    let academicItems: Array<{ is_active?: boolean }> = progResult.programs || [];

    if (schoolType === "high_school") {
      academicCardLabel = "Total Classes";
      academicCardHref = "/admin/programs";
      academicItems = progResult.programs || [];
    } else if (schoolType === "vocational_school") {
      academicCardLabel = "Total Classes";
      academicCardHref = "/admin/departments";
      academicItems = deptResult.departments || [];
    }

    const totalAcademicUnits = academicItems.length;
    const activeAcademicUnits = academicItems.filter((it) => it.is_active !== false).length;
    const inactiveAcademicUnits = totalAcademicUnits - activeAcademicUnits;

    // 4. Fees & Payments (scoped by school_id, using live `payments` & `invoices`)
    const successfulPayments = (livePaymentsRes?.data || []).filter(
      (p: any) => !p.status || String(p.status).toLowerCase() === "successful" || String(p.status).toLowerCase() === "completed" || String(p.status).toLowerCase() === "paid"
    );
    const totalCollected = successfulPayments.reduce(
      (acc: number, p: any) => acc + Number(p.amount || 0),
      0
    );

    const invoicesRows = liveInvoicesRes?.data || [];
    const totalOutstanding = invoicesRows.reduce(
      (acc: number, inv: any) => acc + Number(inv.balance ?? inv.balance_amount ?? 0),
      0
    );
    const unpaidCount = invoicesRows.filter((inv: any) => {
      const st = String(inv.status || "").toLowerCase();
      return st === "posted" || st === "partially_paid" || st === "overdue" || st === "unpaid" || st === "pending";
    }).length;

    const quarterBuckets = new Map<
      string,
      { sortKey: number; totalFee: number; collectedFee: number }
    >();
    const toQuarterKey = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const dt = new Date(dateStr);
      if (Number.isNaN(dt.getTime())) return null;
      const q = Math.floor(dt.getMonth() / 3) + 1;
      const y = dt.getFullYear();
      return { label: `Q${q} ${y}`, sortKey: y * 10 + q };
    };

    for (const inv of invoicesRows) {
      const qk = toQuarterKey(inv.created_at);
      if (!qk) continue;
      const entry = quarterBuckets.get(qk.label) || {
        sortKey: qk.sortKey,
        totalFee: 0,
        collectedFee: 0,
      };
      entry.totalFee += Number(inv.total_amount || 0);
      quarterBuckets.set(qk.label, entry);
    }

    const currentQ = toQuarterKey(new Date().toISOString());
    let termCollected = 0;
    for (const pay of successfulPayments) {
      const qk = toQuarterKey(pay.created_at);
      if (!qk) continue;
      const amt = Number(pay.amount || 0);
      const entry = quarterBuckets.get(qk.label) || {
        sortKey: qk.sortKey,
        totalFee: 0,
        collectedFee: 0,
      };
      entry.collectedFee += amt;
      quarterBuckets.set(qk.label, entry);
      if (currentQ && qk.label === currentQ.label) {
        termCollected += amt;
      }
    }

    const quarterData = Array.from(quarterBuckets.entries())
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .slice(-9)
      .map(([quarter, vals]) => ({
        quarter,
        totalFee: vals.totalFee,
        collectedFee: vals.collectedFee,
      }));

    // 5. Attendance stats
    const attRows = liveAttendanceRes?.data || [];
    const attendanceStats = {
      present: attRows.filter((r: any) => r.status === "present").length,
      absent: attRows.filter((r: any) => r.status === "absent").length,
      emergency: attRows.filter((r: any) => r.status === "excused").length,
      medical: 0,
      late: attRows.filter((r: any) => r.status === "late").length,
    };

    const starStudent =
      studentEntries.length > 0
        ? {
            name: studentEntries[0].name,
            programme: studentEntries[0].subtitle,
            score: studentEntries[0].badge,
          }
        : null;

    return NextResponse.json(
      {
        school_id: schoolId,
        school_name: schoolSummary?.schoolName || tenant.schoolName || "",
        school_type: terminology.schoolType,
        stats: {
          totalStudents,
          activeStudents,
          inactiveStudents,
          totalTeachers,
          activeTeachers,
          inactiveTeachers: totalTeachers - activeTeachers,
          totalStaff,
          activeStaff,
          inactiveStaff: totalStaff - activeStaff,
          totalSubjects:
            !liveSubjectsCountRes?.error && typeof liveSubjectsCountRes?.count === "number"
              ? liveSubjectsCountRes.count
              : totalAcademicUnits,
          totalModules:
            !liveModulesCountRes?.error && typeof liveModulesCountRes?.count === "number"
              ? liveModulesCountRes.count
              : 0,
          activeSubjects: activeAcademicUnits,
          inactiveSubjects: inactiveAcademicUnits,
          totalAcademicUnits,
          activeAcademicUnits,
          inactiveAcademicUnits,
          academicCardLabel,
          academicCardHref,
          totalDepartments: (deptResult.departments || []).length,
          totalPrograms: (progResult.programs || []).length,
        },
        fees: {
          totalCollected,
          termCollected,
          unpaidCount,
          totalOutstanding,
          quarterData,
          latestPaymentAmount: successfulPayments[0]?.amount ?? null,
        },
        attendanceStats,
        bestPerformer,
        starStudent,
        ...(queryErrors.length > 0 ? { queryErrors } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw err;
    }
    console.error("GET /api/admin/dashboard fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load dashboard metrics." },
      { status: 500 }
    );
  }
}
