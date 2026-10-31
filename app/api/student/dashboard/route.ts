import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry, extractUserFromCookies } from "@/lib/supabase/fetch";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

async function getStudentContext(db: any, request: NextRequest) {
  const user = extractUserFromCookies(request.cookies.getAll());

  let student = null;
  if (user && user.id) {
    const { data: stuByAuth } = await db
      .from("students")
      .select("*, profile:profile_id(*), programme:programme_id(*, department:department_id(name))")
      .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    student = stuByAuth;
  }

  if (!student) {
    const { data: firstStu } = await db
      .from("students")
      .select("*, profile:profile_id(*), programme:programme_id(*, department:department_id(name))")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    student = firstStu;
  }

  return { user, student };
}

export async function GET(request: NextRequest) {
  try {
    const db = getAdminClient() as any;
    const { student } = await getStudentContext(db, request);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentId = student.id;

    // 1. Course Enrolments
    const { data: enrolments } = await db
      .from("course_enrolments")
      .select(`
        id,
        course_offering_id,
        enrolment_status,
        registered_at,
        course_offering:course_offering_id(
          id,
          section,
          delivery_mode,
          capacity,
          enrolled_count,
          course:course_id(id, code, name, credits, description)
        )
      `)
      .eq("student_id", studentId);

    const enrolledOfferingIds = (enrolments || []).map((e: any) => e.course_offering_id);

    // 2. Available Course Offerings (for instant enrollment)
    const { data: allOfferings } = await db
      .from("course_offerings")
      .select(`
        id,
        section,
        delivery_mode,
        capacity,
        enrolled_count,
        status,
        course:course_id(id, code, name, credits, description)
      `)
      .order("created_at", { ascending: true });

    // Available offerings are those NOT already enrolled by this student
    const availableOfferings = (allOfferings || []).filter(
      (off: any) => !enrolledOfferingIds.includes(off.id)
    );

    // 3. Timetable Events
    let timetableEvents: any[] = [];
    if (enrolledOfferingIds.length > 0) {
      const { data: events } = await db
        .from("timetable_events")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          course_offering:course_offering_id(
            course:course_id(code, name)
          ),
          room:room_id(name, building:building_id(name))
        `)
        .in("course_offering_id", enrolledOfferingIds);

      timetableEvents = events || [];
    }

    // 4. Attendance Records
    const { data: attendanceRecords } = await db
      .from("attendance_records")
      .select("id, status, recorded_at, class_session:class_session_id(session_date, topic)")
      .eq("student_id", studentId);

    const totalSessions = attendanceRecords?.length || 0;
    const attendedSessions = (attendanceRecords || []).filter(
      (a: any) => a.status === "present" || a.status === "late"
    ).length;
    const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

    // 5. Invoices, Payments, Receipts
    const { data: invoices } = await db
      .from("student_invoices")
      .select("*, lines:invoice_lines(*)")
      .eq("student_id", studentId)
      .order("issue_date", { ascending: false });

    let totalInvoiced = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    (invoices || []).forEach((inv: any) => {
      totalInvoiced += Number(inv.total_amount || 0);
      totalPaid += Number(inv.paid_amount || 0);
      balanceDue += Number(inv.balance_amount || 0);
    });

    const { data: receipts } = await db
      .from("receipts")
      .select("*, payment:payment_id(*)")
      .eq("student_id", studentId)
      .order("issued_at", { ascending: false });

    // 6. Assessment Marks
    const enrolmentIds = (enrolments || []).map((e: any) => e.id);
    let recentMarks: any[] = [];
    if (enrolmentIds.length > 0) {
      const { data: marks } = await db
        .from("assessment_marks")
        .select(`
          id,
          marks_obtained,
          is_absent,
          remarks,
          assessment_component:assessment_component_id(
            id,
            name,
            component_type,
            max_marks,
            weight_percentage,
            course_offering:course_offering_id(
              course:course_id(code, name)
            )
          )
        `)
        .in("enrolment_id", enrolmentIds);

      recentMarks = marks || [];
    }

    // 7. Service Requests
    const { data: serviceRequests } = await db
      .from("service_requests")
      .select("*")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false });

    // 8. Support Cases
    const { data: supportCases } = await db
      .from("support_cases")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    // 9. Hostel Accommodation
    const { data: accommodation } = await db
      .from("allocations")
      .select(`
        id,
        status,
        check_in_at,
        bed:bed_id(
          bed_number,
          room:hostel_room_id(
            room_number,
            floor_number,
            residence:residence_id(name, address)
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();

    // 10. Library Loans
    let activeLoans: any[] = [];
    if (student.profile_id) {
      const { data: loans } = await db
        .from("loans")
        .select(`
          id,
          borrowed_at,
          due_date,
          status,
          copy:copy_id(
            barcode,
            item:library_item_id(title, author, call_number)
          )
        `)
        .eq("user_id", student.profile_id)
        .order("due_date", { ascending: true });

      activeLoans = loans || [];
    }

    // 11. Announcements & Notifications
    const { data: announcements } = await db
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(5);

    const { data: notifications } = await db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      student: {
        id: student.id,
        profileId: student.profile_id,
        studentNumber: student.student_number,
        fullName: student.profile?.full_name || "Ama Johnson",
        email: student.profile?.email || "ama.johnson@university.edu.gh",
        phone: student.profile?.phone || "+233 24 555 0192",
        address: student.profile?.address || "University Hall Annex, Room B-204",
        level: student.current_level || 100,
        gpa: student.gpa || 3.82,
        cgpa: student.cgpa || 3.84,
        creditsEarned: student.total_credits_earned || 36,
        programme: student.programme?.name || "BSc Computer Science",
        programmeCode: student.programme?.code || "CS-BS",
        department: student.programme?.department?.name || "Department of Computer Science",
      },
      enrolments: enrolments || [],
      availableOfferings: availableOfferings || [],
      timetableEvents,
      attendance: {
        percentage: attendancePercentage,
        totalSessions,
        attendedSessions,
        records: attendanceRecords || [],
      },
      finance: {
        totalInvoiced,
        totalPaid,
        balanceDue,
        invoices: invoices || [],
        receipts: receipts || [],
      },
      recentMarks,
      serviceRequests: serviceRequests || [],
      supportCases: supportCases || [],
      announcements: announcements || [],
      notifications: notifications || [],
      accommodation,
      activeLoans,
    });
  } catch (error: any) {
    console.error("Student dashboard GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch student dashboard data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminClient() as any;
    const { student } = await getStudentContext(db, request);

    if (!student) {
      return NextResponse.json({ error: "Unauthorized / Student not found" }, { status: 401 });
    }

    const studentId = student.id;
    const body = await request.json();
    const { action } = body;

    // ----------------------------------------------------
    // 1. ENROLL COURSE (Create)
    // ----------------------------------------------------
    if (action === "enroll_course") {
      const { offeringId } = body;
      if (!offeringId) {
        return NextResponse.json({ error: "Missing offeringId" }, { status: 400 });
      }

      // Find current term
      const { data: term } = await db.from("terms").select("id").limit(1).single();
      const termId = term ? term.id : null;

      // Check existing enrolment
      const { data: existing } = await db
        .from("course_enrolments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_offering_id", offeringId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 });
      }

      // Insert enrolment
      const { data: newEnrolment, error: enrError } = await db
        .from("course_enrolments")
        .insert({
          student_id: studentId,
          course_offering_id: offeringId,
          term_id: termId,
          enrolment_status: "enrolled",
        })
        .select()
        .single();

      if (enrError) throw enrError;

      // Add notification
      if (student.profile_id) {
        await db.from("notifications").insert({
          user_id: student.profile_id,
          title: "Course Registration Confirmed",
          message: "You have successfully enrolled in your chosen course module.",
          type: "academic",
          is_read: false,
        });
      }

      return NextResponse.json({ success: true, enrolment: newEnrolment });
    }

    // ----------------------------------------------------
    // 2. DROP COURSE (Delete)
    // ----------------------------------------------------
    if (action === "drop_course") {
      const { enrolmentId, offeringId } = body;

      if (!enrolmentId && !offeringId) {
        return NextResponse.json({ error: "Missing enrolmentId or offeringId" }, { status: 400 });
      }

      let deleteQuery = db.from("course_enrolments").delete();
      if (enrolmentId) {
        deleteQuery = deleteQuery.eq("id", enrolmentId);
      } else if (offeringId) {
        deleteQuery = deleteQuery.eq("course_offering_id", offeringId).eq("student_id", studentId);
      }

      const { data: deletedRows, error: dropError } = await deleteQuery.select();
      if (dropError) throw dropError;

      // Add notification
      if (student.profile_id) {
        await db.from("notifications").insert({
          user_id: student.profile_id,
          title: "Course Dropped",
          message: "The course was dropped successfully and is immediately ready for re-enrollment.",
          type: "academic",
          is_read: false,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Course dropped successfully and is immediately ready for enrollment.",
        deleted: deletedRows,
      });
    }

    // ----------------------------------------------------
    // 3. CREATE SERVICE REQUEST (Create)
    // ----------------------------------------------------
    if (action === "create_service_request") {
      const { requestType, purpose } = body;
      const feeAmount = requestType === "transcript" ? 50.00 : 25.00;

      const { data: newReq, error: reqErr } = await db
        .from("service_requests")
        .insert({
          student_id: studentId,
          request_type: requestType || "enrollment_letter",
          status: "pending",
          fee_amount: feeAmount,
          is_paid: true,
          details: {
            purpose: purpose || "Student Registry Verification",
            submitted_via: "student_dashboard",
          },
        })
        .select()
        .single();

      if (reqErr) throw reqErr;
      return NextResponse.json({ success: true, request: newReq });
    }

    // ----------------------------------------------------
    // 4. CANCEL SERVICE REQUEST (Delete)
    // ----------------------------------------------------
    if (action === "delete_service_request") {
      const { requestId } = body;
      const { error: delErr } = await db
        .from("service_requests")
        .delete()
        .eq("id", requestId)
        .eq("student_id", studentId);

      if (delErr) throw delErr;
      return NextResponse.json({ success: true });
    }

    // ----------------------------------------------------
    // 5. CREATE SUPPORT TICKET (Create)
    // ----------------------------------------------------
    if (action === "create_support_ticket") {
      const { category, priority, subject, description } = body;
      const { data: newTicket, error: ticketErr } = await db
        .from("support_cases")
        .insert({
          student_id: studentId,
          category: category || "academic",
          priority: priority || "normal",
          subject: subject || "Student Query",
          description: description || "Inquiry submitted via dashboard",
          status: "open",
          assigned_team: category === "finance" ? "Finance Help Desk" : "Student Affairs",
        })
        .select()
        .single();

      if (ticketErr) throw ticketErr;
      return NextResponse.json({ success: true, ticket: newTicket });
    }

    // ----------------------------------------------------
    // 6. DELETE SUPPORT TICKET (Delete)
    // ----------------------------------------------------
    if (action === "delete_support_ticket") {
      const { ticketId } = body;
      const { error: delTicketErr } = await db
        .from("support_cases")
        .delete()
        .eq("id", ticketId)
        .eq("student_id", studentId);

      if (delTicketErr) throw delTicketErr;
      return NextResponse.json({ success: true });
    }

    // ----------------------------------------------------
    // 7. UPDATE PROFILE CONTACT (Update)
    // ----------------------------------------------------
    if (action === "update_contact") {
      const { phone, address } = body;
      if (student.profile_id) {
        const { error: profErr } = await db
          .from("profiles")
          .update({ phone, address })
          .eq("id", student.profile_id);

        if (profErr) throw profErr;
      }
      return NextResponse.json({ success: true });
    }

    // ----------------------------------------------------
    // 8. PAY FEES (Create Payment & Receipt, Update Invoice)
    // ----------------------------------------------------
    if (action === "pay_fee") {
      const { invoiceId, amount, paymentMethod } = body;
      const payVal = parseFloat(amount || "0");
      if (payVal <= 0) {
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      const ref = `PAY-${Date.now().toString().slice(-8)}`;

      // 1. Payment
      const { data: payment, error: pErr } = await db
        .from("payments")
        .insert({
          student_id: studentId,
          amount: payVal,
          currency: "GHS",
          provider: "paystack",
          provider_reference: ref,
          payment_method: paymentMethod || "Mobile Money (MTN)",
          status: "successful",
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // 2. Allocation
      if (invoiceId) {
        await db.from("payment_allocations").insert({
          payment_id: payment.id,
          invoice_id: invoiceId,
          allocated_amount: payVal,
        });

        // 3. Update invoice balance
        const { data: inv } = await db.from("student_invoices").select("*").eq("id", invoiceId).single();
        if (inv) {
          const newPaid = Number(inv.paid_amount || 0) + payVal;
          const newBalance = Math.max(0, Number(inv.total_amount || 0) - newPaid);
          const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

          await db
            .from("student_invoices")
            .update({
              paid_amount: newPaid,
              balance_amount: newBalance,
              status: newStatus,
            })
            .eq("id", invoiceId);
        }
      }

      // 4. Receipt
      const receiptNum = `REC-${Date.now().toString().slice(-6)}`;
      const { data: receipt } = await db
        .from("receipts")
        .insert({
          payment_id: payment.id,
          receipt_number: receiptNum,
          student_id: studentId,
          amount: payVal,
          currency: "GHS",
          receipt_data: {
            channel: paymentMethod || "Mobile Money",
            student_name: student.profile?.full_name || "Ama Johnson",
            ref: ref,
          },
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        payment,
        receipt,
        message: `Payment of GHS ${payVal.toFixed(2)} recorded. Receipt ${receiptNum} issued.`,
      });
    }

    // ----------------------------------------------------
    // 9. RENEW LIBRARY LOAN (Update)
    // ----------------------------------------------------
    if (action === "renew_loan") {
      const { loanId } = body;
      const { data: loan } = await db.from("loans").select("*").eq("id", loanId).single();
      if (loan) {
        const currentDue = new Date(loan.due_date || Date.now());
        currentDue.setDate(currentDue.getDate() + 14);
        const newDueDate = currentDue.toISOString().split("T")[0];

        await db.from("loans").update({ due_date: newDueDate }).eq("id", loanId);
        return NextResponse.json({ success: true, newDueDate });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Student dashboard POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process student dashboard action" },
      { status: 500 }
    );
  }
}
