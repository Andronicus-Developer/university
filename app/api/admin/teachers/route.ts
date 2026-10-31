import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry } from "@/lib/supabase/fetch";

const PROTECTED_ADMIN_ID = "a0000000-0000-0000-0000-000000000001";
const PROTECTED_ADMIN_EMAIL = "admin@university.edu.gh";

const FACULTY_ROLE_CODES = [
  "lecturer",
  "dean",
  "head_of_department",
  "academic_advisor",
] as const;

const FACULTY_TITLE_REGEX =
  /lecturer|professor|teacher|instructor|faculty|dean|academic advisor|fellow|researcher/i;

const VALID_EMPLOYMENT_TYPES = ["full_time", "part_time", "adjunct", "contract"] as const;
const VALID_STAFF_STATUSES = ["active", "on_leave", "terminated", "retired"] as const;

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

async function syncTeacherCourses(
  supabase: ReturnType<typeof getAdminClient>,
  profileId: string,
  courseIds: string[]
) {
  // Remove existing teaching assignments for this faculty profile
  await supabase.from("teaching_assignments").delete().eq("staff_id", profileId);

  const uniqueCourseIds = Array.from(
    new Set((courseIds || []).map((c) => String(c || "").trim()).filter(Boolean))
  );
  if (uniqueCourseIds.length === 0) return;

  // Resolve active term (or latest term)
  const { data: activeTerm } = await supabase
    .from("terms")
    .select("id")
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeTerm?.id) return;

  for (const courseId of uniqueCourseIds) {
    // Find existing offering or create Section A offering for active term
    let offeringId: string | null = null;
    const { data: existingOffering } = await supabase
      .from("course_offerings")
      .select("id")
      .eq("term_id", activeTerm.id)
      .eq("course_id", courseId)
      .order("section", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingOffering?.id) {
      offeringId = existingOffering.id;
    } else {
      const { data: createdOffering } = await supabase
        .from("course_offerings")
        .insert({
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
      await supabase.from("teaching_assignments").insert({
        course_offering_id: offeringId,
        staff_id: profileId,
        role: "lecturer",
        is_primary: true,
      });
    }
  }
}

// GET: Fetch all Faculty & Teachers with departments, roles, assigned courses, and KPI stats
export async function GET() {
  try {
    const supabase = getAdminClient();

    const [
      staffRes,
      roleAssignRes,
      teachingRes,
      departmentsRes,
      coursesRes,
      rolesRes,
      empRecordsRes,
    ] = await Promise.all([
      supabase
        .from("staff")
        .select(
          `
          id,
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
      supabase
        .from("user_role_assignments")
        .select("user_id, role:role_id(id, code, name)")
        .eq("is_active", true),
      supabase.from("teaching_assignments").select(
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
      supabase.from("departments").select("id, name, code").order("name", { ascending: true }),
      supabase
        .from("courses")
        .select("id, code, name, department_id")
        .eq("is_active", true)
        .order("code", { ascending: true }),
      supabase
        .from("roles")
        .select("id, code, name")
        .in("code", [...FACULTY_ROLE_CODES])
        .order("name", { ascending: true }),
      supabase
        .from("employment_records")
        .select("id, staff_id, contract_type, salary_grade, start_date")
        .order("created_at", { ascending: false }),
    ]);

    if (staffRes.error) {
      return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
    }

    const roleMap = new Map<string, { code: string; name: string }>();
    for (const row of roleAssignRes.data || []) {
      const r: any = Array.isArray((row as any).role) ? (row as any).role[0] : (row as any).role;
      if (row.user_id && r?.code) {
        // Prefer academic faculty role if multiple exist
        const prev = roleMap.get(row.user_id);
        if (!prev || FACULTY_ROLE_CODES.includes(r.code)) {
          roleMap.set(row.user_id, { code: r.code, name: r.name });
        }
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

    const teachers = facultyRows.map((s: any) => {
      const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
      const dept = Array.isArray(s.department) ? s.department[0] : s.department;
      const assignedRole = roleMap.get(s.profile_id);
      const assignedCourses = coursesByProfile.get(s.profile_id) || [];

      return {
        id: s.id,
        profile_id: s.profile_id,
        staff_number: s.staff_number,
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        department_id: s.department_id || null,
        department_name: dept?.name || "",
        department_code: dept?.code || "",
        job_title: s.job_title,
        employment_type: s.employment_type,
        hire_date: s.hire_date,
        status: s.status,
        role_code:
          assignedRole && (FACULTY_ROLE_CODES as readonly string[]).includes(assignedRole.code)
            ? assignedRole.code
            : "lecturer",
        role_name: assignedRole?.name || "Lecturer",
        salary_grade: salaryByStaffId.get(s.id) || "",
        assigned_courses: assignedCourses,
        created_at: s.created_at,
      };
    });

    const total = teachers.length;
    const active = teachers.filter((t) => t.status === "active").length;
    const fullTime = teachers.filter((t) => t.employment_type === "full_time").length;
    const assignedCoursesCount = teachers.reduce(
      (sum, t) => sum + t.assigned_courses.length,
      0
    );

    return NextResponse.json({
      teachers,
      departments: departmentsRes.data || [],
      courses: coursesRes.data || [],
      roles: rolesRes.data || [],
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

// POST: Create a new Faculty Member (Auth + Profile + Role + Staff + Teaching Assignments)
export async function POST(req: NextRequest) {
  const supabase = getAdminClient();
  let createdAuthUserId: string | null = null;

  try {
    const body = await req.json();
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
    const roleCode = (FACULTY_ROLE_CODES as readonly string[]).includes(body.role_code)
      ? body.role_code
      : "lecturer";
    const salaryGrade = body.salary_grade ? String(body.salary_grade).trim() : null;
    const courseIds: string[] = Array.isArray(body.course_ids) ? body.course_ids : [];
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

    // 1. Check duplicate staff_number
    const { data: existingNumber } = await supabase
      .from("staff")
      .select("id")
      .eq("staff_number", staffNumber)
      .maybeSingle();

    if (existingNumber) {
      return NextResponse.json(
        { error: `Staff ID "${staffNumber}" is already assigned to another staff member.` },
        { status: 400 }
      );
    }

    // 2. Provision or resolve Auth User & Profile
    let profileId: string | null = null;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      const { data: alreadyStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("profile_id", existingProfile.id)
        .maybeSingle();

      if (alreadyStaff) {
        return NextResponse.json(
          { error: `A staff or faculty record already exists for "${email}".` },
          { status: 400 }
        );
      }
      profileId = existingProfile.id;

      if (rawPassword) {
        await supabase.auth.admin.updateUserById(existingProfile.id, {
          password: rawPassword,
          user_metadata: { full_name: fullName, role: roleCode },
        });
      }
    } else {
      const passwordToUse =
        rawPassword || `Fac#${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: passwordToUse,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: roleCode,
        },
      });

      if (authErr) {
        const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const matchedAuthUser = usersList?.users?.find(
          (u) => u.email?.toLowerCase() === email
        );
        if (!matchedAuthUser) {
          return NextResponse.json({ error: authErr.message }, { status: 400 });
        }
        profileId = matchedAuthUser.id;
      } else {
        profileId = authData.user.id;
        createdAuthUserId = profileId;
      }
    }

    // 3. Upsert Profile
    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: profileId!,
        email,
        full_name: fullName,
        phone,
        account_status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      if (createdAuthUserId) {
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      }
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // 4. Insert Staff Record
    const { data: createdStaff, error: staffErr } = await supabase
      .from("staff")
      .insert({
        profile_id: profileId!,
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
      if (createdAuthUserId) {
        await supabase.from("profiles").delete().eq("id", createdAuthUserId);
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      }
      return NextResponse.json({ error: staffErr.message }, { status: 400 });
    }

    // 5. Insert Employment Record
    await supabase.from("employment_records").insert({
      staff_id: createdStaff.id,
      contract_type: employmentType,
      start_date: hireDate,
      salary_grade: salaryGrade,
    });

    // 6. Assign RBAC Role
    const { data: roleRow } = await supabase
      .from("roles")
      .select("id")
      .eq("code", roleCode)
      .maybeSingle();

    if (roleRow?.id) {
      await supabase.from("user_role_assignments").delete().eq("user_id", profileId!);
      await supabase.from("user_role_assignments").insert({
        user_id: profileId!,
        role_id: roleRow.id,
        department_id: departmentId,
        is_active: true,
      });
    }

    // 7. Sync Teaching Assignments if courses were chosen
    if (courseIds.length > 0) {
      await syncTeacherCourses(supabase, profileId!, courseIds);
    }

    // 8. Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "FACULTY_CREATED",
        entity_type: "staff",
        entity_id: createdStaff.id,
        outcome: "success",
        metadata: {
          staff_number: staffNumber,
          email,
          full_name: fullName,
          job_title: jobTitle,
          role_code: roleCode,
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
    if (createdAuthUserId) {
      try {
        await supabase.from("profiles").delete().eq("id", createdAuthUserId);
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        // Ignore rollback failure
      }
    }
    return NextResponse.json(
      { error: err.message || "Failed to create faculty member." },
      { status: 500 }
    );
  }
}

// PUT: Update Faculty Member (Auth + Profile + Role + Staff + Employment Record + Courses)
export async function PUT(req: NextRequest) {
  try {
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
    const roleCode = (FACULTY_ROLE_CODES as readonly string[]).includes(body.role_code)
      ? body.role_code
      : "lecturer";
    const salaryGrade = body.salary_grade ? String(body.salary_grade).trim() : null;
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

    const supabase = getAdminClient();

    const { data: existingStaff, error: fetchErr } = await supabase
      .from("staff")
      .select("id, profile_id, staff_number")
      .eq("id", id)
      .single();

    if (fetchErr || !existingStaff) {
      return NextResponse.json({ error: "Faculty record not found." }, { status: 404 });
    }

    // Check duplicate staff_number
    const { data: conflictNumber } = await supabase
      .from("staff")
      .select("id")
      .eq("staff_number", staffNumber)
      .neq("id", id)
      .maybeSingle();

    if (conflictNumber) {
      return NextResponse.json(
        { error: `Staff ID "${staffNumber}" is already assigned to another staff member.` },
        { status: 400 }
      );
    }

    // Check duplicate email
    const { data: conflictEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", existingStaff.profile_id)
      .maybeSingle();

    if (conflictEmail) {
      return NextResponse.json(
        { error: `Email "${email}" is already in use by another account.` },
        { status: 400 }
      );
    }

    // Update Auth
    if (existingStaff.profile_id !== PROTECTED_ADMIN_ID) {
      const authUpdates: Record<string, any> = {
        email,
        user_metadata: {
          full_name: fullName,
          role: roleCode,
        },
      };
      if (rawPassword) {
        authUpdates.password = rawPassword;
      }
      await supabase.auth.admin.updateUserById(existingStaff.profile_id, authUpdates);
    }

    // Update Profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        phone,
        account_status: status === "terminated" ? "deactivated" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingStaff.profile_id);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // Update Staff row
    const { error: staffErr } = await supabase
      .from("staff")
      .update({
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

    // Sync Employment Record
    const { data: existingEmp } = await supabase
      .from("employment_records")
      .select("id")
      .eq("staff_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingEmp?.id) {
      await supabase
        .from("employment_records")
        .update({
          contract_type: employmentType,
          start_date: hireDate,
          salary_grade: salaryGrade,
        })
        .eq("id", existingEmp.id);
    } else {
      await supabase.from("employment_records").insert({
        staff_id: id,
        contract_type: employmentType,
        start_date: hireDate,
        salary_grade: salaryGrade,
      });
    }

    // Update RBAC Role (do not strip system_admin if protected admin)
    if (existingStaff.profile_id !== PROTECTED_ADMIN_ID) {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("code", roleCode)
        .maybeSingle();

      if (roleRow?.id) {
        await supabase
          .from("user_role_assignments")
          .delete()
          .eq("user_id", existingStaff.profile_id);
        await supabase.from("user_role_assignments").insert({
          user_id: existingStaff.profile_id,
          role_id: roleRow.id,
          department_id: departmentId,
          is_active: true,
        });
      }
    }

    // Sync Teaching Assignments when course_ids array is provided
    if (Array.isArray(body.course_ids)) {
      await syncTeacherCourses(supabase, existingStaff.profile_id, body.course_ids);
    }

    // Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "FACULTY_UPDATED",
        entity_type: "staff",
        entity_id: id,
        outcome: "success",
        metadata: {
          staff_number: staffNumber,
          email,
          full_name: fullName,
          job_title: jobTitle,
          status,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update faculty member." },
      { status: 500 }
    );
  }
}

// DELETE: Clean up Teaching Assignments, Staff Record, Profile, and Auth User
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Faculty ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: staffMember, error: fetchErr } = await supabase
      .from("staff")
      .select("id, profile_id, staff_number")
      .eq("id", id)
      .single();

    if (fetchErr || !staffMember) {
      return NextResponse.json({ error: "Faculty record not found." }, { status: 404 });
    }

    if (staffMember.profile_id === PROTECTED_ADMIN_ID) {
      return NextResponse.json(
        { error: "Cannot delete the protected System Administrator profile." },
        { status: 403 }
      );
    }

    // 1. Remove teaching assignments & HR child rows
    await supabase
      .from("teaching_assignments")
      .delete()
      .eq("staff_id", staffMember.profile_id);
    await supabase.from("employment_records").delete().eq("staff_id", id);

    // 2. Delete staff record
    const { error: delStaffErr } = await supabase.from("staff").delete().eq("id", id);
    if (delStaffErr) {
      return NextResponse.json({ error: delStaffErr.message }, { status: 400 });
    }

    // 3. Clean ON DELETE RESTRICT profile references & delete Profile + Auth User if not a student
    const { data: linkedStudent } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", staffMember.profile_id)
      .maybeSingle();

    if (!linkedStudent && staffMember.profile_id !== PROTECTED_ADMIN_ID) {
      await supabase.from("result_approvals").delete().eq("approver_id", staffMember.profile_id);
      await supabase
        .from("result_submissions")
        .delete()
        .eq("submitted_by", staffMember.profile_id);
      await supabase
        .from("timetable_publications")
        .delete()
        .eq("published_by", staffMember.profile_id);
      await supabase
        .from("enrolment_overrides")
        .delete()
        .eq("approved_by", staffMember.profile_id);
      await supabase
        .from("attendance_amendments")
        .delete()
        .eq("requested_by", staffMember.profile_id);
      await supabase
        .from("result_amendments")
        .delete()
        .eq("requested_by", staffMember.profile_id);
      await supabase
        .from("application_reviews")
        .delete()
        .eq("reviewer_id", staffMember.profile_id);
      await supabase
        .from("admission_decisions")
        .delete()
        .eq("decided_by", staffMember.profile_id);
      await supabase
        .from("maintenance_requests")
        .delete()
        .eq("reported_by", staffMember.profile_id);
      await supabase.from("waivers").delete().eq("approved_by", staffMember.profile_id);
      await supabase.from("refund_requests").delete().eq("requested_by", staffMember.profile_id);

      await supabase
        .from("user_role_assignments")
        .delete()
        .eq("user_id", staffMember.profile_id);
      await supabase.from("profiles").delete().eq("id", staffMember.profile_id);
      await supabase.auth.admin.deleteUser(staffMember.profile_id);
    }

    // 4. Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "FACULTY_DELETED",
        entity_type: "staff",
        entity_id: id,
        outcome: "success",
        metadata: {
          staff_number: staffMember.staff_number,
          profile_id: staffMember.profile_id,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete faculty member." },
      { status: 500 }
    );
  }
}
