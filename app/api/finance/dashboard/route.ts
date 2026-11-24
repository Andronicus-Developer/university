import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveFinancePortalContext,
  safeFinanceQuery,
} from "@/lib/finance/finance-context";

export async function GET(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveFinancePortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const db = createDirectAdminClient() as any;
    const schoolId = ctx.schoolId;

    const [invRes, payRes, fsRes, activeTermRes] = await Promise.all([
      safeFinanceQuery(
        db
          .from("invoices")
          .select("id, invoice_number, student_id, total_amount, paid_amount, balance, status, due_date, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
      ),
      safeFinanceQuery(
        db
          .from("payments")
          .select("id, student_id, amount, currency, provider, provider_reference, payment_method, status, verified_at, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(20)
      ),
      safeFinanceQuery(
        db
          .from("fee_structures")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
      ),
      safeFinanceQuery(
        db
          .from("terms")
          .select("name, code")
          .eq("school_id", schoolId)
          .order("is_current", { ascending: false })
          .limit(1)
          .maybeSingle()
      ),
    ]);

    const invoices = invRes.data || [];
    const payments = payRes.data || [];

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
    const totalCollected = invoices.reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
    const totalOutstanding = invoices.reduce(
      (s: number, i: any) =>
        s + Math.max(0, Number(i.balance ?? Number(i.total_amount || 0) - Number(i.paid_amount || 0))),
      0
    );

    return NextResponse.json({
      school: { id: schoolId, name: ctx.schoolName, currency: ctx.currency },
      activeTerm: activeTermRes.data || null,
      stats: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        collectionRate: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0,
        totalInvoicesCount: invoices.length,
        feeStructuresCount: fsRes.data ? (fsRes.data as any).length : 0,
      },
      recentPayments: payments,
    });
  } catch (err: any) {
    console.error("GET /api/finance/dashboard error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load finance dashboard" },
      { status: 500 }
    );
  }
}
