import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminRequest } from "@/lib/superadmin/route-utils";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "@/lib/academics/departments-programs-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const schoolId = req.nextUrl.searchParams.get("school_id") || null;
    const result = await listDepartments(schoolId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/superadmin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load departments." },
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
        { error: "Please select a school for this department." },
        { status: 400 }
      );
    }

    const department = await createDepartment({
      school_id: body.school_id,
      code: body.code,
      name: body.name,
      head_of_department: body.head_of_department,
      description: body.description,
      is_active: body.is_active,
    });

    return NextResponse.json({ success: true, department }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/superadmin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create department." },
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
        { error: "Department ID is required for updating." },
        { status: 400 }
      );
    }

    const department = await updateDepartment(
      String(body.id),
      {
        school_id: body.school_id,
        code: body.code,
        name: body.name,
        head_of_department: body.head_of_department,
        description: body.description,
        is_active: body.is_active,
      },
      null
    );

    return NextResponse.json({ success: true, department });
  } catch (err: any) {
    console.error("PUT /api/superadmin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update department." },
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
      return NextResponse.json({ error: "Department ID is required." }, { status: 400 });
    }

    const result = await deleteDepartment(String(id), null);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /api/superadmin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete department." },
      { status: err?.statusCode || 500 }
    );
  }
}
