import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const db = createDirectAdminClient() as any;
    const schoolId = tenant.schoolId;

    let iq = db.from("invoices").select("*").order("created_at", { ascending: false });
    let fq = db.from("fee_structures").select("*").order("code", { ascending: true });
    let sq = db.from("students").select("id, student_number, first_name, last_name, email");
    if (schoolId) {
      iq = iq.eq("school_id", schoolId);
      fq = fq.eq("school_id", schoolId);
      sq = sq.eq("school_id", schoolId);
    }

    const [invRes, fsRes, stRes] = await Promise.all([iq, fq, sq]);
    if (invRes.error) {
      return NextResponse.json({ error: invRes.error.message }, { status: 500 });
    }

    const stMap = new Map<string, any>(
      (stRes.data || []).map((s: any) => [String(s.id), s])
    );

    const invoices = (invRes.data || []).map((inv: any) => {
      const st = stMap.get(String(inv.student_id));
      const fullName = st
        ? `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.student_number
        : "Student";
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      return {
        ...inv,
        student_number: st?.student_number || "N/A",
        student_name: fullName,
        student_email: st?.email || "",
        total_amount: total,
        paid_amount: paid,
        balance_amount: Number(inv.balance ?? Math.max(0, total - paid)),
      };
    });

    const totalBilled = invoices.reduce((s: number, i: any) => s + i.total_amount, 0);
    const totalCollected = invoices.reduce((s: number, i: any) => s + i.paid_amount, 0);
    const totalOutstanding = invoices.reduce((s: number, i: any) => s + i.balance_amount, 0);

    return NextResponse.json({
      invoices,
      feeItems: fsRes.data || [],
      students: (stRes.data || []).map((s: any) => ({
        id: s.id,
        student_number: s.student_number,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.student_number,
        email: s.email,
      })),
      stats: {
        totalBilled,
        totalCollected,
        totalOutstanding,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
        totalInvoices: invoices.length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/fees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    const schoolId = targetSchool.schoolId;

    const db = createDirectAdminClient() as any;

    if (body.type === "fee_item") {
      if (!body.code?.trim() || !body.name?.trim()) {
        return NextResponse.json(
          { error: "Fee item code and name are required." },
          { status: 400 }
        );
      }
      const { data, error } = await db
        .from("fee_structures")
        .insert({
          school_id: schoolId,
          code: body.code.trim().toUpperCase(),
          name: body.name.trim(),
          category: body.category || "tuition",
          amount: Number(body.default_amount || body.amount || 0),
          description: body.description || null,
          is_mandatory: body.is_mandatory !== false,
          is_active: true,
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ feeItem: data, success: true });
    }

    if (!body.student_id) {
      return NextResponse.json({ error: "student_id is required." }, { status: 400 });
    }

    const total = Number(body.total_amount || 0);
    const paid = Number(body.paid_amount || 0);
    const balance = Math.max(0, total - paid);
    const { data, error } = await db
      .from("invoices")
      .insert({
        school_id: schoolId,
        invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        student_id: body.student_id,
        total_amount: total,
        paid_amount: paid,
        balance,
        status: balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
        due_date: body.due_date || null,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ invoice: data, success: true });
  } catch (err: any) {
    console.error("POST /api/admin/fees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
