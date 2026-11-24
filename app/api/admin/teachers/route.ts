import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  deleteLiveTenantUser,
  provisionLiveTenantUser,
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
  scopeQueryBySchool,
  syncVirtualProfileAndRole,
} from "@/lib/admin/tenant-provisioning";

const PROTECTED_ADMIN_ID = "a0000000-0000-0000-0000-000000000001";
const PROTECTED_ADMIN_EMAIL = "admin@university.edu.gh";

const FACULTY_ROLE_CODES = [
  "lecturer",
  "teacher",
  "instructor",
  "dean",
  "head_of_department",
  "academic_advisor",
] as const;

const FACULTY_TITLE_REGEX =
  /lecturer|professor|teacher|instructor|faculty|dean|academic advisor|fellow|researcher/i;

const VALID_EMPLOYMENT_TYPES = ["full_time", "part_time", "adjunct", "contract"] as const;
const VALID_STAFF_STATUSES = ["active", "on_leave", "terminated", "retired"] as const;

async function syncTeacherCourses(
  supabase: ReturnType<typeof createAdminClient>,
  profileId: string,
  courseIds: string[],
  schoolId: string
) {
  await (supabase as any).from("teaching_assignments").delete().eq("staff_id", profileId);

  const uniqueCourseIds = Array.from(
    new Set((courseIds || []).map((c) => String(c || "").trim()).filter(Boolean))
  );
  if (uniqueCourseIds.length === 0) return;

  const { data: activeTerm } = await (supabase as any)
    .from("terms")
    .select("id")
    .eq("school_id", schoolId)
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeTerm?.id) return;

  for (const courseId of uniqueCourseIds) {
    let offeringId: string | null = null;
    const { data: existingOffering } = await (supabase as any)
      .from("course_offerings")
      .select("id")
      .eq("school_id", schoolId)
      .eq("term_id", activeTerm.id)
      .eq("course_id", courseId)
      .order("section", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingOffering?.id) {
      offeringId = existingOffering.id;
    } else {
      const { data: createdOffering } = await (supabase as any)
        .from("course_offerings")
        .insert({
          school_id: schoolId,
          term_id: activeTerm.id,
          course_id: courseId,
          section: "A",
          delivery_mode: "in_person",
          capacity: 60,
          status: "published",
        })
        .select("id")
        .single();
      offeringId = createdOffering?.id || null;
    }

    if (offeringId) {
      await (supabase as any).from("teaching_assignments").insert({
        school_id: schoolId,
        course_offering_id: offeringId,
        staff_id: profileId,
        role: "lecturer",
        is_primary: true,
      });
    }
  }
}

