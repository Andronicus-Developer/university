import { NextRequest, NextResponse } from "next/server";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "@/lib/academics/departments-programs-service";
import { getSchoolTerminology } from "@/lib/academics/school-terminology";

// GET: Fetch departments and stats scoped strictly to caller's school_id
export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const result = await listDepartments(tenant.schoolId);
    const terminology = getSchoolTerminology(result.school_type);

    if (!tenant.isSuperAdmin && !terminology.departments.visible) {
      return NextResponse.json({
        departments: [],
        stats: {
          totalDepartments: 0,
          activeDepartments: 0,
          linkedProgramsCount: 0,
          withHeadCount: 0,
        },
        school_type: terminology.schoolType,
        restricted: true,
        redirectTo: terminology.departments.redirectWhenHidden,
      });
    }

    return NextResponse.json({
      departments: result.departments,
      stats: result.stats,
      school_type: terminology.schoolType,
      restricted: false,
    });
  } catch (err: any) {
    console.error("GET /api/admin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load departments." },
      { status: err?.statusCode || 500 }
    );
  }
}

// POST: Create a new department linked automatically to creating admin's school_id
export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const department = await createDepartment({
      school_id: targetSchool.schoolId,
      code: body.code,
      name: body.name,
      head_of_department: body.head_of_department,
      description: body.description,
      is_active: body.is_active,
    });

    return NextResponse.json({ success: true, department }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create department." },
      { status: err?.statusCode || 500 }
    );
  }
}

// PUT: Update an existing department belonging to caller's school_id
export async function PUT(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json(
        { error: "Department ID is required for update." },
        { status: 400 }
      );
    }

    const department = await updateDepartment(
      String(body.id),
      {
        ...(tenant.isSuperAdmin && body.school_id !== undefined
          ? { school_id: body.school_id }
          : {}),
        code: body.code,
        name: body.name,
        head_of_department: body.head_of_department,
        description: body.description,
        is_active: body.is_active,
      },
      tenant.isSuperAdmin ? null : tenant.schoolId
    );

    return NextResponse.json({ success: true, department });
  } catch (err: any) {
    console.error("PUT /api/admin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update department." },
      { status: err?.statusCode || 500 }
    );
  }
}

// DELETE: Delete a department belonging to caller's school_id
export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await req.json().catch(() => null);
      id = body?.id || null;
    }

    if (!id) {
      return NextResponse.json({ error: "Department ID is required." }, { status: 400 });
    }

    const result = await deleteDepartment(
      String(id),
      tenant.isSuperAdmin ? null : tenant.schoolId
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /api/admin/departments error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete department." },
      { status: err?.statusCode || 500 }
    );
  }
}
