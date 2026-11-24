import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  deleteLiveTenantUser,
  isValidUuid,
  provisionLiveTenantUser,
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
  scopeQueryBySchool,
  syncVirtualProfileAndRole,
} from "@/lib/admin/tenant-provisioning";
import { toPortalSchoolType } from "@/config/schoolPortalConfig";
import { resolveStaffEntityType } from "@/lib/id-numbering/config";
import {
  generateNextSchoolId,
  getSchoolIdSequences,
} from "@/lib/id-numbering/service";

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

const ADMIN_STAFF_ROLE_CODES = [
  "faculty_officer",
  "exams_officer",
  "registrar",
  "academic_affairs_officer",
  "admissions_officer",
  "finance_officer",
  "bursar",
  "accountant",
  "librarian",
  "hostel_officer",
  "matron",
  "storekeeper",
  "placement_coordinator",
  "school_admin",
  "secretary",
  "safety_officer",
  "hr_officer",
  "auditor",
  "system_admin",
] as const;

const FACULTY_TITLE_REGEX =
  /lecturer|professor|teacher|instructor|faculty|dean|academic advisor|fellow|researcher/i;

const VALID_EMPLOYMENT_TYPES = ["full_time", "part_time", "adjunct", "contract"] as const;
const VALID_STAFF_STATUSES = ["active", "on_leave", "terminated", "retired"] as const;

