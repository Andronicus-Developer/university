import { NextRequest, NextResponse } from "next/server";
import {
  getSchoolSidebarMenuItems,
  type SchoolType,
} from "@/lib/superadmin/school-menu-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolType = searchParams.get("school_type") as SchoolType | undefined;

    // By default, return only active menu items for schools
    const items = await getSchoolSidebarMenuItems(schoolType || undefined, true);
    return NextResponse.json(items);
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("Error fetching admin sidebar menu:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch admin sidebar menu" },
      { status: 500 }
    );
  }
}
