import { NextRequest, NextResponse } from "next/server";
import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
} from "@/lib/superadmin/service";
import {
  verifySuperAdminRequest,
  parseOptionalSchoolAdmin,
  normalizeSchoolPayload,
  mapSuperAdminErrorStatus,
} from "@/lib/superadmin/route-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const schools = await getSchools();
    return NextResponse.json(schools);
  } catch (error: any) {
    console.error("Error fetching schools:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch schools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();

    if (!body.name || !body.code) {
      return NextResponse.json({ error: "School name and code are required." }, { status: 400 });
    }

    const { admin, error: adminErr } = parseOptionalSchoolAdmin(body);
    if (adminErr) {
      return NextResponse.json({ error: adminErr }, { status: 400 });
    }

    const created = await createSchool({
      ...normalizeSchoolPayload(body, true),
      ...(admin ? { admin } : {}),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create school" },
      { status: mapSuperAdminErrorStatus(error) }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "School ID is required for updating." }, { status: 400 });
    }

    const updated = await updateSchool(body.id, normalizeSchoolPayload(body, false));
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating school:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update school" },
      { status: mapSuperAdminErrorStatus(error) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // No json body
      }
    }

    if (!id) {
      return NextResponse.json({ error: "School ID is required for deletion." }, { status: 400 });
    }

    const result = await deleteSchool(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete school" },
      { status: mapSuperAdminErrorStatus(error) }
    );
  }
}
