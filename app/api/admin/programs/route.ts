import { NextRequest, NextResponse } from "next/server";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";
import {
  createProgram,
  deleteProgram,
  listPrograms,
  updateProgram,
} from "@/lib/academics/departments-programs-service";
import { getSchoolTerminology } from "@/lib/academics/school-terminology";

// GET: Fetch academic programs, departments, and stats scoped to caller's school_id
export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const result = await listPrograms(tenant.schoolId);
    const terminology = getSchoolTerminology(result.school_type);

    if (!tenant.isSuperAdmin && !terminology.programs.visible) {
      return NextResponse.json({
        programs: [],
        departments: [],
        stats: {
          totalPrograms: 0,
          activePrograms: 0,
          undergraduateCount: 0,
          postgraduateCount: 0,
          diplomaCount: 0,
        },
        school_type: terminology.schoolType,
        restricted: true,
        redirectTo: terminology.programs.redirectWhenHidden,
      });
    }

    return NextResponse.json({
      programs: result.programs,
      departments: terminology.programs.showDepartmentField ? result.departments : [],
      stats: result.stats,
      school_type: terminology.schoolType,
      restricted: false,
    });
  } catch (err: any) {
    console.error("GET /api/admin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load academic programs." },
      { status: err?.statusCode || 500 }
    );
  }
}

// POST: Create a new academic program linked strictly to creating admin's school_id
export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;

    const program = await createProgram({
      school_id: targetSchool.schoolId,
      code: body.code,
      name: body.name,
      department_id: body.department_id,
      degree_level: body.degree_level,
      duration_years: body.duration_years,
      total_credits: body.total_credits,
      is_active: body.is_active,
    });

    return NextResponse.json({ success: true, program });
  } catch (err: any) {
    console.error("POST /api/admin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create program." },
      { status: err?.statusCode || 500 }
    );
  }
}

// PUT: Update an existing academic program (with tenant ownership enforcement)
export async function PUT(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json(
        { error: "Program ID is required for update." },
        { status: 400 }
      );
    }

    const program = await updateProgram(
      String(body.id),
      {
        ...(tenant.isSuperAdmin && body.school_id !== undefined
          ? { school_id: body.school_id }
          : {}),
        code: body.code,
        name: body.name,
        department_id: body.department_id,
        degree_level: body.degree_level,
        duration_years: body.duration_years,
        total_credits: body.total_credits,
        is_active: body.is_active,
      },
      tenant.isSuperAdmin ? null : tenant.schoolId
    );

    return NextResponse.json({ success: true, program });
  } catch (err: any) {
    console.error("PUT /api/admin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update program." },
      { status: err?.statusCode || 500 }
    );
  }
}

// DELETE: Delete an academic program belonging to caller's school
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
      return NextResponse.json({ error: "Program ID is required." }, { status: 400 });
    }

    const result = await deleteProgram(
      String(id),
      tenant.isSuperAdmin ? null : tenant.schoolId
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("DELETE /api/admin/programs error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete program." },
      { status: err?.statusCode || 500 }
    );
  }
}
