import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminStats } from "@/lib/superadmin/service";
import { verifySuperAdminRequest } from "@/lib/superadmin/route-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const stats = await getSuperAdminStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("GET /api/superadmin/stats error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
