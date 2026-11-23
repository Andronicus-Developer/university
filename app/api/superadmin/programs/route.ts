import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminRequest } from "@/lib/superadmin/route-utils";
import {
  createProgram,
  deleteProgram,
  listPrograms,
  updateProgram,
} from "@/lib/academics/departments-programs-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const schoolId = req.nextUrl.searchParams.get("school_id") || null;
    const result = await listPrograms(schoolId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/superadmin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load programs." },
      { status: err?.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body?.school_id) {
      return NextResponse.json(
        { error: "Please select a school for this program." },
        { status: 400 }
      );
    }

    const program = await createProgram({
      school_id: body.school_id,
      code: body.code,
      name: body.name,
      department_id: body.department_id,
      degree_level: body.degree_level,
      duration_years: body.duration_years,
      total_credits: body.total_credits,
      is_active: body.is_active,
    });

    return NextResponse.json({ success: true, program }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/superadmin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create program." },
      { status: err?.statusCode || 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json(
        { error: "Program ID is required for updating." },
        { status: 400 }
      );
    }

    const program = await updateProgram(
      String(body.id),
      {
        school_id: body.school_id,
        code: body.code,
        name: body.name,
        department_id: body.department_id,
        degree_level: body.degree_level,
        duration_years: body.duration_years,
        total_credits: body.total_credits,
        is_active: body.is_active,
      },
      null
    );

    return NextResponse.json({ success: true, program });
  } catch (err: any) {
    console.error("PUT /api/superadmin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update program." },
      { status: err?.statusCode || 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await req.json().catch(() => null);
      id = body?.id || null;
    }

    if (!id) {
      return NextResponse.json({ error: "Program ID is required." }, { status: 400 });
    }

    const result = await deleteProgram(String(id), null);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /api/superadmin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete program." },
      { status: err?.statusCode || 500 }
    );
  }
}
