import { NextResponse } from "next/server";
import { getSuperAdminSidebarModules } from "@/lib/superadmin/service";

export async function GET() {
  try {
    const modules = await getSuperAdminSidebarModules();
    return NextResponse.json(modules);
  } catch (error: any) {
    console.error("Error fetching super admin sidebar modules:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch modules" }, { status: 500 });
  }
}