// GET: Fetch Institutional / Administrative & Operational Staff scoped to caller's school_id
export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const [
      staffRes,
      roleAssignRes,
      departmentsRes,
      rolesRes,
      empRecordsRes,
      liveStaffProfsRes,
      liveMemsRes,
      liveProfilesRes,
      liveSchoolRes,
      liveDeptsRes,
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
        (supabase as any)
          .from("departments")
          .select("id, name, code")
          .order("name", { ascending: true }),
        tenant.schoolId
      ),
      (supabase as any)
        .from("roles")
        .select("id, code, name, description")
        .in("code", [...ADMIN_STAFF_ROLE_CODES])
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
    ]);

    if (staffRes.error) {
      return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
    }

    const roleMap = new Map<string, { code: string; name: string }>();
    for (const row of roleAssignRes.data || []) {
      const r: any = Array.isArray((row as any).role) ? (row as any).role[0] : (row as any).role;
      if (row.user_id && r?.code) {
        const prev = roleMap.get(row.user_id);
        if (!prev || (ADMIN_STAFF_ROLE_CODES as readonly string[]).includes(r.code)) {
          roleMap.set(row.user_id, { code: r.code, name: r.name });
        }
      }
    }
    for (const m of liveMemsRes?.data || []) {
      const code = String(m?.role || m?.roles?.code || "").toLowerCase();
      if (m?.user_id && code) {
        roleMap.set(m.user_id, {
          code,
          name:
            m?.roles?.name ||
            code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        });
      }
    }

    const salaryByStaffId = new Map<string, string>();
    for (const emp of empRecordsRes.data || []) {
      if (emp.staff_id && emp.salary_grade && !salaryByStaffId.has(emp.staff_id)) {
        salaryByStaffId.set(emp.staff_id, emp.salary_grade);
      }
    }

    const adminStaffRows = (staffRes.data || []).filter((s: any) => {
      const assignedRole = roleMap.get(s.profile_id);
      if (
        assignedRole &&
        (ADMIN_STAFF_ROLE_CODES as readonly string[]).includes(assignedRole.code)
      ) {
        return !FACULTY_TITLE_REGEX.test(s.job_title || "");
      }
      const isFacultyRole =
        assignedRole && (FACULTY_ROLE_CODES as readonly string[]).includes(assignedRole.code);
      const isFacultyTitle = FACULTY_TITLE_REGEX.test(s.job_title || "");
      return !isFacultyRole && !isFacultyTitle;
    });

    const liveProfileMap = new Map<string, any>();
    for (const lp of liveProfilesRes?.data || []) {
      if (lp?.id) liveProfileMap.set(lp.id, lp);
    }

    const liveStaffByUserId = new Map<string, any>();
    for (const sp of liveStaffProfsRes?.data || []) {
      if (sp?.user_id) liveStaffByUserId.set(String(sp.user_id), sp);
    }

    const staff = adminStaffRows.map((s: any) => {
      const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
      const dept = Array.isArray(s.department) ? s.department[0] : s.department;
      const assignedRole = roleMap.get(s.profile_id);
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
        department_name: dept?.name || meta?.assigned_unit || liveSp?.department || "",
        department_code: dept?.code || "",
        job_title: s.job_title,
        employment_type: s.employment_type || liveSp?.employment_type || "full_time",
        hire_date: s.hire_date || liveSp?.hire_date || "",
        status: s.status,
        role_code:
          assignedRole &&
          (ADMIN_STAFF_ROLE_CODES as readonly string[]).includes(assignedRole.code)
            ? assignedRole.code
            : liveSp?.role_code || "hr_officer",
        role_name: meta?.school_type_role_label || assignedRole?.name || "Administrative Staff",
        salary_grade: salaryByStaffId.get(s.id) || liveSp?.salary_grade || "",
        metadata: meta,
        created_at: s.created_at,
      };
    });

    // Also include live staff_profiles not yet mirrored into virtual staff
    const seenProfileIds = new Set(staff.map((s: any) => s.profile_id));

    for (const sp of liveStaffProfsRes?.data || []) {
      if (!sp?.user_id || seenProfileIds.has(sp.user_id)) continue;
      const assignedRole = roleMap.get(sp.user_id);
      if (
        assignedRole &&
        !(ADMIN_STAFF_ROLE_CODES as readonly string[]).includes(assignedRole.code)
      ) {
        continue;
      }
      if (FACULTY_TITLE_REGEX.test(sp.designation || "")) continue;
      const lp = liveProfileMap.get(sp.user_id);
      const meta =
        (sp.metadata && typeof sp.metadata === "object" && Object.keys(sp.metadata).length > 0
          ? sp.metadata
          : lp?.metadata?.staff_profile) || {};

      staff.push({
        id: sp.id,
        profile_id: sp.user_id,
        staff_number: sp.staff_number || "",
        full_name: lp?.full_name || [sp.first_name, sp.last_name].filter(Boolean).join(" "),
        email: sp.email || lp?.email || "",
        phone: lp?.phone || sp.phone || "",
        department_id: sp.department_id || null,
        department_name: meta?.assigned_unit || sp.department || "",
        department_code: "",
        job_title: sp.designation || "Staff",
        employment_type: sp.employment_type || "full_time",
        hire_date: sp.hire_date || (sp.created_at ? String(sp.created_at).split("T")[0] : ""),
        status: sp.employment_status || "active",
        role_code: sp.role_code || assignedRole?.code || lp?.role || "hr_officer",
        role_name: meta?.school_type_role_label || assignedRole?.name || "Administrative Staff",
        salary_grade: sp.salary_grade || "",
        metadata: meta,
        created_at: sp.created_at,
      });
    }

    const deptById = new Map<string, any>();
    for (const d of [...(liveDeptsRes?.data || []), ...(departmentsRes.data || [])]) {
      if (d?.id && !deptById.has(String(d.id))) deptById.set(String(d.id), d);
    }

    const total = staff.length;
    const active = staff.filter((s: any) => s.status === "active").length;
    const onLeave = staff.filter((s: any) => s.status === "on_leave").length;
    const fullTime = staff.filter((s: any) => s.employment_type === "full_time").length;

    const rawSchoolType = liveSchoolRes?.data?.school_type || "university";
    const portalSchoolType = toPortalSchoolType(rawSchoolType);
    const nextIdInfo = tenant.schoolId
      ? await getSchoolIdSequences(tenant.schoolId, portalSchoolType).catch(
          () => null
        )
      : null;

    return NextResponse.json({
      staff,
      departments: Array.from(deptById.values()),
      roles: rolesRes.data || [],
      school_type: rawSchoolType,
      next_id_previews: nextIdInfo?.previewMap || {},
      stats: {
        total,
        active,
        onLeave,
        fullTime,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load institutional staff records." },
      { status: 500 }
    );
  }
}

