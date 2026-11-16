import { NextRequest, NextResponse } from "next/server";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "@/lib/superadmin/service";

export async function GET() {
  try {
    const roles = await getRoles();
    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Role code and role name are required." },
        { status: 400 }
      );
    }

    const created = await createRole({
      code: body.code,
      name: body.name,
      description: body.description,
      typical_restrictions: body.typical_restrictions,
      is_system_role: Boolean(body.is_system_role),
      permission_ids: Array.isArray(body.permission_ids) ? body.permission_ids : [],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create role" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Role ID is required for updates." },
        { status: 400 }
      );
    }

    const updated = await updateRole(body.id, {
      name: body.name,
      description: body.description,
      typical_restrictions: body.typical_restrictions,
      is_system_role: body.is_system_role,
      permission_ids: Array.isArray(body.permission_ids) ? body.permission_ids : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let roleId = searchParams.get("id");

    if (!roleId) {
      try {
        const body = await request.json();
        roleId = body.id;
      } catch {}
    }

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required for deletion." },
        { status: 400 }
      );
    }

    await deleteRole(roleId);
    return NextResponse.json({ success: true, message: "Role successfully deleted." });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete role" },
      { status: 500 }
    );
  }
}
