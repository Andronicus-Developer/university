import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET: Fetch all admission applications, cycles, programmes, and stats
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch applications
    const { data: appsData, error: appsErr } = await supabase
      .from("applications")
      .select(`
        id,
        cycle_id,
        applicant_id,
        application_number,
        status,
        personal_info,
        academic_history,
        notes,
        submitted_at,
        created_at,
        updated_at,
        applicant:applicant_id(id, full_name, email, phone_number)
      `)
      .order("created_at", { ascending: false });

    if (appsErr) {
      console.error("Error fetching applications:", appsErr);
      return NextResponse.json({ error: appsErr.message }, { status: 500 });
    }

    // 2. Fetch application programmes preferences
    const { data: appProgsData } = await supabase
      .from("application_programmes")
      .select(`
        application_id,
        preference_order,
        programme:programme_id(id, name, code, degree_level)
      `)
      .order("preference_order", { ascending: true });

    const progMap = new Map();
    if (appProgsData) {
      appProgsData.forEach((ap: any) => {
        if (!progMap.has(ap.application_id)) {
          progMap.set(ap.application_id, ap.programme);
        }
      });
    }

    // 3. Fetch admission cycles
    const { data: cyclesData } = await supabase
      .from("admission_cycles")
      .select("id, name, code, is_active")
      .order("created_at", { ascending: false });

    // 4. Fetch available programmes for dropdown
    const { data: programmesData } = await supabase
      .from("programmes")
      .select("id, name, code, degree_level")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const applications = (appsData || []).map((app: any) => {
      const chosenProg = progMap.get(app.id);
      const personalInfo = app.personal_info || {};
      const candidateName =
        personalInfo.full_name ||
        app.applicant?.full_name ||
        "Unnamed Applicant";
      const candidateEmail =
        personalInfo.email ||
        app.applicant?.email ||
        "applicant@university.edu.gh";
      const candidatePhone =
        personalInfo.phone ||
        app.applicant?.phone_number ||
        "+233 20 000 0000";

      return {
        id: app.id,
        cycle_id: app.cycle_id,
        applicant_id: app.applicant_id,
        application_number: app.application_number,
        status: app.status || "submitted",
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_phone: candidatePhone,
        programme_id: chosenProg?.id || null,
        programme_name: chosenProg?.name || "General Studies",
        programme_code: chosenProg?.code || "GEN",
        notes: app.notes || "",
        submitted_at: app.submitted_at || app.created_at,
        created_at: app.created_at,
      };
    });

    const totalApplications = applications.length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const underReview = applications.filter(
      (a) => a.status === "under_review" || a.status === "submitted"
    ).length;
    const enrolled = applications.filter((a) => a.status === "converted_to_student").length;

    return NextResponse.json({
      applications,
      cycles: cyclesData || [],
      programmes: programmesData || [],
      stats: {
        totalApplications,
        approved,
        underReview,
        enrolled,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new admission applicant & application record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      candidate_name,
      candidate_email,
      candidate_phone,
      programme_id,
      cycle_id,
      application_number,
      status,
      notes,
    } = body;

    if (!candidate_name?.trim() || !candidate_email?.trim()) {
      return NextResponse.json(
        { error: "Applicant name and email are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Resolve or ensure an active admission cycle
    let targetCycleId = cycle_id;
    if (!targetCycleId) {
      const { data: existingCycle } = await supabase
        .from("admission_cycles")
        .select("id")
        .limit(1);

      if (existingCycle && existingCycle.length > 0) {
        targetCycleId = existingCycle[0].id;
      } else {
        // Resolve an academic year
        const { data: years } = await supabase.from("academic_years").select("id").limit(1);
        if (years && years[0]) {
          const { data: newCycle } = await supabase
            .from("admission_cycles")
            .insert({
              academic_year_id: years[0].id,
              code: `ADM-${new Date().getFullYear()}`,
              name: `Undergraduate & Postgraduate Admissions ${new Date().getFullYear()}`,
              start_date: "2026-01-01",
              end_date: "2026-12-31",
              is_active: true,
            })
            .select()
            .single();
          targetCycleId = newCycle?.id;
        }
      }
    }

    if (!targetCycleId) {
      return NextResponse.json(
        { error: "No admission cycle found. Please configure an academic year first." },
        { status: 400 }
      );
    }

    // 2. Resolve or insert applicant profile
    let applicantId: string | null = null;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", candidate_email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      applicantId = existingProfile.id;
    } else {
      // Create profile record
      const { data: newProfile, error: profErr } = await supabase
        .from("profiles")
        .insert({
          email: candidate_email.trim().toLowerCase(),
          full_name: candidate_name.trim(),
          phone_number: candidate_phone?.trim() || null,
        })
        .select("id")
        .single();

      if (profErr) {
        console.error("Profile creation error:", profErr);
        return NextResponse.json({ error: profErr.message }, { status: 500 });
      }
      applicantId = newProfile.id;
    }

    // 3. Generate application number if not provided
    const appNum =
      application_number?.trim() ||
      `ADM-${Date.now().toString().slice(-6)}`;

    // 4. Insert application
    const appStatus = status || "submitted";
    const { data: newApp, error: appErr } = await supabase
      .from("applications")
      .insert({
        cycle_id: targetCycleId,
        applicant_id: applicantId,
        application_number: appNum,
        status: appStatus,
        personal_info: {
          full_name: candidate_name.trim(),
          email: candidate_email.trim().toLowerCase(),
          phone: candidate_phone?.trim() || "",
        },
        notes: notes ? notes.trim() : null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (appErr) {
      console.error("Application creation error:", appErr);
      return NextResponse.json({ error: appErr.message }, { status: 500 });
    }

    // 5. Link chosen programme preference
    if (programme_id) {
      await supabase.from("application_programmes").insert({
        application_id: newApp.id,
        programme_id: programme_id,
        preference_order: 1,
      });
    }

    // 6. If status is converted_to_student, also provision student record
    if (appStatus === "converted_to_student" && programme_id && applicantId) {
      const stdNum = `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: terms } = await supabase.from("terms").select("id").limit(1);
      const termId = terms?.[0]?.id;

      if (termId) {
        await supabase.from("students").insert({
          profile_id: applicantId,
          student_number: stdNum,
          application_id: newApp.id,
          programme_id: programme_id,
          cohort_year: new Date().getFullYear(),
          entry_term_id: termId,
          status: "active",
          current_level: 100,
        });
      }
    }

    // 7. Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "ADMISSION_APPLICATION_CREATED",
        entity_type: "application",
        entity_id: newApp.id,
        outcome: "success",
        metadata: {
          application_number: newApp.application_number,
          candidate: candidate_name,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, application: newApp });
  } catch (err: any) {
    console.error("POST /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an application details or admission status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      candidate_name,
      candidate_email,
      candidate_phone,
      programme_id,
      status,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch current application
    const { data: currentApp, error: fetchErr } = await supabase
      .from("applications")
      .select("id, applicant_id, status, personal_info")
      .eq("id", id)
      .single();

    if (fetchErr || !currentApp) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const personalInfo = {
      ...(currentApp.personal_info || {}),
      ...(candidate_name ? { full_name: candidate_name.trim() } : {}),
      ...(candidate_email ? { email: candidate_email.trim().toLowerCase() } : {}),
      ...(candidate_phone ? { phone: candidate_phone.trim() } : {}),
    };

    const updatePayload: any = {
      personal_info: personalInfo,
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes.trim();

    const { error: appUpdateErr } = await supabase
      .from("applications")
      .update(updatePayload)
      .eq("id", id);

    if (appUpdateErr) {
      console.error("Update application error:", appUpdateErr);
      return NextResponse.json({ error: appUpdateErr.message }, { status: 500 });
    }

    // 2. Update profile name/email/phone if applicant_id is present
    if (currentApp.applicant_id && (candidate_name || candidate_email || candidate_phone)) {
      const profUpdate: any = {};
      if (candidate_name) profUpdate.full_name = candidate_name.trim();
      if (candidate_email) profUpdate.email = candidate_email.trim().toLowerCase();
      if (candidate_phone) profUpdate.phone_number = candidate_phone.trim();

      await supabase.from("profiles").update(profUpdate).eq("id", currentApp.applicant_id);
    }

    // 3. Update programme preference
    if (programme_id) {
      const { data: existingAppProg } = await supabase
        .from("application_programmes")
        .select("id")
        .eq("application_id", id)
        .eq("preference_order", 1)
        .maybeSingle();

      if (existingAppProg) {
        await supabase
          .from("application_programmes")
          .update({ programme_id })
          .eq("id", existingAppProg.id);
      } else {
        await supabase.from("application_programmes").insert({
          application_id: id,
          programme_id,
          preference_order: 1,
        });
      }
    }

    // 4. If status converted to student, check if already in students table, else enroll
    if (status === "converted_to_student" && currentApp.applicant_id) {
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", currentApp.applicant_id)
        .maybeSingle();

      if (!existingStudent) {
        const stdNum = `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: terms } = await supabase.from("terms").select("id").limit(1);
        const termId = terms?.[0]?.id;
        const progId = programme_id;

        if (termId && progId) {
          await supabase.from("students").insert({
            profile_id: currentApp.applicant_id,
            student_number: stdNum,
            application_id: id,
            programme_id: progId,
            cohort_year: new Date().getFullYear(),
            entry_term_id: termId,
            status: "active",
            current_level: 100,
          });
        }
      }
    }

    // 5. Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "ADMISSION_APPLICATION_UPDATED",
        entity_type: "application",
        entity_id: id,
        outcome: "success",
        metadata: { new_status: status },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete an admission application
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete associated choices
    await supabase.from("application_programmes").delete().eq("application_id", id);
    // 2. Delete offers if any
    await supabase.from("offers").delete().eq("application_id", id);
    // 3. Delete application
    const { error: delErr } = await supabase.from("applications").delete().eq("id", id);

    if (delErr) {
      console.error("Delete application error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 4. Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "ADMISSION_APPLICATION_DELETED",
        entity_type: "application",
        entity_id: id,
        outcome: "success",
        metadata: { application_id: id },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, message: "Application removed from database." });
  } catch (err: any) {
    console.error("DELETE /api/admin/admissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