// POST: Create Institutional Staff Member (Auth + Live Profile/Membership/Staff + Virtual DB)
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  let createdNewAuthUserId: string | null = null;
  let targetSchoolId: string | null = null;

  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    targetSchoolId = targetSchool.schoolId;

    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const autoGenerateId = Boolean(body.auto_generate_id);
    const manualStaffNumber = String(body.staff_number || "")
      .trim()
      .toUpperCase();
    const jobTitle = String(body.job_title || "").trim();
    const departmentId =
      body.department_id && isValidUuid(body.department_id)
        ? String(body.department_id).trim()
        : body.department_id
        ? String(body.department_id).trim()
        : null;
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
    const roleCode = (ADMIN_STAFF_ROLE_CODES as readonly string[]).includes(requestedRole)
      ? requestedRole
      : "hr_officer";
    const salaryGrade = body.salary_grade ? String(body.salary_grade).trim() : null;
    const metadata: Record<string, any> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const rawPassword = body.password ? String(body.password).trim() : "";

    if (!fullName || !email || !jobTitle) {
      return NextResponse.json(
        { error: "Full name, email, and job title are required." },
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

    const directAdmin = createDirectAdminClient();

    let staffNumber = manualStaffNumber;
    if (autoGenerateId || !staffNumber) {
      const { data: schoolRow } = await (directAdmin as any)
        .from("schools")
        .select("school_type")
        .eq("id", targetSchoolId)
        .maybeSingle();
      const portalSchoolType = toPortalSchoolType(schoolRow?.school_type);
      staffNumber = await generateNextSchoolId(
        targetSchoolId,
        resolveStaffEntityType(roleCode, portalSchoolType, false),
        { checkTable: "staff_profiles", idColumn: "staff_number" }
      );
    }

    // 1. Check duplicate staff_number within this school
    const [{ data: existingNumber }, { data: existingLiveNumber }] =
      await Promise.all([
        (supabase as any)
          .from("staff")
          .select("id")
          .eq("school_id", targetSchoolId)
          .eq("staff_number", staffNumber)
          .maybeSingle(),
        (directAdmin as any)
          .from("staff_profiles")
          .select("id")
          .eq("school_id", targetSchoolId)
          .eq("staff_number", staffNumber)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
      ]);

    if (existingNumber || existingLiveNumber) {
      return NextResponse.json(
        { error: `Staff ID "${staffNumber}" is already assigned to another staff member.` },
        { status: 400 }
      );
    }

    // Check existing staff record by email in virtual DB
    const { data: existingVProfile } = await (supabase as any)
      .from("profiles")
      .select("id, school_id")
      .eq("email", email)
      .maybeSingle();

    if (existingVProfile?.id) {
      const { data: alreadyStaff } = await (supabase as any)
        .from("staff")
        .select("id")
        .eq("profile_id", existingVProfile.id)
        .eq("school_id", targetSchoolId)
        .maybeSingle();

      if (alreadyStaff) {
        return NextResponse.json(
          { error: `A staff record already exists for "${email}".` },
          { status: 400 }
        );
      }
    }

    let departmentName: string | null = metadata.assigned_unit ? String(metadata.assigned_unit).trim() : null;
    if (departmentId && isValidUuid(departmentId)) {
      const { data: deptRow } = await (supabase as any)
        .from("departments")
        .select("name")
        .eq("id", departmentId)
        .maybeSingle();
      departmentName = deptRow?.name || departmentName;
      if (!deptRow?.name) {
        const { data: liveDept } = await (directAdmin as any)
          .from("departments")
          .select("name")
          .eq("id", departmentId)
          .maybeSingle();
        departmentName = liveDept?.name || departmentName;
      }
    }

    // 2. Provision Auth User + Live profiles + Live school_memberships + Live staff_profiles
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
        departmentName,
        departmentId: departmentId && isValidUuid(departmentId) ? departmentId : null,
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

    // 3. Upsert Virtual Profile & Role Assignment stamped with targetSchoolId
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

    // 4. Insert Virtual Staff Record stamped with targetSchoolId
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

    // 5. Insert Employment Record stamped with school_id
    await (supabase as any).from("employment_records").insert({
      school_id: targetSchool.schoolId,
      staff_id: createdStaff.id,
      contract_type: employmentType,
      start_date: hireDate,
      salary_grade: salaryGrade,
    });

    // 6. Audit Event
    try {
      await (supabase as any).from("audit_events").insert({
        action: "STAFF_CREATED",
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
      staff: createdStaff,
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
      { error: err.message || "Failed to register staff member." },
      { status: err.statusCode || 500 }
    );
  }
}

// PUT: Update Institutional Staff Member (Auth + Live Profile/Membership + Virtual DB)
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
    const roleCode = (ADMIN_STAFF_ROLE_CODES as readonly string[]).includes(requestedRole)
      ? requestedRole
      : "hr_officer";
    const salaryGrade = body.salary_grade ? String(body.salary_grade).trim() : null;
    const metadata: Record<string, any> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const rawPassword = body.password ? String(body.password).trim() : "";

    if (!id || !fullName || !email || !staffNumber || !jobTitle) {
      return NextResponse.json(
        { error: "Staff ID, full name, email, staff number, and job title are required." },
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
      return NextResponse.json({ error: "Staff record not found." }, { status: 404 });
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
        { error: "Forbidden: Cannot update a staff member from another school." },
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

    let departmentName: string | null = metadata.assigned_unit ? String(metadata.assigned_unit).trim() : null;
    if (departmentId && isValidUuid(departmentId)) {
      const { data: deptRow } = await (supabase as any)
        .from("departments")
        .select("name")
        .eq("id", departmentId)
        .maybeSingle();
      departmentName = deptRow?.name || departmentName;
      if (!deptRow?.name) {
        const { data: liveDept } = await (directAdmin as any)
          .from("departments")
          .select("name")
          .eq("id", departmentId)
          .maybeSingle();
        departmentName = liveDept?.name || departmentName;
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
          departmentName,
          departmentId: departmentId && isValidUuid(departmentId) ? departmentId : null,
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

    try {
      await (supabase as any).from("audit_events").insert({
        action: "STAFF_UPDATED",
        entity_type: "staff",
        entity_id: id,
        school_id: targetSchool.schoolId,
        outcome: "success",
        metadata: {
          staff_number: staffNumber,
          email,
          full_name: fullName,
          job_title: jobTitle,
          role_code: roleCode,
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
      { error: err.message || "Failed to update staff member." },
      { status: err.statusCode || 500 }
    );
  }
}

// DELETE: Clean dependent FK records and remove Staff + Profile + Auth User
export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Staff ID is required." }, { status: 400 });
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
      return NextResponse.json({ error: "Staff record not found." }, { status: 404 });
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
        { error: "Forbidden: Cannot delete a staff member from another school." },
        { status: 403 }
      );
    }

    if (profileId === PROTECTED_ADMIN_ID) {
      return NextResponse.json(
        { error: "Cannot delete the protected System Administrator profile." },
        { status: 403 }
      );
    }

    await (supabase as any)
      .from("teaching_assignments")
      .delete()
      .eq("staff_id", profileId);
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
        action: "STAFF_DELETED",
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
      { error: err.message || "Failed to delete staff member." },
      { status: err.statusCode || 500 }
    );
  }
}
