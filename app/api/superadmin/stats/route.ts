import { NextResponse } from "next/server";
import { getSuperAdminStats } from "@/lib/superadmin/service";

export async function GET() {
  try {
    const stats = await getSuperAdminStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}

