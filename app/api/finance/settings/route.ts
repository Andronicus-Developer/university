import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractUserFromCookies } from "@/lib/supabase/fetch";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const db = supabase as any;

    const { data, error } = await db
      .from("system_settings")
      .select("*")
      .in("setting_key", ["payment_gateways", "finance_policy", "academic_policy"]);

    if (error) throw error;

    let config = {
      currency: "GHS",
      currency_symbol: "GH₵",
      academic_year: "2026/2027",
      active_semester: "Semester 1",
      auto_generate_invoices: true,
      dual_control_enforced: true,
      refund_dual_control_threshold: 500,
      write_off_limit: 50,
      debt_threshold_exam_block_pct: 30,
      debt_transcript_hold: true,
      late_payment_penalty: 150,
      paystack_enabled: true,
      hubtel_enabled: true,
      cashier_desk_enabled: true,
      bank_wire_enabled: true,
      auto_receipt_generation: true,
    };

    if (data && data.length > 0) {
      data.forEach((item: any) => {
        if (item.setting_key === "payment_gateways") {
          const v = item.setting_value || {};
          config.currency = v.currency || config.currency;
          config.auto_receipt_generation = v.auto_receipt_generation ?? config.auto_receipt_generation;
          if (Array.isArray(v.supported_providers)) {
            config.paystack_enabled = v.supported_providers.includes("paystack");
            config.hubtel_enabled = v.supported_providers.includes("hubtel");
            config.cashier_desk_enabled = v.supported_providers.includes("cashier");
            config.bank_wire_enabled = v.supported_providers.includes("bank_wire");
          }
        }

        if (item.setting_key === "finance_policy") {
          const v = item.setting_value || {};
          config = { ...config, ...v };
        }

        if (item.setting_key === "academic_policy") {
          const v = item.setting_value || {};
          if (v.current_academic_year) config.academic_year = v.current_academic_year;
          if (v.active_semester) config.active_semester = v.active_semester;
          if (v.late_registration_fine) config.late_payment_penalty = v.late_registration_fine;
          if (v.restrict_transcript_on_debt !== undefined) config.debt_transcript_hold = v.restrict_transcript_on_debt;
        }
      });
    }

    return NextResponse.json({ success: true, settings: config });
  } catch (err: any) {
    console.error("GET /api/finance/settings error:", err);
    return NextResponse.json({ error: err.message || "Failed to load finance settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = extractUserFromCookies(req.cookies.getAll());
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const db = supabase as any;

    const providers = [];
    if (body.paystack_enabled) providers.push("paystack");
    if (body.hubtel_enabled) providers.push("hubtel");
    if (body.cashier_desk_enabled) providers.push("cashier");
    if (body.bank_wire_enabled) providers.push("bank_wire");

    // 1. Update payment_gateways
    const { error: err1 } = await db.from("system_settings").upsert(
      {
        setting_key: "payment_gateways",
        category: "finance",
        description: "Payment provider configurations and digital receipt settings",
        setting_value: {
          currency: body.currency || "GHS",
          default_provider: body.paystack_enabled ? "paystack" : "hubtel",
          supported_providers: providers,
          auto_receipt_generation: !!body.auto_receipt_generation,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
    if (err1) throw err1;

    // 2. Update finance_policy
    const { error: err2 } = await db.from("system_settings").upsert(
      {
        setting_key: "finance_policy",
        category: "finance",
        description: "Bursary dual-control, write-offs, refund thresholds, and collection rules",
        setting_value: {
          currency: body.currency || "GHS",
          currency_symbol: body.currency_symbol || "GH₵",
          academic_year: body.academic_year || "2026/2027",
          active_semester: body.active_semester || "Semester 1",
          auto_generate_invoices: !!body.auto_generate_invoices,
          dual_control_enforced: !!body.dual_control_enforced,
          refund_dual_control_threshold: Number(body.refund_dual_control_threshold || 500),
          write_off_limit: Number(body.write_off_limit || 50),
          debt_threshold_exam_block_pct: Number(body.debt_threshold_exam_block_pct || 30),
          debt_transcript_hold: !!body.debt_transcript_hold,
          late_payment_penalty: Number(body.late_payment_penalty || 150),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
    if (err2) throw err2;

    // 3. Log to audit events
    try {
      await db.from("audit_events").insert({
        action: "FINANCE_POLICY_UPDATED",
        entity_type: "system_settings",
        entity_id: "finance_policy",
        actor_id: user?.id || null,
        actor_role: user?.role || "bursar",
        outcome: "SUCCESS",
        reason: "Updated finance policy, payment gateways, and dual control rules",
        new_values: body,
      });
    } catch (auditErr) {
      console.warn("Audit log warning (non-blocking):", auditErr);
    }

    return NextResponse.json({ success: true, message: "Finance settings saved successfully" });
  } catch (err: any) {
    console.error("POST /api/finance/settings error:", err);
    return NextResponse.json({ error: err.message || "Failed to save finance settings" }, { status: 500 });
  }
}