// GET: Fetch all Faculty & Teachers scoped strictly to caller's school_id
export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const [
      staffRes,
      roleAssignRes,
      teachingRes,
      departmentsRes,
      coursesRes,
      rolesRes,
      empRecordsRes,
      liveStaffProfsRes,
      liveMemsRes,
      liveProfilesRes,
      liveSchoolRes,
      liveDeptsRes,
      liveProgsRes,
      liveCoursesRes,
      liveSubjectsRes,
      liveModulesRes,
    ] = await Promise.all([
      scopeQueryBySchool(
        (supabase as any)
          .from("staff")
          .select(
            `
          id,
          school_id,
          profile_id,
          staff_number,
          department_id,
          employment_type,
          job_title,
          hire_date,
          status,
          created_at,
          updated_at,
          profile:profile_id(id, full_name, email, phone, account_status),
          department:department_id(id, name, code)
        `
          )
          .order("created_at", { ascending: false }),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (supabase as any)
          .from("user_role_assignments")
          .select("user_id, role:role_id(id, code, name)")
          .eq("is_active", true),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (supabase as any).from("teaching_assignments").select(
          `
          id,
          staff_id,
          role,
          is_primary,
          course_offering:course_offering_id(
            id,
            section,
            course:course_id(id, code, name)
          )
        `
        ),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (supabase as any).from("departments").select("id, name, code").order("name", { ascending: true }),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (supabase as any)
          .from("courses")
          .select("id, code, name, department_id")
          .eq("is_active", true)
          .order("code", { ascending: true }),
        tenant.schoolId
      ),
      (supabase as any)
        .from("roles")
        .select("id, code, name")
        .in("code", [...FACULTY_ROLE_CODES])
        .order("name", { ascending: true }),
      scopeQueryBySchool(
        (supabase as any)
          .from("employment_records")
          .select("id, staff_id, contract_type, salary_grade, start_date")
          .order("created_at", { ascending: false }),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (directAdmin as any).from("staff_profiles").select("*"),
        tenant.schoolId
      ).then((r: any) => r, () => ({ data: [] })),
      scopeQueryBySchool(
        (directAdmin as any)
          .from("school_memberships")
          .select("user_id, school_id, role, status, roles(code, name)"),
        tenant.schoolId
      ).then((r: any) => r, () => ({ data: [] })),
      scopeQueryBySchool(
        (directAdmin as any)
          .from("profiles")
          .select("id, email, full_name, phone, role, school_id, account_status, metadata, created_at"),
        tenant.schoolId
      ).then((r: any) => r, () => ({ data: [] })),
      tenant.schoolId
        ? (directAdmin as any)
            .from("schools")
            .select("school_type")
            .eq("id", tenant.schoolId)
            .maybeSingle()
            .then((r: any) => r, () => ({ data: null }))
        : Promise.resolve({ data: null }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("departments")
            .select("id, name, code")
            .eq("school_id", tenant.schoolId)
            .order("name", { ascending: true })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("programmes")
            .select("id, name, code, degree_level")
            .eq("school_id", tenant.schoolId)
            .order("name", { ascending: true })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("courses")
            .select("id, code, name, department_id")
            .eq("school_id", tenant.schoolId)
            .order("code", { ascending: true })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("subjects")
            .select("id, code, name, programme_id")
            .eq("school_id", tenant.schoolId)
            .order("code", { ascending: true })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("vocational_modules")
            .select("id, code, name, department_id")
            .eq("school_id", tenant.schoolId)
            .order("code", { ascending: true })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]);

    if (staffRes.error) {
      return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
    }

    const roleMap = new Map<string, { code: string; name: string }>();
    for (const row of roleAssignRes.data || []) {
      const r: any = Array.isArray((row as any).role) ? (row as any).role[0] : (row as any).role;
      if (row.user_id && r?.code) {
        const prev = roleMap.get(row.user_id);
        if (!prev || (FACULTY_ROLE_CODES as readonly string[]).includes(r.code)) {
          roleMap.set(row.user_id, { code: r.code, name: r.name });
        }
      }
    }
    for (const m of liveMemsRes?.data || []) {
      const code = String(m?.role || m?.roles?.code || "").toLowerCase();
      if (m?.user_id && (FACULTY_ROLE_CODES as readonly string[]).includes(code)) {
        roleMap.set(m.user_id, {
          code,
          name:
            m?.roles?.name ||
            code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        });
      }
    }

    const coursesByProfile = new Map<
      string,
      Array<{ course_id: string; course_code: string; course_name: string }>
    >();
    for (const ta of teachingRes.data || []) {
      const offering: any = Array.isArray((ta as any).course_offering)
        ? (ta as any).course_offering[0]
        : (ta as any).course_offering;
      const course: any = Array.isArray(offering?.course)
        ? offering?.course[0]
        : offering?.course;

      if (ta.staff_id && course?.id) {
        const list = coursesByProfile.get(ta.staff_id) || [];
        if (!list.some((item) => item.course_id === course.id)) {
          list.push({
            course_id: course.id,
            course_code: course.code,
            course_name: course.name,
          });
        }
        coursesByProfile.set(ta.staff_id, list);
      }
    }

    const salaryByStaffId = new Map<string, string>();
    for (const emp of empRecordsRes.data || []) {
      if (emp.staff_id && emp.salary_grade && !salaryByStaffId.has(emp.staff_id)) {
        salaryByStaffId.set(emp.staff_id, emp.salary_grade);
      }
    }

    const facultyRows = (staffRes.data || []).filter((s: any) => {
      const assignedRole = roleMap.get(s.profile_id);
      const hasFacultyRole =
        assignedRole && (FACULTY_ROLE_CODES as readonly string[]).includes(assignedRole.code);
      const hasFacultyTitle = FACULTY_TITLE_REGEX.test(s.job_title || "");
      return Boolean(hasFacultyRole || hasFacultyTitle);
    });

    const liveProfileMap = new Map<string, any>();
    for (const lp of liveProfilesRes?.data || []) {
      if (lp?.id) liveProfileMap.set(lp.id, lp);
    }

    const liveStaffByUserId = new Map<string, any>();
    for (const sp of liveStaffProfsRes?.data || []) {
      if (sp?.user_id) liveStaffByUserId.set(String(sp.user_id), sp);
    }

    const teachers = facultyRows.map((s: any) => {
      const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
      const dept = Array.isArray(s.department) ? s.department[0] : s.department;
      const assignedRole = roleMap.get(s.profile_id);
      const assignedCourses = coursesByProfile.get(s.profile_id) || [];
      const liveProf = s.profile_id ? liveProfileMap.get(String(s.profile_id)) : null;
      const liveSp = s.profile_id ? liveStaffByUserId.get(String(s.profile_id)) : null;
      const meta =
        (liveSp?.metadata && typeof liveSp.metadata === "object" && Object.keys(liveSp.metadata).length > 0
          ? liveSp.metadata
          : liveProf?.metadata?.staff_profile) || {};

      return {
        id: s.id,
        profile_id: s.profile_id,
        staff_number: s.staff_number,
        full_name: profile?.full_name || liveProf?.full_name || "",
        email: profile?.email || liveProf?.email || "",
        phone: profile?.phone || liveProf?.phone || liveSp?.phone || "",
        department_id: s.department_id || liveSp?.department_id || null,
        department_name: dept?.name || liveSp?.department || "",
        department_code: dept?.code || "",
        job_title: s.job_title,
        employment_type: s.employment_type || liveSp?.employment_type || "full_time",
        hire_date: s.hire_date || liveSp?.hire_date || "",
        status: s.status,
        role_code:
          assignedRole && (FACULTY_ROLE_CODES as readonly string[]).includes(assignedRole.code)
            ? assignedRole.code
            : liveSp?.role_code || "lecturer",
        role_name: assignedRole?.name || "Lecturer",
        salary_grade: salaryByStaffId.get(s.id) || liveSp?.salary_grade || "",
        assigned_courses: assignedCourses,
        metadata: meta,
        created_at: s.created_at,
      };
    });

    const seenProfileIds = new Set(teachers.map((t: any) => t.profile_id));

    for (const sp of liveStaffProfsRes?.data || []) {
      if (!sp?.user_id || seenProfileIds.has(sp.user_id)) continue;
      const assignedRole = roleMap.get(sp.user_id);
      const hasFacultyRole =
        assignedRole && (FACULTY_ROLE_CODES as readonly string[]).includes(assignedRole.code);
      const hasFacultyTitle = FACULTY_TITLE_REGEX.test(sp.designation || "");
      if (!hasFacultyRole && !hasFacultyTitle) continue;

      const lp = liveProfileMap.get(sp.user_id);
      const meta =
        (sp.metadata && typeof sp.metadata === "object" && Object.keys(sp.metadata).length > 0
          ? sp.metadata
          : lp?.metadata?.staff_profile) || {};

      teachers.push({
        id: sp.id,
        profile_id: sp.user_id,
        staff_number: sp.staff_number || "",
        full_name: lp?.full_name || [sp.first_name, sp.last_name].filter(Boolean).join(" "),
        email: sp.email || lp?.email || "",
        phone: lp?.phone || sp.phone || "",
        department_id: sp.department_id || null,
        department_name: sp.department || "",
        department_code: "",
        job_title: sp.designation || "Lecturer",
        employment_type: sp.employment_type || "full_time",
        hire_date: sp.hire_date || (sp.created_at ? String(sp.created_at).split("T")[0] : ""),
        status: sp.employment_status || "active",
        role_code: sp.role_code || assignedRole?.code || lp?.role || "lecturer",
        role_name: assignedRole?.name || "Lecturer",
        salary_grade: sp.salary_grade || "",
        assigned_courses: coursesByProfile.get(sp.user_id) || [],
        metadata: meta,
        created_at: sp.created_at,
      });
    }

    const mergeUniqueById = (a: any[], b: any[]) => {
      const m = new Map<string, any>();
      for (const x of [...(a || []), ...(b || [])]) {
        if (x?.id && !m.has(String(x.id))) m.set(String(x.id), x);
      }
      return Array.from(m.values());
    };

    const mergedDepartments = mergeUniqueById(liveDeptsRes?.data || [], departmentsRes.data || []);
    const mergedCourses = mergeUniqueById(liveCoursesRes?.data || [], coursesRes.data || []);

    const total = teachers.length;
    const active = teachers.filter((t: any) => t.status === "active").length;
    const fullTime = teachers.filter((t: any) => t.employment_type === "full_time").length;
    const assignedCoursesCount = teachers.reduce(
      (sum: number, t: any) => sum + Math.max(t.assigned_courses.length, (t.metadata?.teaching_subject_ids?.length || 0) + (t.metadata?.assigned_module_ids?.length || 0)),
      0
    );

    return NextResponse.json({
      teachers,
      departments: mergedDepartments,
      programmes: liveProgsRes?.data || [],
      courses: mergedCourses,
      subjects: liveSubjectsRes?.data || [],
      vocational_modules: liveModulesRes?.data || [],
      roles: rolesRes.data || [],
      school_type: liveSchoolRes?.data?.school_type || "university",
      stats: {
        total,
        active,
        fullTime,
        assignedCoursesCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load faculty records." },
      { status: 500 }
    );
  }
}

// POST: Create a new Faculty Member (Auth + Live Profile/Membership/Staff + Virtual DB + Courses)
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  let createdNewAuthUserId: string | null = null;

  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const staffNumber = String(body.staff_number || "")
      .trim()
      .toUpperCase();
    const jobTitle = String(body.job_title || "").trim();
    const departmentId = body.department_id ? String(body.department_id).trim() : null;
    const employmentType = (VALID_EMPLOYMENT_TYPES as readonly string[]).includes(
      body.employment_type
    )
      ? body.employment_type
      : "full_time";
    const status = (VALID_STAFF_STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : "active";
    const hireDate =
      body.hire_date && String(body.hire_date).trim()
        ? String(body.hire_date).trim()
        : new Date().toISOString().split("T")[0];
    const requestedRole = String(body.role_code || "").trim().toLowerCase();
    const roleCode = (FACULTY_ROLE_CODES as readonly string[]).includes(requestedRole)
      ? requestedRole
      : "lecturer";
    const salaryGrade = body.salary_grade ? String(body.salary_grade).trim() : null;
    const courseIds: string[] = Array.isArray(body.course_ids) ? body.course_ids : [];
    const metadata: Record<string, any> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const rawPassword = body.password ? String(body.password).trim() : "";

    if (!fullName || !email || !staffNumber || !jobTitle) {
      return NextResponse.json(
        { error: "Full name, email, staff number, and academic title are required." },
        { status: 400 }
      );
    }

    if (rawPassword && rawPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (email === PROTECTED_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Cannot overwrite the protected System Administrator account." },
        { status: 400 }
      );
    }

    const { data: existingNumber } = await (supabase as any)
      .from("staff")
      .select("id")
      .eq("school_id", targetSchool.schoolId)
      .eq("staff_number", staffNumber)
      .maybeSingle();

    if (existingNumber) {
      return NextResponse.json(
        { error: `Staff ID "${staffNumber}" is already assigned to another staff member.` },
        { status: 400 }
      );
    }

    const { data: existingVProfile } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingVProfile?.id) {
      const { data: alreadyStaff } = await (supabase as any)
        .from("staff")
        .select("id")
        .eq("profile_id", existingVProfile.id)
        .eq("school_id", targetSchool.schoolId)
        .maybeSingle();

      if (alreadyStaff) {
        return NextResponse.json(
          { error: `A staff or faculty record already exists for "${email}".` },
          { status: 400 }
        );
      }
    }

    const directAdmin = createDirectAdminClient();
    let departmentName: string | null = null;
    if (departmentId) {
      const { data: deptRow } = await (supabase as any)
        .from("departments")
        .select("name")
        .eq("id", departmentId)
        .maybeSingle();
      departmentName = deptRow?.name || null;
      if (!departmentName) {
        const { data: liveDept } = await (directAdmin as any)
          .from("departments")
          .select("name")
          .eq("id", departmentId)
          .maybeSingle();
        departmentName = liveDept?.name || null;
      }
    }

    const provisioned = await provisionLiveTenantUser({
      email,
      password: rawPassword || undefined,
      fullName,
      phone,
      roleCode,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: status === "terminated" ? "deactivated" : "active",
      existingUserId: existingVProfile?.id || null,
      extraMetadata: { staff_profile: metadata },
      staffProfile: {
        staffNumber,
        jobTitle,
        departmentName: departmentName || metadata.assigned_class_name || null,
        departmentId,
        employmentType,
        hireDate,
        phone,
        roleCode,
        salaryGrade,
        employmentStatus: status,
        metadata,
      },
    });
    const profileId = provisioned.userId;
    if (provisioned.createdNewAuthUser) {
      createdNewAuthUserId = profileId;
    }

    await syncVirtualProfileAndRole(supabase, {
      userId: profileId,
      email,
      fullName,
      phone,
      roleCode,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: status === "terminated" ? "deactivated" : "active",
      departmentId,
    });

    const { data: createdStaff, error: staffErr } = await (supabase as any)
      .from("staff")
      .insert({
        school_id: targetSchool.schoolId,
        university_id: targetSchool.schoolId,
        profile_id: profileId,
        staff_number: staffNumber,
        department_id: departmentId,
        employment_type: employmentType,
        job_title: jobTitle,
        hire_date: hireDate,
        status,
      })
      .select("id, staff_number")
      .single();

    if (staffErr) {
      if (createdNewAuthUserId) {
        await deleteLiveTenantUser(createdNewAuthUserId, null);
        await (supabase as any).from("profiles").delete().eq("id", createdNewAuthUserId);
      }
      return NextResponse.json({ error: staffErr.message }, { status: 400 });
    }

    await (supabase as any).from("employment_records").insert({
      school_id: targetSchool.schoolId,
      staff_id: createdStaff.id,
      contract_type: employmentType,
      start_date: hireDate,
      salary_grade: salaryGrade,
    });

    if (courseIds.length > 0) {
      await syncTeacherCourses(supabase, profileId, courseIds, targetSchool.schoolId);
    }

    try {
      await (supabase as any).from("audit_events").insert({
        action: "FACULTY_CREATED",
        entity_type: "staff",
        entity_id: createdStaff.id,
        school_id: targetSchool.schoolId,
        outcome: "success",
        metadata: {
          staff_number: staffNumber,
          email,
          full_name: fullName,
          job_title: jobTitle,
          role_code: roleCode,
          school_id: targetSchool.schoolId,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({
      success: true,
      teacher: createdStaff,
    });
  } catch (err: any) {
    if (createdNewAuthUserId) {
      try {
        await deleteLiveTenantUser(createdNewAuthUserId, null);
        await (supabase as any).from("profiles").delete().eq("id", createdNewAuthUserId);
      } catch {
        // Ignore rollback failure
      }
    }
    return NextResponse.json(
      { error: err.message || "Failed to create faculty member." },
      { status: err.statusCode || 500 }
    );
  }
}

// PUT: Update Faculty Member (Auth + Live Profile/Membership + Virtual DB + Courses)
export async function PUT(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const id = String(body.id || "").trim();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const staffNumber = String(body.staff_number || "")
      .trim()
      .toUpperCase();
    const jobTitle = String(body.job_title || "").trim();
    const departmentId = body.department_id ? String(body.department_id).trim() : null;
    const employmentType = (VALID_EMPLOYMENT_TYPES as readonly string[]).includes(
      body.employment_type
    )
      ? body.employment_type
      : "full_time";
    const status = (VALID_STAFF_STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : "active";
    const hireDate =
      body.hire_date && String(body.hire_date).trim()
        ? String(body.hire_date).trim()
        : new Date().toISOString().split("T")[0];
    const requestedRole = String(body.role_code || "").trim().toLowerCase();
    const roleCode = (FACULTY_ROLE_CODES as readonly string[]).includes(requestedRole)
      ? requestedRole
      : "lecturer";
    const salaryGrade = body.salary_grade ? String(body.salary_grade).trim() : null;
    const metadata: Record<string, any> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const rawPassword = body.password ? String(body.password).trim() : "";

    if (!id || !fullName || !email || !staffNumber || !jobTitle) {
      return NextResponse.json(
        { error: "Faculty ID, full name, email, staff number, and academic title are required." },
        { status: 400 }
      );
    }

    if (rawPassword && rawPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const { data: existingStaff } = await (supabase as any)
      .from("staff")
      .select("id, school_id, university_id, profile_id, staff_number")
      .eq("id", id)
      .maybeSingle();

    const { data: existingLiveStaff } = !existingStaff
      ? await (directAdmin as any)
          .from("staff_profiles")
          .select("id, school_id, user_id, staff_number")
          .eq("id", id)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null }))
      : { data: null };

    const targetRecord = existingStaff || existingLiveStaff;
    if (!targetRecord) {
      return NextResponse.json({ error: "Faculty record not found." }, { status: 404 });
    }

    const profileId = existingStaff ? existingStaff.profile_id : existingLiveStaff.user_id;
    const recordSchoolId = targetRecord.school_id || targetRecord.university_id || null;

    if (
      !tenant.isSuperAdmin &&
      recordSchoolId &&
      tenant.schoolId &&
      String(recordSchoolId).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update a faculty member from another school." },
        { status: 403 }
      );
    }

    const targetSchool = await resolveTargetSchoolForMutation(
      tenant,
      recordSchoolId || body.school_id
    );
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    if (existingStaff) {
      const { data: conflictNumber } = await (supabase as any)
        .from("staff")
        .select("id")
        .eq("school_id", targetSchool.schoolId)
        .eq("staff_number", staffNumber)
        .neq("id", id)
        .maybeSingle();

      if (conflictNumber) {
        return NextResponse.json(
          { error: `Staff ID "${staffNumber}" is already assigned to another staff member.` },
          { status: 400 }
        );
      }
    }

    const { data: conflictEmail } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", profileId)
      .maybeSingle();

    if (conflictEmail) {
      return NextResponse.json(
        { error: `Email "${email}" is already in use by another account.` },
        { status: 400 }
      );
    }

    let departmentName: string | null = null;
    if (departmentId) {
      const { data: deptRow } = await (supabase as any)
        .from("departments")
        .select("name")
        .eq("id", departmentId)
        .maybeSingle();
      departmentName = deptRow?.name || null;
      if (!departmentName) {
        const { data: liveDept } = await (directAdmin as any)
          .from("departments")
          .select("name")
          .eq("id", departmentId)
          .maybeSingle();
        departmentName = liveDept?.name || null;
      }
    }

    if (profileId !== PROTECTED_ADMIN_ID) {
      await provisionLiveTenantUser({
        existingUserId: profileId,
        email,
        password: rawPassword || undefined,
        fullName,
        phone,
        roleCode,
        schoolId: targetSchool.schoolId,
        schoolName: targetSchool.schoolName,
        schoolCode: targetSchool.schoolCode,
        accountStatus: status === "terminated" ? "deactivated" : "active",
        extraMetadata: { staff_profile: metadata },
        staffProfile: {
          staffNumber,
          jobTitle,
          departmentName: departmentName || metadata.assigned_class_name || null,
          departmentId,
          employmentType,
          hireDate,
          phone,
          roleCode,
          salaryGrade,
          employmentStatus: status,
          metadata,
        },
      });
    }

    await syncVirtualProfileAndRole(supabase, {
      userId: profileId,
      email,
      fullName,
      phone,
      roleCode,
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus: status === "terminated" ? "deactivated" : "active",
      departmentId,
    });

    if (existingStaff) {
      const { error: staffErr } = await (supabase as any)
        .from("staff")
        .update({
          school_id: targetSchool.schoolId,
          university_id: targetSchool.schoolId,
          staff_number: staffNumber,
          department_id: departmentId,
          employment_type: employmentType,
          job_title: jobTitle,
          hire_date: hireDate,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (staffErr) {
        return NextResponse.json({ error: staffErr.message }, { status: 400 });
      }

      const { data: existingEmp } = await (supabase as any)
        .from("employment_records")
        .select("id")
        .eq("staff_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingEmp?.id) {
        await (supabase as any)
          .from("employment_records")
          .update({
            contract_type: employmentType,
            start_date: hireDate,
            salary_grade: salaryGrade,
          })
          .eq("id", existingEmp.id);
      } else {
        await (supabase as any).from("employment_records").insert({
          school_id: targetSchool.schoolId,
          staff_id: id,
          contract_type: employmentType,
          start_date: hireDate,
          salary_grade: salaryGrade,
        });
      }
    }

    if (Array.isArray(body.course_ids)) {
      await syncTeacherCourses(supabase, profileId, body.course_ids, targetSchool.schoolId);
    }

    try {
      await (supabase as any).from("audit_events").insert({
        action: "FACULTY_UPDATED",
        entity_type: "staff",
        entity_id: id,
        school_id: targetSchool.schoolId,
        outcome: "success",
        metadata: {
          staff_number: staffNumber,
          email,
          full_name: fullName,
          job_title: jobTitle,
          status,
          school_id: targetSchool.schoolId,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update faculty member." },
      { status: err.statusCode || 500 }
    );
  }
}

// DELETE: Clean up Teaching Assignments, Staff Record, Profile, and Auth User
export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Faculty ID is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const { data: staffMember } = await (supabase as any)
      .from("staff")
      .select("id, school_id, university_id, profile_id, staff_number")
      .eq("id", id)
      .maybeSingle();

    const { data: liveStaffMember } = !staffMember
      ? await (directAdmin as any)
          .from("staff_profiles")
          .select("id, school_id, user_id, staff_number")
          .eq("id", id)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null }))
      : { data: null };

    const targetRecord = staffMember || liveStaffMember;
    if (!targetRecord) {
      return NextResponse.json({ error: "Faculty record not found." }, { status: 404 });
    }

    const profileId = staffMember ? staffMember.profile_id : liveStaffMember.user_id;
    const recordSchoolId = targetRecord.school_id || targetRecord.university_id || null;

    if (
      !tenant.isSuperAdmin &&
      recordSchoolId &&
      tenant.schoolId &&
      String(recordSchoolId).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot delete a faculty member from another school." },
        { status: 403 }
      );
    }

    if (profileId === PROTECTED_ADMIN_ID) {
      return NextResponse.json(
        { error: "Cannot delete the protected System Administrator profile." },
        { status: 403 }
      );
    }

    await (supabase as any).from("teaching_assignments").delete().eq("staff_id", profileId);
    await (supabase as any).from("employment_records").delete().eq("staff_id", id);

    if (staffMember) {
      const { error: delStaffErr } = await (supabase as any).from("staff").delete().eq("id", id);
      if (delStaffErr) {
        return NextResponse.json({ error: delStaffErr.message }, { status: 400 });
      }
    }

    const { data: linkedStudent } = await (supabase as any)
      .from("students")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!linkedStudent && profileId !== PROTECTED_ADMIN_ID) {
      await (supabase as any).from("result_approvals").delete().eq("approver_id", profileId);
      await (supabase as any).from("result_submissions").delete().eq("submitted_by", profileId);
      await (supabase as any).from("timetable_publications").delete().eq("published_by", profileId);
      await (supabase as any).from("enrolment_overrides").delete().eq("approved_by", profileId);
      await (supabase as any).from("attendance_amendments").delete().eq("requested_by", profileId);
      await (supabase as any).from("result_amendments").delete().eq("requested_by", profileId);
      await (supabase as any).from("application_reviews").delete().eq("reviewer_id", profileId);
      await (supabase as any).from("admission_decisions").delete().eq("decided_by", profileId);
      await (supabase as any).from("maintenance_requests").delete().eq("reported_by", profileId);
      await (supabase as any).from("waivers").delete().eq("approved_by", profileId);
      await (supabase as any).from("refund_requests").delete().eq("requested_by", profileId);

      await (supabase as any).from("user_role_assignments").delete().eq("user_id", profileId);
      await (supabase as any).from("profiles").delete().eq("id", profileId);
      await deleteLiveTenantUser(profileId, tenant.isSuperAdmin ? null : tenant.schoolId);
    }

    try {
      await (supabase as any).from("audit_events").insert({
        action: "FACULTY_DELETED",
        entity_type: "staff",
        entity_id: id,
        school_id: recordSchoolId || tenant.schoolId,
        outcome: "success",
        metadata: {
          staff_number: targetRecord.staff_number,
          profile_id: profileId,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete faculty member." },
      { status: err.statusCode || 500 }
    );
  }
}
