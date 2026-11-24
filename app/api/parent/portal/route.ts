import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveParentPortalContext,
  safeParentQuery,
} from "@/lib/parent/parent-context";

export async function GET(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveParentPortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const section = req.nextUrl.searchParams.get("section") || "dashboard";
    const requestedStudentId = req.nextUrl.searchParams.get("studentId") || "";

    const activeWard =
      ctx.wards.find((w) => w.id === requestedStudentId) || ctx.wards[0] || null;

    if (section === "bootstrap") {
      return NextResponse.json({
        school: {
          id: ctx.schoolId,
          name: ctx.schoolName,
          school_type: ctx.schoolType,
          currency: ctx.currency,
          logo_url: ctx.schoolLogo,
        },
        parent: {
          id: ctx.parentProfile?.id || null,
          full_name: ctx.fullName,
          email: ctx.email,
          phone: ctx.parentProfile?.phone || "",
          relationship: ctx.parentProfile?.relationship || "Parent / Guardian",
          occupation: ctx.parentProfile?.occupation || "",
          address: ctx.parentProfile?.address || "",
        },
        wards: ctx.wards,
      });
    }

    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;
    const studentId = activeWard?.id || null;

    const baseInfo = {
      school: {
        id: schoolId,
        name: ctx.schoolName,
        school_type: ctx.schoolType,
        currency: ctx.currency,
        logo_url: ctx.schoolLogo,
      },
      ward: activeWard,
      wards: ctx.wards,
      missingTables: [] as string[],
    };

    if (section === "profile") {
      return NextResponse.json({
        ...baseInfo,
        parent: {
          id: ctx.parentProfile?.id || null,
          full_name: ctx.fullName,
          email: ctx.email,
          phone: ctx.parentProfile?.phone || "",
          relationship: ctx.parentProfile?.relationship || "Parent / Guardian",
          occupation: ctx.parentProfile?.occupation || "",
          address: ctx.parentProfile?.address || "",
        },
      });
    }

    if (!studentId) {
      return NextResponse.json({
        ...baseInfo,
        noLinkedWard: true,
        notices: [],
        grades: [],
        reportCards: [],
        competencies: [],
        certifications: [],
        attendance: [],
        conduct: [],
        invoices: [],
        payments: [],
        timetable: [],
        messages: [],
        staffContacts: [],
        summary: {
          attendancePct: null,
          totalBilled: 0,
          totalPaid: 0,
          balanceDue: 0,
          latestGpa: null,
          latestAverage: null,
          competentCount: 0,
          assessmentsTotal: 0,
        },
      });
    }

    // Active term helper
    const { data: activeTerm } = await safeParentQuery(
      db
        .from("terms")
        .select("id, name, code, is_current")
        .eq("school_id", schoolId)
        .order("is_current", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    if (section === "dashboard") {
      const [attRes, invRes, payRes, noticesRes, uniGradesRes, hsScoresRes, vocCompRes] =
        await Promise.all([
          safeParentQuery(
            db
              .from("attendance_records")
              .select("id, status, recorded_at")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeParentQuery(
            db
              .from("invoices")
              .select("id, total_amount, paid_amount, balance, status")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
          ),
          safeParentQuery(
            db
              .from("payments")
              .select("id, amount, status")
              .eq("school_id", schoolId)
              .eq("student_id", studentId)
              .eq("status", "successful")
          ),
          safeParentQuery(
            db
              .from("school_events")
              .select("id, title, description, event_type, start_date, end_date")
              .eq("school_id", schoolId)
              .order("start_date", { ascending: false })
              .limit(6)
          ),
          ctx.schoolType === "university"
            ? safeParentQuery(
                db
                  .from("exam_grades")
                  .select("id, total_score, grade_letter, grade_point, status")
                  .eq("school_id", schoolId)
                  .eq("student_id", studentId)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          ctx.schoolType === "high_school"
            ? safeParentQuery(
                db
                  .from("report_card_scores")
                  .select("id, total_score, grade")
                  .eq("school_id", schoolId)
                  .eq("student_id", studentId)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
          ctx.schoolType === "vocational"
            ? safeParentQuery(
                db
                  .from("competency_assessments")
                  .select("id, practical_score, verdict")
                  .eq("school_id", schoolId)
                  .eq("student_id", studentId)
              )
            : Promise.resolve({ data: [], missing: false, error: null }),
        ]);

      const attRows = attRes.data || [];
      const presentCount = attRows.filter((a: any) =>
        ["present", "late"].includes(String(a.status || "").toLowerCase())
      ).length;
      const attendancePct =
        attRows.length > 0 ? Math.round((presentCount / attRows.length) * 100) : null;

      const invoices = invRes.data || [];
      const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const paidOnInvoices = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
      const totalPayments = (payRes.data || []).reduce(
        (s: number, p: any) => s + Number(p.amount || 0),
        0
      );
      const totalPaid = Math.max(paidOnInvoices, totalPayments);
      const balanceDue = Math.max(0, totalBilled - totalPaid);

      const uniGrades = uniGradesRes.data || [];
      const validGps = uniGrades
        .map((g: any) => Number(g.grade_point))
        .filter((n: number) => Number.isFinite(n) && n >= 0);
      const latestGpa =
        validGps.length > 0
          ? Number((validGps.reduce((a: number, b: number) => a + b, 0) / validGps.length).toFixed(2))
          : null;

      const hsScores = hsScoresRes.data || [];
      const validHs = hsScores
        .map((r: any) => Number(r.total_score))
        .filter((n: number) => Number.isFinite(n));
      const latestAverage =
        validHs.length > 0
          ? Math.round(validHs.reduce((a: number, b: number) => a + b, 0) / validHs.length)
          : null;

      const vocComp = vocCompRes.data || [];
      const competentCount = vocComp.filter((c: any) => c.verdict === "competent").length;

      return NextResponse.json({
        ...baseInfo,
        activeTerm: activeTerm || null,
        notices: noticesRes.data || [],
        summary: {
          attendancePct,
          attendanceCount: attRows.length,
          totalBilled,
          totalPaid,
          balanceDue,
          latestGpa,
          latestAverage,
          competentCount,
          assessmentsTotal: vocComp.length || hsScores.length || uniGrades.length,
        },
      });
    }

    if (section === "reports") {
      const [termsRes, uniRes, hsRes, vocRes, certsRes] = await Promise.all([
        safeParentQuery(db.from("terms").select("id, name, code").eq("school_id", schoolId)),
        ctx.schoolType === "university"
          ? safeParentQuery(
              db
                .from("exam_grades")
                .select(
                  "id, course_id, term_id, ca_score, exam_score, total_score, grade_letter, grade_point, remarks, status, courses:course_id(code, name, credits)"
                )
                .eq("school_id", schoolId)
                .eq("student_id", studentId)
                .order("created_at", { ascending: false })
            )
          : Promise.resolve({ data: [], missing: false, error: null }),
        ctx.schoolType === "high_school"
          ? safeParentQuery(
              db
                .from("report_card_scores")
                .select(
                  "id, subject_id, term_id, ca_score, exam_score, total_score, grade, teacher_remarks, subjects:subject_id(code, name)"
                )
                .eq("school_id", schoolId)
                .eq("student_id", studentId)
                .order("created_at", { ascending: false })
            )
          : Promise.resolve({ data: [], missing: false, error: null }),
        ctx.schoolType === "vocational"
          ? safeParentQuery(
              db
                .from("competency_assessments")
                .select(
                  "id, module_id, assessment_date, practical_score, verdict, assessor_notes, vocational_modules:module_id(code, name)"
                )
                .eq("school_id", schoolId)
                .eq("student_id", studentId)
                .order("assessment_date", { ascending: false })
            )
          : Promise.resolve({ data: [], missing: false, error: null }),
        ctx.schoolType === "vocational"
          ? safeParentQuery(
              db
                .from("trade_certifications")
                .select("id, certificate_number, qualification_title, issue_date, status")
                .eq("school_id", schoolId)
                .eq("student_id", studentId)
                .order("issue_date", { ascending: false })
            )
          : Promise.resolve({ data: [], missing: false, error: null }),
      ]);

      const termMap = new Map<string, string>(
        (termsRes.data || []).map((t: any) => [String(t.id), t.name])
      );

      const grades = (uniRes.data || []).map((g: any) => ({
        ...g,
        term_name: g.term_id ? termMap.get(String(g.term_id)) || "Term" : "Current Semester",
        course_code: g.courses?.code || "",
        course_name: g.courses?.name || "Course",
        credits: Number(g.courses?.credits || 3),
      }));

      const reportCards = (hsRes.data || []).map((r: any) => ({
        ...r,
        term_name: r.term_id ? termMap.get(String(r.term_id)) || "Term" : "Current Term",
        subject_code: r.subjects?.code || "",
        subject_name: r.subjects?.name || "Subject",
      }));

      const competencies = (vocRes.data || []).map((c: any) => ({
        ...c,
        module_code: c.vocational_modules?.code || "",
        module_name: c.vocational_modules?.name || "Trade Module",
      }));

      return NextResponse.json({
        ...baseInfo,
        activeTerm: activeTerm || null,
        grades,
        reportCards,
        competencies,
        certifications: certsRes.data || [],
      });
    }

    if (section === "attendance") {
      const [recRes, condRes] = await Promise.all([
        safeParentQuery(
          db
            .from("attendance_records")
            .select(
              "id, session_id, status, recorded_at, remarks, ppe_compliant, attendance_sessions:session_id(session_date, session_type, topic)"
            )
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("recorded_at", { ascending: false })
            .limit(120)
        ),
        safeParentQuery(
          db
            .from("student_conduct_records")
            .select("id, incident_date, record_type, conduct_grade, notes")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("incident_date", { ascending: false })
            .limit(40)
        ),
      ]);

      const attendance = (recRes.data || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        recorded_at: r.recorded_at,
        remarks: r.remarks || null,
        ppe_compliant: r.ppe_compliant ?? null,
        session_date: r.attendance_sessions?.session_date || (r.recorded_at || "").slice(0, 10),
        session_type: r.attendance_sessions?.session_type || "regular",
        topic: r.attendance_sessions?.topic || null,
      }));

      return NextResponse.json({
        ...baseInfo,
        attendance,
        conduct: condRes.data || [],
      });
    }

    if (section === "billing") {
      const [invRes, payRes, intRes] = await Promise.all([
        safeParentQuery(
          db
            .from("invoices")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
        safeParentQuery(
          db
            .from("payments")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
        ),
        safeParentQuery(
          db
            .from("platform_integrations")
            .select("slug, name, is_enabled")
            .in("slug", ["paystack", "hubtel", "stripe", "flutterwave"])
            .eq("is_enabled", true)
        ),
      ]);

      const invoices = invRes.data || [];
      const payments = payRes.data || [];
      const totalBilled = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const totalPaid = payments
        .filter((p: any) => p.status === "successful")
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const paidFallback = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
      const effectivePaid = Math.max(totalPaid, paidFallback);

      const enabledGateways = (intRes.data || []).map((g: any) => g.name || g.slug);
      const financePrefEnabled = Boolean(
        ctx.academicSettings?.finance_settings?.online_payments_enabled
      );
      const onlinePaymentsEnabled = financePrefEnabled || enabledGateways.length > 0;

      return NextResponse.json({
        ...baseInfo,
        invoices,
        payments,
        totals: {
          totalBilled,
          totalPaid: effectivePaid,
          balanceDue: Math.max(0, totalBilled - effectivePaid),
        },
        onlinePaymentsEnabled,
        enabledGateways,
      });
    }

    if (section === "timetable") {
      const [ttRes, coursesRes, subjectsRes, modsRes, enrolRes, staffRes] = await Promise.all([
        safeParentQuery(
          db
            .from("timetable_entries")
            .select("*")
            .eq("school_id", schoolId)
            .order("start_time", { ascending: true })
        ),
        safeParentQuery(db.from("courses").select("id, code, name").eq("school_id", schoolId)),
        safeParentQuery(db.from("subjects").select("id, code, name, programme_id").eq("school_id", schoolId)),
        safeParentQuery(
          db.from("vocational_modules").select("id, code, name, department_id").eq("school_id", schoolId)
        ),
        ctx.schoolType === "university"
          ? safeParentQuery(
              db
                .from("course_enrolments")
                .select("course_id")
                .eq("school_id", schoolId)
                .eq("student_id", studentId)
            )
          : Promise.resolve({ data: [], missing: false, error: null }),
        safeParentQuery(
          db.from("staff_profiles").select("id, first_name, last_name").eq("school_id", schoolId)
        ),
      ]);

      const courseMap = new Map<string, any>(
        (coursesRes.data || []).map((c: any) => [String(c.id), c])
      );
      const subjectMap = new Map<string, any>(
        (subjectsRes.data || []).map((s: any) => [String(s.id), s])
      );
      const modMap = new Map<string, any>(
        (modsRes.data || []).map((m: any) => [String(m.id), m])
      );
      const staffMap = new Map<string, string>(
        (staffRes.data || []).map((st: any) => [
          String(st.id),
          `${st.first_name || ""} ${st.last_name || ""}`.trim(),
        ])
      );

      const enrolledCourseIds = new Set(
        (enrolRes.data || []).map((e: any) => String(e.course_id))
      );

      const entries = (ttRes.data || [])
        .filter((e: any) => {
          if (ctx.schoolType === "university") {
            if (enrolledCourseIds.size > 0 && e.course_id) {
              return enrolledCourseIds.has(String(e.course_id));
            }
            if (activeWard?.programme_id && e.programme_id) {
              return String(e.programme_id) === String(activeWard.programme_id);
            }
            return true;
          }
          if (ctx.schoolType === "high_school") {
            if (activeWard?.programme_id && e.programme_id) {
              return String(e.programme_id) === String(activeWard.programme_id);
            }
            return true;
          }
          return true;
        })
        .map((e: any) => {
          const c = e.course_id ? courseMap.get(String(e.course_id)) : null;
          const s = e.subject_id ? subjectMap.get(String(e.subject_id)) : null;
          const m = e.module_id ? modMap.get(String(e.module_id)) : null;
          const unit = c || s || m;
          return {
            id: e.id,
            day_of_week: e.day_of_week,
            start_time: e.start_time,
            end_time: e.end_time,
            room: e.room || "Main Room",
            entry_type: e.entry_type || "lecture",
            unit_code: unit?.code || "",
            unit_name: unit?.name || "Scheduled Session",
            teacher_name: e.teacher_id ? staffMap.get(String(e.teacher_id)) || "Staff" : "Staff",
          };
        });

      return NextResponse.json({
        ...baseInfo,
        timetable: entries,
      });
    }

    if (section === "messages") {
      const [noticesRes, msgsRes, staffRes] = await Promise.all([
        safeParentQuery(
          db
            .from("school_events")
            .select("id, title, description, event_type, start_date, end_date")
            .eq("school_id", schoolId)
            .order("start_date", { ascending: false })
            .limit(12)
        ),
        safeParentQuery(
          db
            .from("parent_teacher_messages")
            .select("*")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(50)
        ),
        safeParentQuery(
          db
            .from("staff_profiles")
            .select("id, first_name, last_name, designation, role_code")
            .eq("school_id", schoolId)
            .order("first_name", { ascending: true })
        ),
      ]);

      const missingTables: string[] = [];
      if (msgsRes.missing) missingTables.push("parent_teacher_messages");

      const staffMap = new Map<string, string>(
        (staffRes.data || []).map((st: any) => [
          String(st.id),
          `${st.first_name || ""} ${st.last_name || ""}`.trim() || "School Staff",
        ])
      );

      const messages = (msgsRes.data || []).map((m: any) => ({
        ...m,
        staff_name: m.staff_id ? staffMap.get(String(m.staff_id)) || "Teacher / Admin" : "School Office",
      }));

      return NextResponse.json({
        ...baseInfo,
        notices: noticesRes.data || [],
        messages,
        staffContacts: (staffRes.data || []).map((st: any) => ({
          id: st.id,
          name: `${st.first_name || ""} ${st.last_name || ""}`.trim() || "Staff",
          role: st.designation || st.role_code || "Staff",
        })),
        missingTables,
      });
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/parent/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveParentPortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;

    const requestedStudentId = String(body?.studentId || "");
    const ward =
      ctx.wards.find((w) => w.id === requestedStudentId) || ctx.wards[0] || null;

    if (action === "send_message") {
      if (!ward) {
        return NextResponse.json({ error: "No linked ward selected." }, { status: 400 });
      }
      const subject = String(body?.subject || "").trim();
      const msgBody = String(body?.body || "").trim();
      const category = String(body?.category || "general");
      const staffId = body?.staffId ? String(body.staffId) : null;

      if (!subject || !msgBody) {
        return NextResponse.json(
          { error: "Subject and message body are required." },
          { status: 400 }
        );
      }

      // Ensure parent_guardian_id exists cleanly
      let parentGuardianId = ctx.parentGuardianIds[0] || null;
      if (!parentGuardianId) {
        const { data: insertedPg, error: pgErr } = await db
          .from("parent_guardians")
          .insert({
            school_id: schoolId,
            user_id: ctx.userId,
            full_name: ctx.fullName,
            email: ctx.email,
            phone: ctx.parentProfile?.phone || null,
            student_id: ward.id,
            relationship: "Parent/Guardian",
            status: "active",
          })
          .select("id")
          .single();
        if (pgErr) {
          return NextResponse.json({ error: pgErr.message }, { status: 400 });
        }
        parentGuardianId = insertedPg.id;
      }

      const { data: inserted, error } = await db
        .from("parent_teacher_messages")
        .insert({
          school_id: schoolId,
          parent_guardian_id: parentGuardianId,
          student_id: ward.id,
          staff_id: staffId,
          sender_role: "parent",
          sender_name: ctx.fullName,
          category,
          subject,
          body: msgBody,
          is_read: false,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: inserted });
    }

    if (action === "update_profile") {
      const phone = String(body?.phone || "").trim();
      const address = String(body?.address || "").trim();
      const occupation = String(body?.occupation || "").trim();

      if (ctx.parentGuardianIds.length > 0) {
        const { error: pgErr } = await db
          .from("parent_guardians")
          .update({
            phone: phone || null,
            address: address || null,
            occupation: occupation || null,
            updated_at: new Date().toISOString(),
          })
          .in("id", ctx.parentGuardianIds)
          .eq("school_id", schoolId);
        if (pgErr) {
          return NextResponse.json({ error: pgErr.message }, { status: 400 });
        }
      }

      await db
        .from("profiles")
        .update({ phone: phone || null, updated_at: new Date().toISOString() })
        .eq("id", ctx.userId);

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
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "submit_online_payment") {
      if (!ward) {
        return NextResponse.json({ error: "No linked ward selected." }, { status: 400 });
      }
      const amount = Number(body?.amount || 0);
      const invoiceId = body?.invoiceId ? String(body.invoiceId) : null;
      const method = String(body?.paymentMethod || "online_momo");
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Valid payment amount is required." }, { status: 400 });
      }
      const ref = `ONL-${Date.now().toString(36).toUpperCase()}`;
      const { data: paymentRow, error: payErr } = await db
        .from("payments")
        .insert({
          school_id: schoolId,
          student_id: ward.id,
          invoice_id: invoiceId,
          amount,
          currency: ctx.currency,
          provider: "online_portal",
          provider_reference: ref,
          payment_method: method,
          status: "pending",
          notes: `Submitted by parent (${ctx.fullName})`,
        })
        .select("*")
        .single();

      if (payErr) {
        // Fallback without optional columns if migration pending
        const { data: fallbackPay, error: fbErr } = await db
          .from("payments")
          .insert({
            school_id: schoolId,
            student_id: ward.id,
            amount,
            currency: ctx.currency,
            provider: "online_portal",
            provider_reference: ref,
            payment_method: method,
            status: "pending",
          })
          .select("*")
          .single();
        if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 400 });
        return NextResponse.json({ ok: true, payment: fallbackPay });
      }
      return NextResponse.json({ ok: true, payment: paymentRow });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/parent/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
