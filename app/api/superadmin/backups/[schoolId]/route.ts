import { NextRequest, NextResponse } from "next/server";
import {
  mapSuperAdminErrorStatus,
  verifySuperAdminRequest,
} from "@/lib/superadmin/route-utils";
import { generateSchoolBackupPayload } from "@/lib/superadmin/backups-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ schoolId: string }> }
) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { schoolId } = await context.params;
    const exportedBy = String(auth.user?.email || "superadmin");

    const { filename, payload } = await generateSchoolBackupPayload(
      schoolId,
      exportedBy
    );

    const jsonBody = JSON.stringify(payload, null, 2);
    return new NextResponse(jsonBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Backup-Filename": filename,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("GET /api/superadmin/backups/[schoolId] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export school backup." },
      { status: mapSuperAdminErrorStatus(error) }
    );
  }
}
