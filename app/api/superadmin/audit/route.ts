import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminApi } from "@/lib/superadmin/api-guard";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;

    const db = createDirectAdminClient() as any;
    const { data: logs, error } = await db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json([]);
    }

    return NextResponse.json(logs || []);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
