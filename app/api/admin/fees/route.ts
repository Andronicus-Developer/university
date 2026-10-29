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

// GET: Fetch student invoices, fee items catalog, and financial KPIs
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch invoices
    const { data: invoicesData, error: invErr } = await supabase
      .from("student_invoices")
      .select(`
        id,
        invoice_number,
        student_id,
        term_id,
        total_amount,
        paid_amount,
        balance_amount,
        currency,
        status,
        issue_date,
        due_date,
        created_at,
        student:student_id(
          id,
          student_number,
          profile:profile_id(full_name, email, phone_number)
        ),
        term:term_id(id, name, code)
      `)
      .order("created_at", { ascending: false });

    if (invErr) {
      console.error("Error fetching student invoices:", invErr);
      return NextResponse.json({ error: invErr.message }, { status: 500 });
    }

    // 2. Fetch fee items master list
    const { data: feeItemsData } = await supabase
      .from("fee_items")
      .select("id, code, name, description, default_amount, is_mandatory, is_active")
      .order("code", { ascending: true });

    // 3. Fetch existing students
    const { data: studentsData } = await supabase
      .from("students")
      .select(`
        id,
        student_number,
        profile:profile_id(full_name, email)
      `);

    const formattedInvoices = (invoicesData || []).map((inv: any) => {
      const studentProfile = inv.student?.profile;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        student_id: inv.student_id,
        student_number: inv.student?.student_number || "STU-UNKNOWN",
        student_name: studentProfile?.full_name || "Enrolled Student",
        student_email: studentProfile?.email || "student@university.edu.gh",
        term_id: inv.term_id,
        term_name: inv.term?.name || "Semester 1",
        total_amount: Number(inv.total_amount || 0),
        paid_amount: Number(inv.paid_amount || 0),
        balance_amount: Number(inv.balance_amount ?? (inv.total_amount - inv.paid_amount)),
        currency: inv.currency || "GHS",
        status: inv.status || "posted",
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        created_at: inv.created_at,
      };
    });

    // Compute Financial Metrics
    const totalBilled = formattedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalCollected = formattedInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const totalOutstanding = formattedInvoices.reduce((sum, inv) => sum + inv.balance_amount, 0);
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    return NextResponse.json({
      invoices: formattedInvoices,
      feeItems: feeItemsData || [],
      students: (studentsData || []).map((s: any) => ({
        id: s.id,
        student_number: s.student_number,
        name: s.profile?.full_name || s.student_number,
        email: s.profile?.email,
      })),
      stats: {
        totalBilled,
        totalCollected,
        totalOutstanding,
        collectionRate,
        totalInvoices: formattedInvoices.length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/fees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add a new student invoice or fee item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, // 'invoice' | 'fee_item'
      student_id,
      student_name,
      student_email,
      total_amount,
      paid_amount,
      due_date,
      status,
      // fee item fields
      code,
      name,
      description,
      default_amount,
      is_mandatory,
    } = body;

    const supabase = getAdminClient();

    // Case 1: Add a new fee item
    if (type === "fee_item") {
      if (!code?.trim() || !name?.trim()) {
        return NextResponse.json({ error: "Fee item code and name are required." }, { status: 400 });
      }

      const { data: newFeeItem, error: itemErr } = await supabase
        .from("fee_items")
        .insert({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description?.trim() || null,
          default_amount: Number(default_amount) || 0,
          is_mandatory: is_mandatory ?? true,
          is_active: true,
        })
        .select()
        .single();

      if (itemErr) {
        console.error("Fee item insert error:", itemErr);
        return NextResponse.json({ error: itemErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, feeItem: newFeeItem });
    }

    // Case 2: Create a student invoice
    if (!total_amount || Number(total_amount) <= 0) {
      return NextResponse.json({ error: "A valid invoice total amount is required." }, { status: 400 });
    }

    // 1. Resolve term
    const { data: terms } = await supabase.from("terms").select("id").limit(1);
    const termId = terms?.[0]?.id;

    if (!termId) {
      return NextResponse.json({ error: "No academic term configured." }, { status: 400 });
    }

    // 2. Resolve student
    let targetStudentId = student_id;
    if (!targetStudentId) {
      // Find or create student
      const stdName = student_name?.trim() || "Student Account";
      const stdEmail = student_email?.trim().toLowerCase() || `student.${Date.now().toString().slice(-4)}@university.edu.gh`;

      // Check or create profile
      let profileId: string | null = null;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", stdEmail)
        .maybeSingle();

      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        const { data: newProf, error: profErr } = await supabase
          .from("profiles")
          .insert({
            full_name: stdName,
            email: stdEmail,
          })
          .select("id")
          .single();

        if (profErr) {
          console.error("Profile creation error:", profErr);
          return NextResponse.json({ error: profErr.message }, { status: 500 });
        }
        profileId = newProf.id;
      }

      // Check if student record exists for this profile
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", profileId)
        .maybeSingle();

      if (existingStudent) {
        targetStudentId = existingStudent.id;
      } else {
        // Find programme
        const { data: progs } = await supabase.from("programmes").select("id").limit(1);
        const progId = progs?.[0]?.id;

        if (!progId) {
          return NextResponse.json({ error: "No degree programme configured." }, { status: 400 });
        }

        const studentNumber = `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: newStudent, error: stdErr } = await supabase
          .from("students")
          .insert({
            profile_id: profileId,
            student_number: studentNumber,
            programme_id: progId,
            cohort_year: new Date().getFullYear(),
            entry_term_id: termId,
            status: "active",
            current_level: 100,
          })
          .select("id")
          .single();

        if (stdErr) {
          console.error("Student creation error:", stdErr);
          return NextResponse.json({ error: stdErr.message }, { status: 500 });
        }
        targetStudentId = newStudent.id;
      }
    }

    const billed = Number(total_amount);
    const paid = Number(paid_amount) || 0;
    const balance = Math.max(0, billed - paid);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    let invStatus = status;
    if (!invStatus) {
      if (paid >= billed) invStatus = "paid";
      else if (paid > 0) invStatus = "partially_paid";
      else invStatus = "posted";
    }

    const { data: newInvoice, error: invInsertErr } = await supabase
      .from("student_invoices")
      .insert({
        student_id: targetStudentId,
        term_id: termId,
        invoice_number: invoiceNumber,
        total_amount: billed,
        paid_amount: paid,
        balance_amount: balance,
        status: invStatus,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: due_date || "2026-11-30",
        currency: "GHS",
      })
      .select()
      .single();

    if (invInsertErr) {
      console.error("Invoice insert error:", invInsertErr);
      return NextResponse.json({ error: invInsertErr.message }, { status: 500 });
    }

    // If payment realized, record in payments table
    if (paid > 0) {
      try {
        await supabase.from("payments").insert({
          student_id: targetStudentId,
          amount: paid,
          currency: "GHS",
          provider: "bank_transfer",
          provider_reference: `PAY-${Date.now().toString().slice(-8)}`,
          status: "successful",
          payment_method: "cash_deposit",
        });
      } catch {
        // Non-blocking
      }
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "FEE_INVOICE_GENERATED",
        entity_type: "student_invoice",
        entity_id: newInvoice.id,
        outcome: "success",
        metadata: {
          invoice_number: newInvoice.invoice_number,
          amount: newInvoice.total_amount,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, invoice: newInvoice });
  } catch (err: any) {
    console.error("POST /api/admin/fees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing student invoice
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, total_amount, paid_amount, status, due_date } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const billed = Number(total_amount);
    const paid = Number(paid_amount) || 0;
    const balance = Math.max(0, billed - paid);

    let calculatedStatus = status;
    if (!calculatedStatus) {
      if (paid >= billed) calculatedStatus = "paid";
      else if (paid > 0) calculatedStatus = "partially_paid";
      else calculatedStatus = "posted";
    }

    const updatePayload: any = {
      total_amount: billed,
      paid_amount: paid,
      balance_amount: balance,
      status: calculatedStatus,
      updated_at: new Date().toISOString(),
    };
    if (due_date) updatePayload.due_date = due_date;

    const { data: updatedInvoice, error: updateErr } = await supabase
      .from("student_invoices")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Update invoice error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "FEE_INVOICE_UPDATED",
        entity_type: "student_invoice",
        entity_id: id,
        outcome: "success",
        metadata: updatePayload,
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (err: any) {
    console.error("PUT /api/admin/fees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a student invoice
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete invoice lines if any
    await supabase.from("invoice_lines").delete().eq("invoice_id", id);
    // 2. Delete payment allocations if any
    await supabase.from("payment_allocations").delete().eq("invoice_id", id);
    // 3. Delete invoice
    const { error: delErr } = await supabase
      .from("student_invoices")
      .delete()
      .eq("id", id);

    if (delErr) {
      console.error("Delete invoice error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 4. Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "FEE_INVOICE_DELETED",
        entity_type: "student_invoice",
        entity_id: id,
        outcome: "success",
        metadata: { invoice_id: id },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, message: "Invoice removed from ledger." });
  } catch (err: any) {
    console.error("DELETE /api/admin/fees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

