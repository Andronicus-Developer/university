import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminRequest } from "@/lib/superadmin/route-utils";
import {
  EXTENDED_TENANT_BACKUP_TABLES,
  LIVE_TENANT_BACKUP_TABLES,
  listSchoolsForBackup,
} from "@/lib/superadmin/backups-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const schools = await listSchoolsForBackup();
    return NextResponse.json(
      {
        schools,
        live_table_count: 1 + LIVE_TENANT_BACKUP_TABLES.length,
        extended_table_count: EXTENDED_TENANT_BACKUP_TABLES.length,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/superadmin/backups error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch schools for backup." },
      { status: 500 }
    );
  }
}
