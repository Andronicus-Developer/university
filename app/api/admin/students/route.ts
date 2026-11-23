import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const [studentsRes, programmesRes, termsRes] = await Promise.all([
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
          entry_term_id,
          current_term_id,
          cohort_year,
          admission_date,
          status,
          current_level,
          gpa,
          cgpa,
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
      scopeQueryBySchool(
        (supabase as any)
          .from("programmes")
          .select("id, name, code, degree_level, is_active")
          .order("name", { ascending: true }),
        tenant.schoolId
      ),
      scopeQueryBySchool(
        (supabase as any)
          .from("terms")
          .select("id, name, code, is_active, start_date")
          .order("start_date", { ascending: false }),
        tenant.schoolId
      ),
    ]);

    if (studentsRes.error) {
      return NextResponse.json({ error: studentsRes.error.message }, { status: 500 });
    }

    const students = (studentsRes.data || []).map((s: any) => {
      const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
      const programme = Array.isArray(s.programme) ? s.programme[0] : s.programme;
      const entryTerm = Array.isArray(s.entry_term) ? s.entry_term[0] : s.entry_term;

      return {
        id: s.id,
        profile_id: s.profile_id,
        student_number: s.student_number,
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        account_status: profile?.account_status || "active",
        programme_id: s.programme_id,
        programme_name: programme?.name || "",
        programme_code: programme?.code || "",
        degree_level: programme?.degree_level || "",
        entry_term_id: s.entry_term_id || null,
        entry_term_name: entryTerm?.name || "",
        cohort_year: Number(s.cohort_year),
        current_level: Number(s.current_level) || 100,
        status: s.status,
        admission_date: s.admission_date,
        gpa: Number(s.gpa ?? 0),
        cgpa: Number(s.cgpa ?? 0),
        created_at: s.created_at,
        updated_at: s.updated_at,
      };
    });

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
      programmes: programmesRes.data || [],
      terms: termsRes.data || [],
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
    const studentNumber = String(body.student_number || "")
      .trim()
      .toUpperCase();
    const programmeId = String(body.programme_id || "").trim();
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

    if (!fullName || !email || !studentNumber || !programmeId) {
      return NextResponse.json(
        {
          error:
            "Full name, institutional email, student number, and academic programme are required.",
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

    const { data: existingNumber } = await (supabase as any)
      .from("students")
      .select("id")
      .eq("school_id", targetSchool.schoolId)
      .eq("student_number", studentNumber)
      .maybeSingle();

    if (existingNumber) {
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

    const { data: createdStudent, error: studentErr } = await (supabase as any)
      .from("students")
      .insert({
        school_id: targetSchool.schoolId,
        university_id: targetSchool.schoolId,
        profile_id: profileId,
        student_number: studentNumber,
        programme_id: programmeId,
        entry_term_id: resolvedTermId,
        current_term_id: resolvedTermId,
        cohort_year: cohortYear,
        current_level: currentLevel,
        status,
        admission_date: admissionDate,
        gpa,
        cgpa,
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
    const programmeId = String(body.programme_id || "").trim();
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

    if (!id || !fullName || !email || !studentNumber || !programmeId) {
      return NextResponse.json(
        {
          error:
            "Student ID, full name, email, student number, and academic programme are required.",
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

    const { data: existingStudent, error: fetchErr } = await (supabase as any)
      .from("students")
      .select("id, school_id, university_id, profile_id, student_number, status, programme_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existingStudent) {
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
      existingUserId: existingStudent.profile_id,
      email,
      password: rawPassword || undefined,
      fullName,
      phone,
      roleCode: "student",
      schoolId: targetSchool.schoolId,
      schoolName: targetSchool.schoolName,
      schoolCode: targetSchool.schoolCode,
      accountStatus,
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

    const studentUpdates: Record<string, any> = {
      school_id: targetSchool.schoolId,
      university_id: targetSchool.schoolId,
      student_number: studentNumber,
      programme_id: programmeId,
      cohort_year: cohortYear,
      current_level: currentLevel,
      status,
      admission_date: admissionDate,
      gpa,
      cgpa,
      updated_at: new Date().toISOString(),
    };
    if (entryTermId) {
      studentUpdates.entry_term_id = entryTermId;
    }

    const { error: updateErr } = await (supabase as any)
      .from("students")
      .update(studentUpdates)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

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

    return NextResponse.json({ success: true });
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
