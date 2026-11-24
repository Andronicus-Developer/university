import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";
import {
  listDepartments,
  listPrograms,
} from "@/lib/academics/departments-programs-service";
import {
  deleteLiveTenantUser,
  provisionLiveTenantUser,
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
  scopeQueryBySchool,
  syncVirtualProfileAndRole,
} from "@/lib/admin/tenant-provisioning";
import {
  normalizeStudentGender,
  upsertLiveStudentRecord,
  upsertParentGuardianForStudent,
} from "@/lib/admin/parent-guardian-sync";
import { toPortalSchoolType } from "@/config/schoolPortalConfig";
import { resolveLearnerEntityType } from "@/lib/id-numbering/config";
import {
  generateNextSchoolId,
  getSchoolIdSequences,
} from "@/lib/id-numbering/service";

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "Student", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

const PROTECTED_ADMIN_ID = "a0000000-0000-0000-0000-000000000001";
const PROTECTED_ADMIN_EMAIL = "admin@university.edu.gh";

const VALID_STUDENT_STATUSES = [
  "admitted",
  "active",
  "deferred",
  "leave_of_absence",
  "suspended",
  "withdrawn",
  "completed",
  "graduated",
  "deceased",
] as const;

const VALID_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800] as const;

// GET: Fetch all students with real profiles, programmes, terms, and dynamic KPI metrics scoped to school_id
export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const supabase = createAdminClient();
    const directAdmin = createDirectAdminClient();

    const [
      liveStudentsRes,
      liveProfilesRes,
      studentsRes,
      progRes,
      deptRes,
      termsRes,
      liveTermsRes,
      liveSchoolRes,
      liveIntakesRes,
      liveHostelsRes,
    ] = await Promise.all([
      tenant.schoolId
        ? (directAdmin as any)
            .from("students")
            .select("*")
            .eq("school_id", tenant.schoolId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("profiles")
            .select("id, full_name, email, phone, account_status, metadata")
            .eq("school_id", tenant.schoolId)
        : Promise.resolve({ data: [], error: null }),
      scopeQueryBySchool(
        (supabase as any)
          .from("students")
          .select(
            `
          id,
          school_id,
          profile_id,
          student_number,
          programme_id,
          department_id,
          entry_term_id,
          current_term_id,
          cohort_year,
          admission_date,
          status,
          current_level,
          gpa,
          cgpa,
          metadata,
          created_at,
          updated_at,
          profile:profile_id(id, full_name, email, phone, account_status),
          programme:programme_id(id, name, code, degree_level),
          entry_term:entry_term_id(id, name, code)
        `
          )
          .order("created_at", { ascending: false }),
        tenant.schoolId
      ),
      listPrograms(tenant.schoolId).catch(() => ({ programs: [], school_type: "university" })),
      listDepartments(tenant.schoolId).catch(() => ({ departments: [], school_type: "university" })),
      scopeQueryBySchool(
        (supabase as any)
          .from("terms")
          .select("id, name, code, is_active, start_date")
          .order("start_date", { ascending: false }),
        tenant.schoolId
      ),
      tenant.schoolId
        ? (directAdmin as any)
            .from("terms")
            .select("id, name, code, is_active, start_date")
            .eq("school_id", tenant.schoolId)
            .order("start_date", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
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
            .from("vocational_intakes")
            .select("id, code, name, department_id, status")
            .eq("school_id", tenant.schoolId)
            .order("start_date", { ascending: false })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      tenant.schoolId
        ? (directAdmin as any)
            .from("hostels")
            .select("id, code, name, gender_policy, is_active")
            .eq("school_id", tenant.schoolId)
            .order("name", { ascending: true })
            .then((r: any) => r, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]);

    const liveProfMap = new Map<string, any>();
    for (const lp of liveProfilesRes?.data || []) {
      liveProfMap.set(String(lp.id), lp);
    }

    const progMap = new Map<string, any>();
    for (const pr of progRes?.programs || []) {
      progMap.set(String(pr.id), pr);
    }

    const deptMap = new Map<string, any>();
    for (const dp of deptRes?.departments || []) {
      deptMap.set(String(dp.id), dp);
    }

    const virtualStudents = Array.isArray(studentsRes?.data) ? studentsRes.data : [];
    const liveStudents = Array.isArray(liveStudentsRes?.data) ? liveStudentsRes.data : [];

    const mergedById = new Map<string, any>();

    for (const s of liveStudents) {
      const liveProf = s.profile_id ? liveProfMap.get(String(s.profile_id)) : null;
      const prog = s.programme_id ? progMap.get(String(s.programme_id)) : null;
      const dept = s.department_id ? deptMap.get(String(s.department_id)) : null;
      const fullName =
        `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
        liveProf?.full_name ||
        "";
      const meta =
        s.metadata && typeof s.metadata === "object" && Object.keys(s.metadata).length > 0
          ? s.metadata
          : liveProf?.metadata?.student_profile || {};

      mergedById.set(String(s.id), {
        id: s.id,
        profile_id: s.profile_id || "",
        student_number: s.student_number,
        full_name: fullName,
        email: s.email || liveProf?.email || "",
        phone: s.phone || liveProf?.phone || "",
        gender: s.gender || meta?.gender || "other",
        account_status: liveProf?.account_status || "active",
        programme_id: s.programme_id || null,
        programme_name: prog?.name || dept?.name || "",
        programme_code: prog?.code || dept?.code || "",
        department_id: s.department_id || null,
        department_name: dept?.name || "",
        intake_id: s.intake_id || null,
        degree_level: prog?.degree_level || "",
        entry_term_id: s.entry_term_id || null,
        entry_term_name: "",
        cohort_year: Number(s.cohort_year) || new Date(s.enrolled_at || s.created_at || Date.now()).getFullYear(),
        current_level: Number(s.current_level) || 100,
        status: s.status || "active",
        admission_date: (s.enrolled_at || s.created_at || "").slice(0, 10),
        gpa: Number(s.gpa ?? 0),
        cgpa: Number(s.cgpa ?? 0),
        metadata: meta,
        created_at: s.created_at,
        updated_at: s.updated_at,
      });
    }

    for (const s of virtualStudents) {
      const idKey = String(s.id);
      if (mergedById.has(idKey)) continue;
      const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
      const liveProf = s.profile_id ? liveProfMap.get(String(s.profile_id)) : null;
      const programme = Array.isArray(s.programme) ? s.programme[0] : s.programme;
      const progLookup = s.programme_id ? progMap.get(String(s.programme_id)) : null;
      const deptLookup = s.department_id ? deptMap.get(String(s.department_id)) : null;
      const entryTerm = Array.isArray(s.entry_term) ? s.entry_term[0] : s.entry_term;
      const meta =
        s.metadata && typeof s.metadata === "object" && Object.keys(s.metadata).length > 0
          ? s.metadata
          : liveProf?.metadata?.student_profile || {};

      mergedById.set(idKey, {
        id: s.id,
        profile_id: s.profile_id,
        student_number: s.student_number,
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        gender: meta?.gender || "other",
        account_status: profile?.account_status || "active",
        programme_id: s.programme_id,
        programme_name: programme?.name || progLookup?.name || deptLookup?.name || "",
        programme_code: programme?.code || progLookup?.code || deptLookup?.code || "",
        department_id: s.department_id || null,
        department_name: deptLookup?.name || "",
        intake_id: s.intake_id || meta?.intake_id || null,
        degree_level: programme?.degree_level || progLookup?.degree_level || "",
        entry_term_id: s.entry_term_id || null,
        entry_term_name: entryTerm?.name || "",
        cohort_year: Number(s.cohort_year),
        current_level: Number(s.current_level) || 100,
        status: s.status,
        admission_date: s.admission_date,
        gpa: Number(s.gpa ?? 0),
        cgpa: Number(s.cgpa ?? 0),
        metadata: meta,
        created_at: s.created_at,
        updated_at: s.updated_at,
      });
    }

    const students = Array.from(mergedById.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const mergedTerms =
      Array.isArray(liveTermsRes?.data) && liveTermsRes.data.length > 0
        ? liveTermsRes.data
        : termsRes.data || [];

    const resolvedSchoolType =
      liveSchoolRes?.data?.school_type ||
      (progRes as any)?.school_type ||
      (deptRes as any)?.school_type ||
      "university";
    const portalSchoolType = toPortalSchoolType(resolvedSchoolType);
    const learnerEntity = resolveLearnerEntityType(portalSchoolType);
    const nextIdInfo = tenant.schoolId
      ? await getSchoolIdSequences(tenant.schoolId, portalSchoolType).catch(
          () => null
        )
      : null;

    const total = students.length;
    const active = students.filter((s: any) => s.status === "active").length;
    const admitted = students.filter((s: any) => s.status === "admitted").length;
    const graduated = students.filter(
      (s: any) => s.status === "graduated" || s.status === "completed"
    ).length;
    const inactive = students.filter((s: any) =>
      ["deferred", "leave_of_absence", "suspended", "withdrawn", "deceased"].includes(s.status)
    ).length;
    const avgCgpa =
      total > 0
        ? Number((students.reduce((sum: number, s: any) => sum + (s.cgpa || 0), 0) / total).toFixed(2))
        : 0;

    return NextResponse.json({
      students,
      programmes: progRes?.programs || [],
      departments: deptRes?.departments || [],
      terms: mergedTerms,
      intakes: liveIntakesRes?.data || [],
      hostels: liveHostelsRes?.data || [],
      school_type: resolvedSchoolType,
      next_student_id_preview: nextIdInfo?.previewMap?.[learnerEntity] || null,
      stats: {
        total,
        active,
        admitted,
        graduated,
        inactive,
        avgCgpa,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load student records." },
      { status: 500 }
    );
  }
}

// POST: Provision Auth User + Live Profile/Membership + Virtual Profile + Student Record
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
    const autoGenerateId = Boolean(body.auto_generate_id);
    const manualStudentNumber = String(body.student_number || "")
      .trim()
      .toUpperCase();
    const programmeId = String(body.programme_id || "").trim() || null;
    const departmentId = String(body.department_id || "").trim() || null;
    const intakeId = String(body.intake_id || "").trim() || null;
    const entryTermId = body.entry_term_id ? String(body.entry_term_id).trim() : null;
    const cohortYear = Number(body.cohort_year) || new Date().getFullYear();
    const currentLevel = VALID_LEVELS.includes(Number(body.current_level) as any)
      ? Number(body.current_level)
      : 100;
    const status = VALID_STUDENT_STATUSES.includes(body.status) ? body.status : "active";
    const admissionDate =
      body.admission_date && String(body.admission_date).trim()
        ? String(body.admission_date).trim()
        : new Date().toISOString().split("T")[0];
    const gpa = Math.min(4, Math.max(0, Number(body.gpa ?? 0) || 0));
    const cgpa = Math.min(4, Math.max(0, Number(body.cgpa ?? 0) || 0));
    const rawPassword = body.password ? String(body.password).trim() : "";
    const rawMeta: Record<string, any> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const gender = normalizeStudentGender(body.gender || rawMeta.gender);
    const metadata: Record<string, any> = {
      ...rawMeta,
      gender,
      ...(intakeId ? { intake_id: intakeId } : {}),
    };
    const guardianName = String(
      metadata.guardian_name ||
        metadata.parent_name ||
        body.guardian_name ||
        body.parent_name ||
        ""
    ).trim();
    const createParentRecord =
      guardianName.length > 0 && body.create_parent_record !== false;
    const createParentPortalAccount = Boolean(body.create_parent_portal_account);
    const parentPassword = body.parent_password ? String(body.parent_password).trim() : "";

    if (!fullName || !email) {
      return NextResponse.json(
        {
          error: "Full name and institutional email are required.",
        },
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
        { error: "Cannot register the protected System Administrator account as a student." },
        { status: 400 }
      );
    }

    const directAdmin = createDirectAdminClient();

    let studentNumber = manualStudentNumber;
    if (autoGenerateId || !studentNumber) {
      const { data: schoolRow } = await (directAdmin as any)
        .from("schools")
        .select("school_type")
        .eq("id", targetSchool.schoolId)
        .maybeSingle();
      const portalSchoolType = toPortalSchoolType(schoolRow?.school_type);
      studentNumber = await generateNextSchoolId(
        targetSchool.schoolId,
        resolveLearnerEntityType(portalSchoolType),
        { checkTable: "students", idColumn: "student_number" }
      );
    }

    const [{ data: existingNumber }, { data: existingLiveNumber }] =
      await Promise.all([
        (supabase as any)
          .from("students")
          .select("id")
          .eq("school_id", targetSchool.schoolId)
          .eq("student_number", studentNumber)
          .maybeSingle(),
        (directAdmin as any)
          .from("students")
          .select("id")
          .eq("school_id", targetSchool.schoolId)
          .eq("student_number", studentNumber)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
      ]);

    if (existingNumber || existingLiveNumber) {
      return NextResponse.json(
        { error: `Student number "${studentNumber}" is already assigned to another student.` },
        { status: 400 }
      );
    }

    const { data: existingVProfile } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingVProfile?.id) {
      const { data: alreadyStudent } = await (supabase as any)
        .from("students")
        .select("id")
        .eq("profile_id", existingVProfile.id)
        .eq("school_id", targetSchool.schoolId)
        .maybeSingle();

      if (alreadyStudent) {
        return NextResponse.json(
          { error: `A student record already exists for "${email}".` },
          { status: 400 }
        );
      }
    }

    const accountStatus = ["suspended", "withdrawn", "deceased"].includes(status)
      ? "suspended"
      : "active";

    const provisioned = await provisionLiveTenantUser({
      email,
      password: rawPassword || undefined,
      fullName,
      phone,
      roleCode: "student",
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus,
      existingUserId: existingVProfile?.id || null,
      extraMetadata: {
        student_profile: {
          ...metadata,
          student_number: studentNumber,
        },
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
      roleCode: "student",
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus,
    });

    let resolvedTermId = entryTermId;
    if (!resolvedTermId) {
      const { data: activeTerm } = await (supabase as any)
        .from("terms")
        .select("id")
        .eq("school_id", targetSchool.schoolId)
        .order("is_active", { ascending: false })
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedTermId = activeTerm?.id || null;
    }

    const newStudentId = crypto.randomUUID();
    const { first_name, last_name } = splitFullName(fullName);

    const { data: createdStudent, error: studentErr } = await (supabase as any)
      .from("students")
      .insert({
        id: newStudentId,
        school_id: targetSchool.schoolId,
        university_id: targetSchool.schoolId,
        profile_id: profileId,
        student_number: studentNumber,
        first_name,
        last_name,
        email,
        phone,
        programme_id: programmeId,
        department_id: departmentId,
        intake_id: intakeId,
        entry_term_id: resolvedTermId,
        current_term_id: resolvedTermId,
        cohort_year: cohortYear,
        current_level: currentLevel,
        status,
        admission_date: admissionDate,
        gpa,
        cgpa,
        metadata,
      })
      .select("id, student_number")
      .single();

    if (studentErr) {
      if (createdNewAuthUserId) {
        await deleteLiveTenantUser(createdNewAuthUserId, null);
        await (supabase as any).from("profiles").delete().eq("id", createdNewAuthUserId);
      }
      return NextResponse.json({ error: studentErr.message }, { status: 400 });
    }

    // Mirror cleanly into live Postgres `public.students` and sync Parent/Guardian record
    const savedStudentId = createdStudent.id || newStudentId;

    const liveStuRes = await upsertLiveStudentRecord(directAdmin, {
      id: savedStudentId,
      school_id: targetSchool.schoolId,
      profile_id: profileId,
      student_number: studentNumber,
      first_name,
      last_name,
      email,
      phone,
      gender,
      programme_id: programmeId,
      department_id: departmentId,
      intake_id: intakeId,
      current_level: currentLevel,
      entry_term_id: resolvedTermId,
      cohort_year: cohortYear,
      status,
      enrolled_at: admissionDate,
      metadata,
    });

    if (!liveStuRes.ok) {
      console.warn("Could not mirror student insert to live public.students:", liveStuRes.error);
    }

    let parentResult: {
      record: any | null;
      linkedExistingParent: boolean;
      provisionedPortalAccount: boolean;
      warning: string | null;
    } | null = null;

    if (createParentRecord && guardianName) {
      parentResult = await upsertParentGuardianForStudent({
        directAdmin,
        virtualAdmin: supabase,
        schoolId: targetSchool.schoolId,
        schoolName: targetSchool.schoolName,
        schoolCode: targetSchool.schoolCode,
        studentId: savedStudentId,
        liveStudentExists: liveStuRes.ok,
        fullName: guardianName,
        relationship:
          metadata.guardian_relationship || metadata.parent_relationship || "Parent",
        phone: metadata.guardian_phone || metadata.parent_phone || "",
        email: metadata.guardian_email || metadata.parent_email || "",
        isPrimaryContact: true,
        status: "active",
        createPortalAccount: createParentPortalAccount,
        parentPassword,
      });

      if (parentResult.warning) {
        console.warn("Parent/guardian sync warning on student create:", parentResult.warning);
      }
    }

    const parentWarning =
      [
        !liveStuRes.ok ? `Live student sync issue: ${liveStuRes.error}` : null,
        parentResult?.warning || null,
      ]
        .filter(Boolean)
        .join("; ") || null;

    try {
      await (supabase as any).from("student_status_history").insert({
        school_id: targetSchool.schoolId,
        student_id: createdStudent.id,
        old_status: null,
        new_status: status,
        reason: "Initial student registration by System Administrator",
      });
      await (supabase as any).from("audit_events").insert({
        action: "STUDENT_CREATED",
        entity_type: "students",
        entity_id: createdStudent.id,
        school_id: targetSchool.schoolId,
        outcome: "success",
        metadata: {
          student_number: studentNumber,
          email,
          full_name: fullName,
          programme_id: programmeId,
          school_id: targetSchool.schoolId,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({
      success: true,
      student: createdStudent,
      parent_guardian: parentResult?.record || null,
      linked_existing_parent: Boolean(parentResult?.linkedExistingParent),
      parent_warning: parentWarning,
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
      { error: err.message || "Failed to create student." },
      { status: err.statusCode || 500 }
    );
  }
}

// PUT: Update existing Student, Live Profile/Membership, Virtual Profile, and Auth credentials
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
    const studentNumber = String(body.student_number || "")
      .trim()
      .toUpperCase();
    const programmeId = String(body.programme_id || "").trim() || null;
    const departmentId = String(body.department_id || "").trim() || null;
    const intakeId = String(body.intake_id || "").trim() || null;
    const entryTermId = body.entry_term_id ? String(body.entry_term_id).trim() : null;
    const cohortYear = Number(body.cohort_year) || new Date().getFullYear();
    const currentLevel = VALID_LEVELS.includes(Number(body.current_level) as any)
      ? Number(body.current_level)
      : 100;
    const status = VALID_STUDENT_STATUSES.includes(body.status) ? body.status : "active";
    const admissionDate =
      body.admission_date && String(body.admission_date).trim()
        ? String(body.admission_date).trim()
        : new Date().toISOString().split("T")[0];
    const gpa = Math.min(4, Math.max(0, Number(body.gpa ?? 0) || 0));
    const cgpa = Math.min(4, Math.max(0, Number(body.cgpa ?? 0) || 0));
    const rawPassword = body.password ? String(body.password).trim() : "";
    const rawMeta: Record<string, any> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    const gender = normalizeStudentGender(body.gender || rawMeta.gender);
    const metadata: Record<string, any> = {
      ...rawMeta,
      gender,
      ...(intakeId ? { intake_id: intakeId } : {}),
    };
    const guardianName = String(
      metadata.guardian_name ||
        metadata.parent_name ||
        body.guardian_name ||
        body.parent_name ||
        ""
    ).trim();
    const createParentRecord =
      guardianName.length > 0 && body.create_parent_record !== false;
    const createParentPortalAccount = Boolean(body.create_parent_portal_account);
    const parentPassword = body.parent_password ? String(body.parent_password).trim() : "";

    if (!id || !fullName || !email || !studentNumber) {
      return NextResponse.json(
        {
          error:
            "Student ID, full name, email, and student number are required.",
        },
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

    const { data: existingVirtualStudent } = await (supabase as any)
      .from("students")
      .select("id, school_id, university_id, profile_id, student_number, status, programme_id")
      .eq("id", id)
      .maybeSingle();

    const { data: existingLiveStudent } = !existingVirtualStudent
      ? await (directAdmin as any)
          .from("students")
          .select("id, school_id, profile_id, student_number, status, programme_id")
          .eq("id", id)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null }))
      : { data: null };

    const existingStudent = existingVirtualStudent || existingLiveStudent;
    if (!existingStudent) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    const recordSchoolId =
      existingStudent.school_id || existingStudent.university_id || null;

    if (
      !tenant.isSuperAdmin &&
      recordSchoolId &&
      tenant.schoolId &&
      String(recordSchoolId).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot update a student from another school." },
        { status: 403 }
      );
    }

    const targetSchool = await resolveTargetSchoolForMutation(
      tenant,
      recordSchoolId || body.school_id
    );
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const { data: conflictNumber } = await (supabase as any)
      .from("students")
      .select("id")
      .eq("school_id", targetSchool.schoolId)
      .eq("student_number", studentNumber)
      .neq("id", id)
      .maybeSingle();

    if (conflictNumber) {
      return NextResponse.json(
        { error: `Student number "${studentNumber}" is already assigned to another student.` },
        { status: 400 }
      );
    }

    const { data: conflictEmail } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", existingStudent.profile_id)
      .maybeSingle();

    if (conflictEmail) {
      return NextResponse.json(
        { error: `Email "${email}" is already in use by another account.` },
        { status: 400 }
      );
    }

    const accountStatus = ["suspended", "withdrawn", "deceased"].includes(status)
      ? "suspended"
      : "active";

    await provisionLiveTenantUser({
      existingUserId: existingStudent.profile_id || null,
      email,
      password: rawPassword || undefined,
      fullName,
      phone,
      roleCode: "student",
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus,
      extraMetadata: {
        student_profile: {
          ...metadata,
          student_number: studentNumber,
        },
      },
    });

    await syncVirtualProfileAndRole(supabase, {
      userId: existingStudent.profile_id,
      email,
      fullName,
      phone,
      roleCode: "student",
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus,
    });

    const { first_name, last_name } = splitFullName(fullName);
    const studentUpdates: Record<string, any> = {
      school_id: targetSchool.schoolId,
      university_id: targetSchool.schoolId,
      student_number: studentNumber,
      first_name,
      last_name,
      email,
      phone,
      programme_id: programmeId,
      department_id: departmentId,
      intake_id: intakeId,
      cohort_year: cohortYear,
      current_level: currentLevel,
      status,
      admission_date: admissionDate,
      gpa,
      cgpa,
      metadata,
      updated_at: new Date().toISOString(),
    };
    if (entryTermId) {
      studentUpdates.entry_term_id = entryTermId;
    }

    if (existingVirtualStudent) {
      const { error: updateErr } = await (supabase as any)
        .from("students")
        .update(studentUpdates)
        .eq("id", id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    }

    // Mirror update into live Postgres `public.students` and sync Parent/Guardian
    const liveUpdRes = await upsertLiveStudentRecord(directAdmin, {
      id,
      school_id: targetSchool.schoolId,
      profile_id: existingStudent.profile_id || null,
      student_number: studentNumber,
      first_name,
      last_name,
      email,
      phone,
      gender,
      programme_id: programmeId,
      department_id: departmentId,
      intake_id: intakeId,
      current_level: currentLevel,
      entry_term_id: entryTermId || undefined,
      cohort_year: cohortYear,
      status,
      enrolled_at: admissionDate,
      metadata,
    });

    if (!liveUpdRes.ok) {
      console.warn("Could not mirror student update to live public.students:", liveUpdRes.error);
    }

    let parentResult: {
      record: any | null;
      linkedExistingParent: boolean;
      provisionedPortalAccount: boolean;
      warning: string | null;
    } | null = null;

    if (createParentRecord && guardianName) {
      parentResult = await upsertParentGuardianForStudent({
        directAdmin,
        virtualAdmin: supabase,
        schoolId: targetSchool.schoolId,
        schoolName: targetSchool.schoolName,
        schoolCode: targetSchool.schoolCode,
        studentId: id,
        liveStudentExists: liveUpdRes.ok,
        fullName: guardianName,
        relationship:
          metadata.guardian_relationship || metadata.parent_relationship || "Parent",
        phone: metadata.guardian_phone || metadata.parent_phone || "",
        email: metadata.guardian_email || metadata.parent_email || "",
        isPrimaryContact: true,
        status: "active",
        createPortalAccount: createParentPortalAccount,
        parentPassword,
      });

      if (parentResult.warning) {
        console.warn("Parent/guardian upsert warning on student update:", parentResult.warning);
      }
    }

    const parentWarning =
      [
        !liveUpdRes.ok ? `Live student sync issue: ${liveUpdRes.error}` : null,
        parentResult?.warning || null,
      ]
        .filter(Boolean)
        .join("; ") || null;

    try {
      if (existingStudent.status !== status) {
        await (supabase as any).from("student_status_history").insert({
          school_id: targetSchool.schoolId,
          student_id: id,
          old_status: existingStudent.status,
          new_status: status,
          reason: "Updated by System Administrator",
        });
      }
      if (existingStudent.programme_id !== programmeId) {
        await (supabase as any).from("student_programme_history").insert({
          school_id: targetSchool.schoolId,
          student_id: id,
          old_programme_id: existingStudent.programme_id,
          new_programme_id: programmeId,
          reason: "Programme updated by System Administrator",
        });
      }
      await (supabase as any).from("audit_events").insert({
        action: "STUDENT_UPDATED",
        entity_type: "students",
        entity_id: id,
        school_id: targetSchool.schoolId,
        outcome: "success",
        metadata: {
          student_number: studentNumber,
          email,
          full_name: fullName,
          status,
          school_id: targetSchool.schoolId,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({
      success: true,
      parent_guardian: parentResult?.record || null,
      linked_existing_parent: Boolean(parentResult?.linkedExistingParent),
      parent_warning: parentWarning,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update student." },
      { status: err.statusCode || 500 }
    );
  }
}

// DELETE: Clean dependent FK records and delete Student + Profile + Auth User
export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: student, error: fetchErr } = await (supabase as any)
      .from("students")
      .select("id, school_id, university_id, profile_id, student_number")
      .eq("id", id)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    const recordSchoolId = student.school_id || student.university_id || null;

    if (
      !tenant.isSuperAdmin &&
      recordSchoolId &&
      tenant.schoolId &&
      String(recordSchoolId).toLowerCase() !== tenant.schoolId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Forbidden: Cannot delete a student from another school." },
        { status: 403 }
      );
    }

    if (student.profile_id === PROTECTED_ADMIN_ID) {
      return NextResponse.json(
        { error: "Cannot delete the protected System Administrator profile." },
        { status: 403 }
      );
    }

    await (supabase as any).from("refund_requests").delete().eq("student_id", id);
    await (supabase as any).from("receipts").delete().eq("student_id", id);

    const { data: studentPayments } = await (supabase as any)
      .from("payments")
      .select("id")
      .eq("student_id", id);
    const paymentIds = (studentPayments || []).map((p: any) => p.id);
    if (paymentIds.length > 0) {
      await (supabase as any).from("payment_allocations").delete().in("payment_id", paymentIds);
    }

    const { data: studentInvoices } = await (supabase as any)
      .from("student_invoices")
      .select("id")
      .eq("student_id", id);
    const invoiceIds = (studentInvoices || []).map((inv: any) => inv.id);
    if (invoiceIds.length > 0) {
      await (supabase as any).from("payment_allocations").delete().in("invoice_id", invoiceIds);
    }

    await (supabase as any).from("payments").delete().eq("student_id", id);
    await (supabase as any).from("waivers").delete().eq("student_id", id);
    await (supabase as any).from("student_invoices").delete().eq("student_id", id);
    await (supabase as any).from("course_enrolments").delete().eq("student_id", id);

    const { error: delStudentErr } = await (supabase as any).from("students").delete().eq("id", id);
    if (delStudentErr) {
      return NextResponse.json({ error: delStudentErr.message }, { status: 400 });
    }

    try {
      const directAdmin = createDirectAdminClient();
      await (directAdmin as any)
        .from("students")
        .delete()
        .eq("id", id)
        .eq("school_id", recordSchoolId || tenant.schoolId);
    } catch {}

    const { data: linkedStaff } = await (supabase as any)
      .from("staff")
      .select("id")
      .eq("profile_id", student.profile_id)
      .maybeSingle();

    if (!linkedStaff && student.profile_id !== PROTECTED_ADMIN_ID) {
      await (supabase as any).from("maintenance_requests").delete().eq("reported_by", student.profile_id);
      await (supabase as any).from("refund_requests").delete().eq("requested_by", student.profile_id);
      await (supabase as any)
        .from("attendance_amendments")
        .delete()
        .eq("requested_by", student.profile_id);
      await (supabase as any).from("result_amendments").delete().eq("requested_by", student.profile_id);
      await (supabase as any).from("user_role_assignments").delete().eq("user_id", student.profile_id);
      await (supabase as any).from("profiles").delete().eq("id", student.profile_id);

      await deleteLiveTenantUser(student.profile_id, tenant.isSuperAdmin ? null : tenant.schoolId);
    }

    try {
      await (supabase as any).from("audit_events").insert({
        action: "STUDENT_DELETED",
        entity_type: "students",
        entity_id: id,
        school_id: recordSchoolId || tenant.schoolId,
        outcome: "success",
        metadata: {
          student_number: student.student_number,
          profile_id: student.profile_id,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete student." },
      { status: err.statusCode || 500 }
    );
  }
}
