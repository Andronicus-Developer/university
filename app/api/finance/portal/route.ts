import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  isMissingTableOrColumnError,
  resolveFinancePortalContext,
  safeFinanceQuery,
} from "@/lib/finance/finance-context";

function studentName(s: any): string {
  const full = `${s?.first_name || ""} ${s?.last_name || ""}`.trim();
  return full || s?.student_number || "Student";
}

function defaultFinanceSettings(academicSettings: Record<string, any>, currency: string) {
  const fs = academicSettings?.finance_settings || {};
  return {
    receipt_prefix: String(fs.receipt_prefix || "RCP"),
    receipt_footer: String(
      fs.receipt_footer || "Official receipt issued by School Bursary & Accounts."
    ),
    default_due_days: Number(fs.default_due_days || 30),
    online_payments_enabled: Boolean(fs.online_payments_enabled ?? false),
    currency,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveFinancePortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const section = req.nextUrl.searchParams.get("section") || "dashboard";
    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;

    const baseInfo = {
      school: {
        id: schoolId,
        name: ctx.schoolName,
        school_type: ctx.schoolType,
        currency: ctx.currency,
        address: ctx.schoolAddress,
        phone: ctx.schoolPhone,
        email: ctx.schoolEmail,
        logo_url: ctx.schoolLogo,
      },
      financeSettings: defaultFinanceSettings(ctx.academicSettings, ctx.currency),
      missingTables: [] as string[],
    };

    const [activeTermRes, studentsRes] = await Promise.all([
      safeFinanceQuery(
        db
          .from("terms")
          .select("id, name, code, start_date, end_date, is_current")
          .eq("school_id", schoolId)
          .order("is_current", { ascending: false })
          .limit(1)
          .maybeSingle()
      ),
      safeFinanceQuery(
        db
          .from("students")
          .select(
            "id, student_number, first_name, last_name, email, phone, status, programme_id, department_id, class_group_id, intake_id, current_level"
          )
          .eq("school_id", schoolId)
          .order("first_name", { ascending: true })
      ),
    ]);

    const activeTerm = activeTermRes.data || null;
    const students = studentsRes.data || [];
    const studentMap = new Map<string, any>(students.map((s: any) => [String(s.id), s]));

    if (section === "dashboard") {
      const [invRes, payRes] = await Promise.all([
        safeFinanceQuery(
          db
            .from("invoices")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        ),
        safeFinanceQuery(
          db
            .from("payments")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
            .limit(30)
        ),
      ]);

      const invoices = invRes.data || [];
      const payments = payRes.data || [];

      const expectedRevenue = invoices.reduce(
        (sum: number, i: any) => sum + Number(i.total_amount || 0),
        0
      );
      const outstandingArrears = invoices.reduce(
        (sum: number, i: any) =>
          sum + Math.max(0, Number(i.balance ?? Number(i.total_amount || 0) - Number(i.paid_amount || 0))),
        0
      );
      const collectedFromInvoices = invoices.reduce(
        (sum: number, i: any) => sum + Number(i.paid_amount || 0),
        0
      );
      const successfulPaymentsTotal = payments
        .filter((p: any) => p.status === "successful")
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const collectedThisTerm = Math.max(collectedFromInvoices, successfulPaymentsTotal);

      const todayIso = new Date().toISOString().slice(0, 10);
      const todaysCollections = payments
        .filter(
          (p: any) =>
            p.status === "successful" &&
            String(p.payment_date || p.created_at || "").slice(0, 10) === todayIso
        )
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      const recentTransactions = payments.slice(0, 15).map((p: any) => {
        const st = studentMap.get(String(p.student_id));
        return {
          ...p,
          student_name: studentName(st),
          student_number: st?.student_number || "N/A",
        };
      });

      return NextResponse.json({
        ...baseInfo,
        activeTerm,
        kpis: {
          expectedRevenue,
          collectedThisTerm,
          outstandingArrears,
          todaysCollections,
        },
        recentTransactions,
      });
    }

    if (section === "fee_structures") {
      const [fsRes, progsRes, deptsRes, classesRes, intakesRes, termsRes, invRes] =
        await Promise.all([
          safeFinanceQuery(
            db
              .from("fee_structures")
              .select("*")
              .eq("school_id", schoolId)
              .order("created_at", { ascending: false })
          ),
          safeFinanceQuery(
            db.from("programmes").select("id, name, code").eq("school_id", schoolId).order("name")
          ),
          safeFinanceQuery(
            db.from("departments").select("id, name, code").eq("school_id", schoolId).order("name")
          ),
          safeFinanceQuery(
            db
              .from("class_groups")
              .select("id, name, grade_level")
              .eq("school_id", schoolId)
              .order("name")
          ),
          safeFinanceQuery(
            db
              .from("vocational_intakes")
              .select("id, name, code")
              .eq("school_id", schoolId)
              .order("name")
          ),
          safeFinanceQuery(
            db.from("terms").select("id, name, code, is_current").eq("school_id", schoolId).order("name")
          ),
          safeFinanceQuery(
            db
              .from("invoices")
              .select("*")
              .eq("school_id", schoolId)
              .order("created_at", { ascending: false })
              .limit(40)
          ),
        ]);

      const invoices = (invRes.data || []).map((i: any) => {
        const st = studentMap.get(String(i.student_id));
        return {
          ...i,
          student_name: studentName(st),
          student_number: st?.student_number || "N/A",
        };
      });

      return NextResponse.json({
        ...baseInfo,
        activeTerm,
        feeStructures: fsRes.data || [],
        programmes: progsRes.data || [],
        departments: deptsRes.data || [],
        classGroups: classesRes.data || [],
        intakes: intakesRes.data || [],
        terms: termsRes.data || [],
        students: students.map((s: any) => ({
          id: s.id,
          student_number: s.student_number,
          full_name: studentName(s),
          programme_id: s.programme_id,
          department_id: s.department_id,
          class_group_id: s.class_group_id,
          intake_id: s.intake_id,
        })),
        recentInvoices: invoices,
      });
    }

    if (section === "collect") {
      const [invRes, payRes] = await Promise.all([
        safeFinanceQuery(
          db
            .from("invoices")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
        ),
        safeFinanceQuery(
          db
            .from("payments")
            .select("*")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
            .limit(40)
        ),
      ]);

      const invoicesByStudent = new Map<string, any[]>();
      for (const inv of invRes.data || []) {
        const sid = String(inv.student_id);
        if (!invoicesByStudent.has(sid)) invoicesByStudent.set(sid, []);
        invoicesByStudent.get(sid)!.push(inv);
      }

      const studentAccounts = students.map((s: any) => {
        const invs = invoicesByStudent.get(String(s.id)) || [];
        const totalBilled = invs.reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
        const totalPaid = invs.reduce((acc, i) => acc + Number(i.paid_amount || 0), 0);
        const balance = Math.max(0, totalBilled - totalPaid);
        return {
          id: s.id,
          student_number: s.student_number,
          full_name: studentName(s),
          email: s.email,
          phone: s.phone,
          totalBilled,
          totalPaid,
          balance,
          openInvoices: invs.filter(
            (i) =>
              Number(i.balance ?? Number(i.total_amount || 0) - Number(i.paid_amount || 0)) > 0
          ),
        };
      });

      const payments = (payRes.data || []).map((p: any) => {
        const st = studentMap.get(String(p.student_id));
        return {
          ...p,
          student_name: studentName(st),
          student_number: st?.student_number || "N/A",
        };
      });

      return NextResponse.json({
        ...baseInfo,
        students: studentAccounts,
        payments,
      });
    }

    if (section === "balances") {
      const [invRes, payRes, progsRes, deptsRes, classesRes, intakesRes] =
        await Promise.all([
          safeFinanceQuery(
            db.from("invoices").select("*").eq("school_id", schoolId)
          ),
          safeFinanceQuery(
            db
              .from("payments")
              .select("id, student_id, amount, status")
              .eq("school_id", schoolId)
              .eq("status", "successful")
          ),
          safeFinanceQuery(db.from("programmes").select("id, name").eq("school_id", schoolId)),
          safeFinanceQuery(db.from("departments").select("id, name").eq("school_id", schoolId)),
          safeFinanceQuery(db.from("class_groups").select("id, name").eq("school_id", schoolId)),
          safeFinanceQuery(
            db.from("vocational_intakes").select("id, name").eq("school_id", schoolId)
          ),
        ]);

      const progMap = new Map((progsRes.data || []).map((p: any) => [String(p.id), p.name]));
      const deptMap = new Map((deptsRes.data || []).map((d: any) => [String(d.id), d.name]));
      const classMap = new Map((classesRes.data || []).map((c: any) => [String(c.id), c.name]));
      const intakeMap = new Map((intakesRes.data || []).map((i: any) => [String(i.id), i.name]));

      const invTotals = new Map<string, { billed: number; paid: number }>();
      for (const inv of invRes.data || []) {
        const sid = String(inv.student_id);
        const cur = invTotals.get(sid) || { billed: 0, paid: 0 };
        cur.billed += Number(inv.total_amount || 0);
        cur.paid += Number(inv.paid_amount || 0);
        invTotals.set(sid, cur);
      }

      const payTotals = new Map<string, number>();
      for (const p of payRes.data || []) {
        const sid = String(p.student_id);
        payTotals.set(sid, (payTotals.get(sid) || 0) + Number(p.amount || 0));
      }

      const ledger = students.map((s: any) => {
        const sid = String(s.id);
        const inv = invTotals.get(sid) || { billed: 0, paid: 0 };
        const paid = Math.max(inv.paid, payTotals.get(sid) || 0);
        const billed = inv.billed;
        const balance = Math.max(0, billed - paid);
        const feeStatus =
          billed === 0
            ? paid > 0
              ? "paid"
              : "unpaid"
            : balance <= 0
            ? "paid"
            : paid > 0
            ? "partial"
            : "unpaid";

        const unitName =
          (s.class_group_id ? classMap.get(String(s.class_group_id)) : null) ||
          (s.programme_id ? progMap.get(String(s.programme_id)) : null) ||
          (s.intake_id ? intakeMap.get(String(s.intake_id)) : null) ||
          (s.department_id ? deptMap.get(String(s.department_id)) : null) ||
          "General";

        return {
          id: s.id,
          student_number: s.student_number,
          full_name: studentName(s),
          unitName,
          billed,
          paid,
          balance,
          status: feeStatus,
        };
      });

      return NextResponse.json({
        ...baseInfo,
        ledger,
      });
    }

    if (section === "expenses") {
      const expRes = await safeFinanceQuery(
        db
          .from("school_expenses")
          .select("*")
          .eq("school_id", schoolId)
          .order("expense_date", { ascending: false })
      );
      const missingTables = expRes.missing ? ["school_expenses"] : [];
      return NextResponse.json({
        ...baseInfo,
        missingTables,
        expenses: expRes.data || [],
      });
    }

    if (section === "payroll") {
      const [payRes, staffRes] = await Promise.all([
        safeFinanceQuery(
          db
            .from("staff_payroll_records")
            .select("*")
            .eq("school_id", schoolId)
            .order("pay_period", { ascending: false })
        ),
        safeFinanceQuery(
          db
            .from("staff_profiles")
            .select("id, staff_number, first_name, last_name, designation, role_code, salary_grade, employment_status")
            .eq("school_id", schoolId)
            .order("first_name", { ascending: true })
        ),
      ]);

      const missingTables = payRes.missing ? ["staff_payroll_records"] : [];
      const staffList = (staffRes.data || []).map((st: any) => ({
        ...st,
        full_name: `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.staff_number || "Staff",
      }));
      const staffMap = new Map<string, any>(staffList.map((st: any) => [String(st.id), st]));

      const records = (payRes.data || []).map((r: any) => {
        const st = staffMap.get(String(r.staff_id));
        return {
          ...r,
          staff_name: st?.full_name || "Staff",
          staff_number: st?.staff_number || "",
          designation: st?.designation || st?.role_code || "",
        };
      });

      return NextResponse.json({
        ...baseInfo,
        missingTables,
        records,
        staffList,
      });
    }

    if (section === "reports") {
      const fromDate = req.nextUrl.searchParams.get("from") || "";
      const toDate = req.nextUrl.searchParams.get("to") || "";

      const [invRes, payRes, expRes, prRes, progsRes, deptsRes, classesRes, intakesRes] =
        await Promise.all([
          safeFinanceQuery(db.from("invoices").select("*").eq("school_id", schoolId)),
          safeFinanceQuery(
            db
              .from("payments")
              .select("*")
              .eq("school_id", schoolId)
              .eq("status", "successful")
          ),
          safeFinanceQuery(db.from("school_expenses").select("*").eq("school_id", schoolId)),
          safeFinanceQuery(
            db
              .from("staff_payroll_records")
              .select("*")
              .eq("school_id", schoolId)
              .eq("status", "paid")
          ),
          safeFinanceQuery(db.from("programmes").select("id, name").eq("school_id", schoolId)),
          safeFinanceQuery(db.from("departments").select("id, name").eq("school_id", schoolId)),
          safeFinanceQuery(db.from("class_groups").select("id, name").eq("school_id", schoolId)),
          safeFinanceQuery(
            db.from("vocational_intakes").select("id, name").eq("school_id", schoolId)
          ),
        ]);

      const missingTables: string[] = [];
      if (expRes.missing) missingTables.push("school_expenses");
      if (prRes.missing) missingTables.push("staff_payroll_records");

      const inRange = (d?: string | null) => {
        const day = String(d || "").slice(0, 10);
        if (!day) return true;
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
        return true;
      };

      const payments = (payRes.data || []).filter((p: any) =>
        inRange(p.payment_date || p.created_at)
      );
      const expenses = (expRes.data || []).filter((e: any) => inRange(e.expense_date));
      const paidPayroll = (prRes.data || []).filter((r: any) =>
        inRange(r.paid_at || r.created_at)
      );

      const totalIncome = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const operationalExpenses = expenses.reduce(
        (s: number, e: any) => s + Number(e.amount || 0),
        0
      );
      const payrollDisbursed = paidPayroll.reduce(
        (s: number, r: any) => s + Number(r.net_pay || 0),
        0
      );

      const progMap = new Map<string, string>((progsRes.data || []).map((p: any) => [String(p.id), String(p.name || "")]));
      const deptMap = new Map<string, string>((deptsRes.data || []).map((d: any) => [String(d.id), String(d.name || "")]));
      const classMap = new Map<string, string>((classesRes.data || []).map((c: any) => [String(c.id), String(c.name || "")]));
      const intakeMap = new Map<string, string>((intakesRes.data || []).map((i: any) => [String(i.id), String(i.name || "")]));

      const unitLookup = (s: any): string =>
        (s?.class_group_id ? classMap.get(String(s.class_group_id)) : null) ||
        (s?.programme_id ? progMap.get(String(s.programme_id)) : null) ||
        (s?.intake_id ? intakeMap.get(String(s.intake_id)) : null) ||
        (s?.department_id ? deptMap.get(String(s.department_id)) : null) ||
        "Unassigned";

      const breakdownMap = new Map<
        string,
        { group: string; billed: number; collected: number; outstanding: number }
      >();

      for (const inv of invRes.data || []) {
        if (!inRange(inv.created_at)) continue;
        const st = studentMap.get(String(inv.student_id));
        const grp = unitLookup(st);
        const cur = breakdownMap.get(grp) || {
          group: grp,
          billed: 0,
          collected: 0,
          outstanding: 0,
        };
        const billed = Number(inv.total_amount || 0);
        const paid = Number(inv.paid_amount || 0);
        cur.billed += billed;
        cur.collected += paid;
        cur.outstanding += Math.max(0, billed - paid);
        breakdownMap.set(grp, cur);
      }

      return NextResponse.json({
        ...baseInfo,
        missingTables,
        summary: {
          totalIncome,
          operationalExpenses,
          payrollDisbursed,
          totalExpenses: operationalExpenses + payrollDisbursed,
          netSurplus: totalIncome - (operationalExpenses + payrollDisbursed),
          paymentsCount: payments.length,
          expensesCount: expenses.length,
        },
        breakdownByUnit: Array.from(breakdownMap.values()),
      });
    }

    if (section === "settings") {
      return NextResponse.json({
        ...baseInfo,
        profile: {
          full_name: ctx.fullName,
          email: ctx.email,
          phone: ctx.staffProfile?.phone || "",
          designation: ctx.staffProfile?.designation || ctx.primaryRole.replace(/_/g, " "),
        },
      });
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/finance/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveFinancePortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;

    if (action === "create_fee_structure") {
      const name = String(body?.name || "").trim();
      const amount = Number(body?.amount || 0);
      if (!name || !Number.isFinite(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Fee name and non-negative amount are required." },
          { status: 400 }
        );
      }
      const code =
        String(body?.code || "").trim() ||
        `FEE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data, error } = await db
        .from("fee_structures")
        .insert({
          school_id: schoolId,
          name,
          code,
          category: String(body?.category || "tuition"),
          amount,
          currency: ctx.currency,
          programme_id: body?.programmeId || null,
          department_id: body?.departmentId || null,
          term_id: body?.termId || null,
          is_mandatory: body?.isMandatory !== false,
          is_active: true,
          description: body?.description ? String(body.description).trim() : null,
          metadata: body?.classGroupId ? { class_group_id: body.classGroupId } : {},
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, feeStructure: data });
    }

    if (action === "delete_fee_structure") {
      const id = String(body?.id || "");
      const { error } = await db
        .from("fee_structures")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "generate_invoices") {
      const targetMode = String(body?.targetMode || "student"); // 'student' | 'all' | 'programme' | 'class_group' | 'department' | 'intake'
      const feeStructureId = body?.feeStructureId ? String(body.feeStructureId) : null;
      const customAmount = Number(body?.amount || 0);
      const description = String(body?.description || "").trim() || "Term / Tuition Fee";
      const dueDate = body?.dueDate ? String(body.dueDate) : null;
      const termId = body?.termId ? String(body.termId) : null;

      let amount = customAmount;
      let resolvedDescription = description;
      if (feeStructureId) {
        const { data: fsRow } = await db
          .from("fee_structures")
          .select("*")
          .eq("id", feeStructureId)
          .eq("school_id", schoolId)
          .maybeSingle();
        if (fsRow) {
          if (!amount) amount = Number(fsRow.amount || 0);
          if (!body?.description) resolvedDescription = fsRow.name;
        }
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Billing amount must be greater than zero." },
          { status: 400 }
        );
      }

      let studentIds: string[] = [];
      if (targetMode === "student" && body?.studentId) {
        studentIds = [String(body.studentId)];
      } else {
        let q = db
          .from("students")
          .select("id")
          .eq("school_id", schoolId)
          .eq("status", "active");
        if (targetMode === "programme" && body?.targetId) q = q.eq("programme_id", body.targetId);
        if (targetMode === "class_group" && body?.targetId) q = q.eq("class_group_id", body.targetId);
        if (targetMode === "department" && body?.targetId) q = q.eq("department_id", body.targetId);
        if (targetMode === "intake" && body?.targetId) q = q.eq("intake_id", body.targetId);

        const { data: matched } = await q;
        studentIds = (matched || []).map((m: any) => String(m.id));
      }

      if (studentIds.length === 0) {
        return NextResponse.json(
          { error: "No matching active learners found for billing." },
          { status: 400 }
        );
      }

      const stamp = Date.now().toString(36).toUpperCase();
      const fullRows = studentIds.map((sid, idx) => ({
        school_id: schoolId,
        invoice_number: `INV-${stamp}-${String(idx + 1).padStart(3, "0")}`,
        student_id: sid,
        total_amount: amount,
        paid_amount: 0,
        balance: amount,
        status: "unpaid",
        due_date: dueDate,
        term_id: termId,
        fee_structure_id: feeStructureId,
        description: resolvedDescription,
        currency: ctx.currency,
      }));

      let { data: inserted, error: invErr } = await db
        .from("invoices")
        .insert(fullRows)
        .select("id");

      if (invErr && isMissingTableOrColumnError(invErr)) {
        const coreRows = studentIds.map((sid, idx) => ({
          school_id: schoolId,
          invoice_number: `INV-${stamp}-${String(idx + 1).padStart(3, "0")}`,
          student_id: sid,
          total_amount: amount,
          paid_amount: 0,
          balance: amount,
          status: "unpaid",
          due_date: dueDate,
        }));
        const fb = await db.from("invoices").insert(coreRows).select("id");
        inserted = fb.data;
        invErr = fb.error;
      }

      if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });
      return NextResponse.json({ ok: true, count: (inserted || []).length });
    }

    if (action === "record_payment") {
      const studentId = String(body?.studentId || "");
      const amount = Number(body?.amount || 0);
      const paymentMethod = String(body?.paymentMethod || "cash");
      const invoiceId = body?.invoiceId ? String(body.invoiceId) : null;
      const paymentDate = String(body?.paymentDate || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      const notes = body?.notes ? String(body.notes).trim() : null;

      if (!studentId || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Student/Trainee and valid payment amount are required." },
          { status: 400 }
        );
      }

      const prefix = defaultFinanceSettings(ctx.academicSettings, ctx.currency).receipt_prefix;
      const receiptNumber = `${prefix}-${new Date().getFullYear()}-${Math.floor(
        100000 + Math.random() * 900000
      )}`;
      const providerRef = String(body?.reference || "").trim() || receiptNumber;

      // Apply to target invoice or oldest unpaid invoice
      let targetInvoiceId = invoiceId;
      let targetInvoice: any = null;
      if (targetInvoiceId) {
        const { data: invRow } = await db
          .from("invoices")
          .select("*")
          .eq("id", targetInvoiceId)
          .eq("school_id", schoolId)
          .maybeSingle();
        targetInvoice = invRow;
      } else {
        const { data: openInvs } = await db
          .from("invoices")
          .select("*")
          .eq("school_id", schoolId)
          .eq("student_id", studentId)
          .gt("balance", 0)
          .order("created_at", { ascending: true })
          .limit(1);
        targetInvoice = openInvs?.[0] || null;
        targetInvoiceId = targetInvoice?.id || null;
      }

      let { data: paymentRow, error: payErr } = await db
        .from("payments")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          invoice_id: targetInvoiceId,
          amount,
          currency: ctx.currency,
          provider: body?.provider ? String(body.provider) : "bursary_desk",
          provider_reference: providerRef,
          receipt_number: receiptNumber,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          status: "successful",
          verified_at: new Date().toISOString(),
          recorded_by: ctx.userId,
          notes,
        })
        .select("*")
        .single();

      if (payErr && isMissingTableOrColumnError(payErr)) {
        const fb = await db
          .from("payments")
          .insert({
            school_id: schoolId,
            student_id: studentId,
            amount,
            currency: ctx.currency,
            provider: "bursary_desk",
            provider_reference: receiptNumber,
            payment_method: paymentMethod,
            status: "successful",
            verified_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        paymentRow = fb.data;
        payErr = fb.error;
      }

      if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 });

      if (targetInvoice) {
        const newPaid = Number(targetInvoice.paid_amount || 0) + amount;
        const newBalance = Math.max(0, Number(targetInvoice.total_amount || 0) - newPaid);
        const newStatus = newBalance <= 0 ? "paid" : "partial";
        await db
          .from("invoices")
          .update({
            paid_amount: newPaid,
            balance: newBalance,
            status: newStatus,
          })
          .eq("id", targetInvoice.id)
          .eq("school_id", schoolId);
      }

      return NextResponse.json({
        ok: true,
        payment: {
          ...paymentRow,
          receipt_number: paymentRow?.receipt_number || receiptNumber,
        },
      });
    }

    if (action === "create_expense") {
      const description = String(body?.description || "").trim();
      const amount = Number(body?.amount || 0);
      if (!description || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Expense description and positive amount are required." },
          { status: 400 }
        );
      }
      const { data, error } = await db
        .from("school_expenses")
        .insert({
          school_id: schoolId,
          expense_date: String(body?.expenseDate || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
          category: String(body?.category || "operations"),
          vendor: body?.vendor ? String(body.vendor).trim() : null,
          description,
          amount,
          currency: ctx.currency,
          payment_method: String(body?.paymentMethod || "cash"),
          receipt_reference: body?.receiptReference ? String(body.receiptReference).trim() : null,
          status: "recorded",
          recorded_by: ctx.userId,
        })
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, expense: data });
    }

    if (action === "delete_expense") {
      const id = String(body?.id || "");
      const { error } = await db
        .from("school_expenses")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_payroll") {
      const staffId = String(body?.staffId || "");
      const payPeriod = String(body?.payPeriod || "").trim();
      const baseSalary = Number(body?.baseSalary || 0);
      const allowances = Number(body?.allowances || 0);
      const deductions = Number(body?.deductions || 0);
      if (!staffId || !payPeriod) {
        return NextResponse.json(
          { error: "Staff member and pay period (YYYY-MM) are required." },
          { status: 400 }
        );
      }
      const netPay = Math.max(0, baseSalary + allowances - deductions);

      const { data, error } = await db
        .from("staff_payroll_records")
        .upsert(
          {
            school_id: schoolId,
            staff_id: staffId,
            pay_period: payPeriod,
            base_salary: baseSalary,
            allowances,
            deductions,
            net_pay: netPay,
            currency: ctx.currency,
            payment_method: String(body?.paymentMethod || "bank_transfer"),
            notes: body?.notes ? String(body.notes).trim() : null,
            recorded_by: ctx.userId,
          },
          { onConflict: "school_id,staff_id,pay_period" }
        )
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, record: data });
    }

    if (action === "mark_payroll_paid") {
      const id = String(body?.id || "");
      const { data, error } = await db
        .from("staff_payroll_records")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_reference:
            String(body?.paymentReference || "").trim() ||
            `SAL-${Date.now().toString(36).toUpperCase()}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, record: data });
    }

    if (action === "delete_payroll") {
      const id = String(body?.id || "");
      const { error } = await db
        .from("staff_payroll_records")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_finance_settings") {
      const merged = {
        ...ctx.academicSettings,
        finance_settings: {
          receipt_prefix: String(body?.receiptPrefix || "RCP").trim().toUpperCase(),
          receipt_footer: String(body?.receiptFooter || "").trim(),
          default_due_days: Number(body?.defaultDueDays || 30),
          online_payments_enabled: Boolean(body?.onlinePaymentsEnabled),
        },
      };
      const { error } = await db
        .from("schools")
        .update({ academic_settings: merged, updated_at: new Date().toISOString() })
        .eq("id", schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "update_profile") {
      const fullName = String(body?.fullName || "").trim();
      const phone = String(body?.phone || "").trim();
      if (fullName) {
        await db
          .from("profiles")
          .update({ full_name: fullName, phone: phone || null })
          .eq("id", ctx.userId);
      }
      if (ctx.staffProfile?.id) {
        await db
          .from("staff_profiles")
          .update({ phone: phone || null, updated_at: new Date().toISOString() })
          .eq("id", ctx.staffProfile.id)
          .eq("school_id", schoolId);
      }
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
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/finance/portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
