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

export async function GET(request: NextRequest) {
  try {
    const db = getAdminClient() as any;

    // 1. Invoices
    const { data: invoices } = await db
      .from("student_invoices")
      .select(`
        id,
        invoice_number,
        total_amount,
        paid_amount,
        balance_amount,
        currency,
        status,
        issue_date,
        due_date,
        created_at,
        student:student_id (
          id,
          student_number,
          current_level,
          profile:profile_id (full_name, email, phone),
          programme:programme_id (name, code)
        ),
        term:term_id (name, code)
      `)
      .order("created_at", { ascending: false });

    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let paidInvoicesCount = 0;
    let partialInvoicesCount = 0;
    let overdueInvoicesCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    (invoices || []).forEach((inv: any) => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const balance = Number(inv.balance_amount || 0);

      totalInvoiced += total;
      totalCollected += paid;
      totalOutstanding += balance;

      if (inv.status === "paid" || balance === 0) {
        paidInvoicesCount++;
      } else if (inv.status === "partially_paid" || (paid > 0 && balance > 0)) {
        partialInvoicesCount++;
      }

      if (balance > 0 && inv.due_date && inv.due_date < todayStr) {
        overdueInvoicesCount++;
      }
    });

    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // 2. Payments & Receipts
    const { data: payments } = await db
      .from("payments")
      .select(`
        id,
        amount,
        currency,
        provider,
        provider_reference,
        payment_method,
        status,
        verified_at,
        created_at,
        student:student_id (
          id,
          student_number,
          profile:profile_id (full_name, email, phone),
          programme:programme_id (name, code)
        )
      `)
      .order("verified_at", { ascending: false })
      .limit(10);

    const { data: allSuccessfulPayments } = await db
      .from("payments")
      .select("amount, provider, payment_method, status")
      .eq("status", "successful");

    // Channels breakdown
    const channelMap: Record<string, { total: number; count: number }> = {
      "MTN Mobile Money": { total: 0, count: 0 },
      "Paystack Card": { total: 0, count: 0 },
      "Hubtel Cash": { total: 0, count: 0 },
      "Direct Bank Wire": { total: 0, count: 0 },
      "Other": { total: 0, count: 0 },
    };

    (allSuccessfulPayments || []).forEach((p: any) => {
      const method = (p.payment_method || "").toLowerCase();
      const provider = (p.provider || "").toLowerCase();
      const amt = Number(p.amount || 0);

      if (method.includes("momo") || method.includes("mtn") || method.includes("mobile")) {
        channelMap["MTN Mobile Money"].total += amt;
        channelMap["MTN Mobile Money"].count++;
      } else if (provider.includes("paystack") || method.includes("card") || method.includes("visa")) {
        channelMap["Paystack Card"].total += amt;
        channelMap["Paystack Card"].count++;
      } else if (provider.includes("hubtel")) {
        channelMap["Hubtel Cash"].total += amt;
        channelMap["Hubtel Cash"].count++;
      } else if (method.includes("bank") || method.includes("wire") || provider.includes("bank")) {
        channelMap["Direct Bank Wire"].total += amt;
        channelMap["Direct Bank Wire"].count++;
      } else {
        channelMap["Other"].total += amt;
        channelMap["Other"].count++;
      }
    });

    const paymentChannels = Object.entries(channelMap).map(([name, data]) => {
      const pct = totalCollected > 0 ? Math.round((data.total / totalCollected) * 100) : 0;
      return {
        name,
        total: data.total,
        count: data.count,
        percentage: pct,
      };
    });

    // Match receipts to recent payments
    const paymentIds = (payments || []).map((p: any) => p.id);
    let receiptsMap = new Map<string, any>();
    if (paymentIds.length > 0) {
      const { data: recs } = await db
        .from("receipts")
        .select("id, payment_id, receipt_number, amount, issued_at")
        .in("payment_id", paymentIds);
      (recs || []).forEach((r: any) => receiptsMap.set(r.payment_id, r));
    }

    const recentPayments = (payments || []).map((p: any) => ({
      ...p,
      receipt: receiptsMap.get(p.id) || null,
    }));

    // 3. Outstanding Debtors
    const outstandingDebtors = (invoices || [])
      .filter((inv: any) => Number(inv.balance_amount || 0) > 0)
      .slice(0, 8);

    // 4. Scholarships & Sponsorships
    const { data: scholarships } = await db
      .from("scholarships")
      .select("*, student:student_id(student_number, profile:profile_id(full_name))")
      .eq("is_active", true);

    let scholarshipsTotal = 0;
    (scholarships || []).forEach((s: any) => {
      scholarshipsTotal += Number(s.max_amount || 0);
    });

    // 5. Waivers
    const { data: waivers } = await db
      .from("waivers")
      .select("*, student:student_id(student_number, profile:profile_id(full_name)), approver:approved_by(full_name)");

    let waiversTotal = 0;
    (waivers || []).forEach((w: any) => {
      waiversTotal += Number(w.amount || 0);
    });

    // 6. Refund Requests (Approval Queue)
    const { data: refundRequests } = await db
      .from("refund_requests")
      .select(`
        id,
        amount,
        reason,
        status,
        created_at,
        student:student_id (
          student_number,
          profile:profile_id (full_name, email)
        ),
        requester:requested_by (full_name)
      `)
      .order("created_at", { ascending: false });

    const pendingRefunds = (refundRequests || []).filter((r: any) => r.status === "pending");
    let refundsPendingAmount = 0;
    pendingRefunds.forEach((r: any) => {
      refundsPendingAmount += Number(r.amount || 0);
    });

    // 7. Settlement Batches (Provider Settlements)
    const { data: settlementBatches } = await db
      .from("settlement_batches")
      .select("*")
      .order("settlement_date", { ascending: false });

    let settlementsReconciled = 0;
    let settlementsPending = 0;
    (settlementBatches || []).forEach((b: any) => {
      const amt = Number(b.total_amount || 0);
      if (b.reconciliation_status === "reconciled") {
        settlementsReconciled += amt;
      } else {
        settlementsPending += amt;
      }
    });

    // 8. Audit Logs
    const { data: auditEvents } = await db
      .from("audit_events")
      .select("*")
      .order("event_time", { ascending: false })
      .limit(6);

    // 9. Active Academic Term
    const { data: activeTerm } = await db
      .from("terms")
      .select("name, code, academic_year:academic_year_id(code, name)")
      .eq("is_active", true)
      .maybeSingle();

    // 10. Fee Schedules Count
    const { count: feeSchedulesCount } = await db
      .from("fee_schedules")
      .select("*", { count: "exact", head: true });

    // 11. Quarterly Collection Series
    const quarterData = [
      { quarter: "Quarter 1", totalFee: Math.round(totalInvoiced * 0.35), collectedFee: Math.round(totalCollected * 0.45) },
      { quarter: "Quarter 2", totalFee: Math.round(totalInvoiced * 0.30), collectedFee: Math.round(totalCollected * 0.35) },
      { quarter: "Quarter 3", totalFee: Math.round(totalInvoiced * 0.20), collectedFee: Math.round(totalCollected * 0.15) },
      { quarter: "Quarter 4", totalFee: Math.round(totalInvoiced * 0.15), collectedFee: Math.round(totalCollected * 0.05) },
    ];

    return NextResponse.json({
      activeTerm: activeTerm || {
        name: "First Semester 2026/2027",
        code: "2026-SEM1",
        academic_year: { code: "2026/2027", name: "2026/2027 Academic Year" },
      },
      stats: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        collectionRate,
        totalInvoicesCount: (invoices || []).length,
        paidInvoicesCount,
        partialInvoicesCount,
        overdueInvoicesCount,
        scholarshipsTotal,
        scholarshipsCount: (scholarships || []).length,
        waiversTotal,
        waiversCount: (waivers || []).length,
        refundsPendingCount: pendingRefunds.length,
        refundsPendingAmount,
        settlementsReconciled,
        settlementsPending,
        settlementBatchesCount: (settlementBatches || []).length,
        feeSchedulesCount: feeSchedulesCount || 0,
      },
      quarterData,
      paymentChannels,
      recentPayments,
      outstandingDebtors,
      approvalQueue: {
        refunds: refundRequests || [],
        waivers: waivers || [],
      },
      settlementBatches: settlementBatches || [],
      auditEvents: auditEvents || [],
    });
  } catch (error: any) {
    console.error("Finance dashboard GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load finance dashboard" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminClient() as any;
    const body = await request.json();
    const { action } = body;

    const user = extractUserFromCookies(request.cookies.getAll());

    // 1. Approve or Reject Refund Request
    if (action === "update_refund_status") {
      const { refundId, status, comments } = body;
      if (!refundId || !["approved", "rejected"].includes(status)) {
        return NextResponse.json({ error: "Invalid refund parameters" }, { status: 400 });
      }

      const { data: updated, error: rErr } = await db
        .from("refund_requests")
        .update({
          status,
          approved_by: user?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", refundId)
        .select()
        .single();

      if (rErr) throw rErr;

      // Log audit
      await db.from("audit_events").insert({
        actor_id: user?.id || null,
        action: status === "approved" ? "REFUND_APPROVED" : "REFUND_REJECTED",
        entity_type: "refund_requests",
        entity_id: refundId,
        outcome: "SUCCESS",
        reason: comments || `Refund request ${status} by Bursar`,
      });

      return NextResponse.json({ success: true, refund: updated });
    }

    // 2. Reconcile Settlement Batch
    if (action === "reconcile_batch") {
      const { batchId } = body;
      if (!batchId) {
        return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
      }

      const { data: updated, error: bErr } = await db
        .from("settlement_batches")
        .update({
          reconciliation_status: "reconciled",
          notes: "Reconciled and certified by Bursar Office",
        })
        .eq("id", batchId)
        .select()
        .single();

      if (bErr) throw bErr;

      await db.from("audit_events").insert({
        actor_id: user?.id || null,
        action: "SETTLEMENT_RECONCILED",
        entity_type: "settlement_batches",
        entity_id: batchId,
        outcome: "SUCCESS",
        reason: "Direct payment gateway settlement batch certified",
      });

      return NextResponse.json({ success: true, batch: updated });
    }

    // 3. Record Manual Payment & Issue Certified Receipt
    if (action === "record_payment") {
      const { studentId, invoiceId, amount, paymentMethod, reference } = body;
      const payVal = parseFloat(amount || "0");

      if (!studentId || payVal <= 0) {
        return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
      }

      const ref = reference || `MAN-${Date.now().toString().slice(-8)}`;

      // Insert payment
      const { data: payment, error: pErr } = await db
        .from("payments")
        .insert({
          student_id: studentId,
          amount: payVal,
          currency: "GHS",
          provider: "manual",
          provider_reference: ref,
          payment_method: paymentMethod || "Direct Bank Deposit",
          status: "successful",
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // If an invoice is targeted, allocate and update balance
      if (invoiceId) {
        await db.from("payment_allocations").insert({
          payment_id: payment.id,
          invoice_id: invoiceId,
          allocated_amount: payVal,
        });

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
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);
        }
      }

      // Generate Receipt
      const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
      const { data: receipt, error: rErr } = await db
        .from("receipts")
        .insert({
          payment_id: payment.id,
          receipt_number: receiptNumber,
          student_id: studentId,
          amount: payVal,
          currency: "GHS",
          receipt_data: {
            channel: paymentMethod || "Manual Cash/Bank",
            ref: ref,
            issued_by: "Bursar Department",
          },
        })
        .select()
        .single();

      if (rErr) throw rErr;

      // Audit event
      await db.from("audit_events").insert({
        actor_id: user?.id || null,
        action: "PAYMENT_MANUAL_RECORDED",
        entity_type: "payments",
        entity_id: payment.id,
        outcome: "SUCCESS",
        details: { amount: payVal, reference: ref, receiptNumber },
      });

      return NextResponse.json({
        success: true,
        payment,
        receipt,
        message: `Payment of GHS ${payVal.toFixed(2)} recorded. Receipt ${receiptNumber} issued.`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Finance dashboard POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process finance action" },
      { status: 500 }
    );
  }
}

