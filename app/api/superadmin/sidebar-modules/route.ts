import { NextRequest, NextResponse } from "next/server";
import { getSuperAdminSidebarModules } from "@/lib/superadmin/service";
import { requireSuperAdminApi } from "@/lib/superadmin/api-guard";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;

    const modules = await getSuperAdminSidebarModules();
    return NextResponse.json(modules);
  } catch (error: any) {
    console.error("Error fetching super admin sidebar modules:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch modules" },
      { status: 500 }
    );
  }
}
