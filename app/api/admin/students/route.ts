import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry } from "@/lib/supabase/fetch";

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

// GET: Fetch all students with real profiles, programmes, terms, and dynamic KPI metrics
export async function GET() {
  try {
    const supabase = getAdminClient();

    const [studentsRes, programmesRes, termsRes] = await Promise.all([
      supabase
        .from("students")
        .select(
          `
          id,
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
      supabase
        .from("programmes")
        .select("id, name, code, degree_level, is_active")
        .order("name", { ascending: true }),
      supabase
        .from("terms")
        .select("id, name, code, is_active, start_date")
        .order("start_date", { ascending: false }),
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
    const active = students.filter((s) => s.status === "active").length;
    const admitted = students.filter((s) => s.status === "admitted").length;
    const graduated = students.filter(
      (s) => s.status === "graduated" || s.status === "completed"
    ).length;
    const inactive = students.filter((s) =>
      ["deferred", "leave_of_absence", "suspended", "withdrawn", "deceased"].includes(s.status)
    ).length;
    const avgCgpa =
      total > 0
        ? Number((students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / total).toFixed(2))
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

// POST: Provision Auth User + Profile + Student Role + Student Record
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

    // 1. Check duplicate student_number
    const { data: existingNumber } = await supabase
      .from("students")
      .select("id")
      .eq("student_number", studentNumber)
      .maybeSingle();

    if (existingNumber) {
      return NextResponse.json(
        { error: `Student number "${studentNumber}" is already assigned to another student.` },
        { status: 400 }
      );
    }

    // 2. Resolve or create Auth user & Profile
    let profileId: string | null = null;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      const { data: alreadyStudent } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", existingProfile.id)
        .maybeSingle();

      if (alreadyStudent) {
        return NextResponse.json(
          { error: `A student record already exists for "${email}".` },
          { status: 400 }
        );
      }
      profileId = existingProfile.id;

      if (rawPassword) {
        await supabase.auth.admin.updateUserById(existingProfile.id, {
          password: rawPassword,
          user_metadata: { full_name: fullName, role: "student" },
        });
      }
    } else {
      const passwordToUse =
        rawPassword || `Stu#${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: passwordToUse,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "student",
        },
      });

      if (authErr) {
        // Check if an orphaned auth user exists without a profile row
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

    // 3. Upsert public.profiles
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

    // 4. Resolve default active term if entryTermId not provided
    let resolvedTermId = entryTermId;
    if (!resolvedTermId) {
      const { data: activeTerm } = await supabase
        .from("terms")
        .select("id")
        .order("is_active", { ascending: false })
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedTermId = activeTerm?.id || null;
    }

    // 5. Insert public.students record
    const { data: createdStudent, error: studentErr } = await supabase
      .from("students")
      .insert({
        profile_id: profileId!,
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
      if (createdAuthUserId) {
        await supabase.from("profiles").delete().eq("id", createdAuthUserId);
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      }
      return NextResponse.json({ error: studentErr.message }, { status: 400 });
    }

    // 6. Assign RBAC 'student' role
    const { data: studentRole } = await supabase
      .from("roles")
      .select("id")
      .eq("code", "student")
      .maybeSingle();

    if (studentRole?.id) {
      await supabase
        .from("user_role_assignments")
        .upsert(
          {
            user_id: profileId!,
            role_id: studentRole.id,
            is_active: true,
          },
          { onConflict: "user_id,role_id" }
        )
        .then(async ({ error }) => {
          if (error) {
            await supabase
              .from("user_role_assignments")
              .delete()
              .eq("user_id", profileId!)
              .eq("role_id", studentRole.id);
            await supabase.from("user_role_assignments").insert({
              user_id: profileId!,
              role_id: studentRole.id,
              is_active: true,
            });
          }
        });
    }

    // 7. Record initial status history & audit event
    try {
      await supabase.from("student_status_history").insert({
        student_id: createdStudent.id,
        old_status: null,
        new_status: status,
        reason: "Initial student registration by System Administrator",
      });
      await supabase.from("audit_events").insert({
        action: "STUDENT_CREATED",
        entity_type: "students",
        entity_id: createdStudent.id,
        outcome: "success",
        metadata: {
          student_number: studentNumber,
          email,
          full_name: fullName,
          programme_id: programmeId,
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
    if (createdAuthUserId) {
      try {
        await supabase.from("profiles").delete().eq("id", createdAuthUserId);
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        // Ignore rollback failure
      }
    }
    return NextResponse.json(
      { error: err.message || "Failed to create student." },
      { status: 500 }
    );
  }
}

// PUT: Update existing Student, Profile, Auth credentials, and Academic Status/Programme history
export async function PUT(req: NextRequest) {
  try {
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

    const supabase = getAdminClient();

    // 1. Fetch existing student record
    const { data: existingStudent, error: fetchErr } = await supabase
      .from("students")
      .select("id, profile_id, student_number, status, programme_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existingStudent) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    // 2. Check duplicate student_number against other rows
    const { data: conflictNumber } = await supabase
      .from("students")
      .select("id")
      .eq("student_number", studentNumber)
      .neq("id", id)
      .maybeSingle();

    if (conflictNumber) {
      return NextResponse.json(
        { error: `Student number "${studentNumber}" is already assigned to another student.` },
        { status: 400 }
      );
    }

    // 3. Check duplicate email against other profiles
    const { data: conflictEmail } = await supabase
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

    // 4. Update Auth User
    const authUpdates: Record<string, any> = {
      email,
      user_metadata: {
        full_name: fullName,
        role: "student",
      },
    };
    if (rawPassword) {
      authUpdates.password = rawPassword;
    }
    await supabase.auth.admin.updateUserById(existingStudent.profile_id, authUpdates);

    // 5. Update Profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        phone,
        account_status: ["suspended", "withdrawn", "deceased"].includes(status)
          ? "suspended"
          : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingStudent.profile_id);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // 6. Update Student Record
    const studentUpdates: Record<string, any> = {
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

    const { error: updateErr } = await supabase
      .from("students")
      .update(studentUpdates)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 7. Record status / programme transitions and audit trail
    try {
      if (existingStudent.status !== status) {
        await supabase.from("student_status_history").insert({
          student_id: id,
          old_status: existingStudent.status,
          new_status: status,
          reason: "Updated by System Administrator",
        });
      }
      if (existingStudent.programme_id !== programmeId) {
        await supabase.from("student_programme_history").insert({
          student_id: id,
          old_programme_id: existingStudent.programme_id,
          new_programme_id: programmeId,
          reason: "Programme updated by System Administrator",
        });
      }
      await supabase.from("audit_events").insert({
        action: "STUDENT_UPDATED",
        entity_type: "students",
        entity_id: id,
        outcome: "success",
        metadata: {
          student_number: studentNumber,
          email,
          full_name: fullName,
          status,
        },
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update student." },
      { status: 500 }
    );
  }
}

// DELETE: Clean dependent FK records and delete Student + Profile + Auth User
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: student, error: fetchErr } = await supabase
      .from("students")
      .select("id, profile_id, student_number")
      .eq("id", id)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    if (student.profile_id === PROTECTED_ADMIN_ID) {
      return NextResponse.json(
        { error: "Cannot delete the protected System Administrator profile." },
        { status: 403 }
      );
    }

    // 1. Clean ON DELETE RESTRICT financial & academic child rows referencing student_id
    await supabase.from("refund_requests").delete().eq("student_id", id);
    await supabase.from("receipts").delete().eq("student_id", id);

    const { data: studentPayments } = await supabase
      .from("payments")
      .select("id")
      .eq("student_id", id);
    const paymentIds = (studentPayments || []).map((p: any) => p.id);
    if (paymentIds.length > 0) {
      await supabase.from("payment_allocations").delete().in("payment_id", paymentIds);
    }

    const { data: studentInvoices } = await supabase
      .from("student_invoices")
      .select("id")
      .eq("student_id", id);
    const invoiceIds = (studentInvoices || []).map((inv: any) => inv.id);
    if (invoiceIds.length > 0) {
      await supabase.from("payment_allocations").delete().in("invoice_id", invoiceIds);
    }

    await supabase.from("payments").delete().eq("student_id", id);
    await supabase.from("waivers").delete().eq("student_id", id);
    await supabase.from("student_invoices").delete().eq("student_id", id);
    await supabase.from("course_enrolments").delete().eq("student_id", id);

    // 2. Delete authoritative student record
    const { error: delStudentErr } = await supabase.from("students").delete().eq("id", id);
    if (delStudentErr) {
      return NextResponse.json({ error: delStudentErr.message }, { status: 400 });
    }

    // 3. Check if profile is also a staff member before removing profile & Auth account
    const { data: linkedStaff } = await supabase
      .from("staff")
      .select("id")
      .eq("profile_id", student.profile_id)
      .maybeSingle();

    if (!linkedStaff && student.profile_id !== PROTECTED_ADMIN_ID) {
      await supabase
        .from("maintenance_requests")
        .delete()
        .eq("reported_by", student.profile_id);
      await supabase.from("refund_requests").delete().eq("requested_by", student.profile_id);
      await supabase
        .from("attendance_amendments")
        .delete()
        .eq("requested_by", student.profile_id);
      await supabase.from("result_amendments").delete().eq("requested_by", student.profile_id);
      await supabase
        .from("user_role_assignments")
        .delete()
        .eq("user_id", student.profile_id);
      await supabase.from("profiles").delete().eq("id", student.profile_id);
      await supabase.auth.admin.deleteUser(student.profile_id);
    }

    // 4. Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "STUDENT_DELETED",
        entity_type: "students",
        entity_id: id,
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
      { status: 500 }
    );
  }
}
