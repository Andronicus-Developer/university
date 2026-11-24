import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { resolveFinancePortalContext } from "@/lib/finance/finance-context";

export async function GET(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveFinancePortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const fs = ctx.academicSettings?.finance_settings || {};
    return NextResponse.json({
      success: true,
      settings: {
        currency: ctx.currency,
        receipt_prefix: String(fs.receipt_prefix || "RCP"),
        receipt_footer: String(
          fs.receipt_footer || "Official receipt issued by School Bursary & Accounts."
        ),
        default_due_days: Number(fs.default_due_days || 30),
        online_payments_enabled: Boolean(fs.online_payments_enabled ?? false),
      },
    });
  } catch (err: any) {
    console.error("GET /api/finance/settings error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load finance settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveFinancePortalContext(req);
    if (errorResponse || !ctx) return errorResponse!;

    const body = await req.json().catch(() => ({}));
    const db = createDirectAdminClient() as any;

    const merged = {
      ...ctx.academicSettings,
      finance_settings: {
        receipt_prefix: String(body?.receipt_prefix || body?.receiptPrefix || "RCP")
          .trim()
          .toUpperCase(),
        receipt_footer: String(body?.receipt_footer || body?.receiptFooter || "").trim(),
        default_due_days: Number(body?.default_due_days || body?.defaultDueDays || 30),
        online_payments_enabled: Boolean(
          body?.online_payments_enabled ?? body?.onlinePaymentsEnabled ?? false
        ),
      },
    };

    const { error } = await db
      .from("schools")
      .update({ academic_settings: merged, updated_at: new Date().toISOString() })
      .eq("id", ctx.schoolId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, message: "Finance settings saved." });
  } catch (err: any) {
    console.error("POST /api/finance/settings error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save finance settings" },
      { status: 500 }
    );
  }
}
