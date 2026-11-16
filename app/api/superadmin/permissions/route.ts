import { NextRequest, NextResponse } from "next/server";
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from "@/lib/superadmin/service";

export async function GET() {
  try {
    const permissions = await getPermissions();
    return NextResponse.json(permissions);
  } catch (error: any) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.code || !body.module) {
      return NextResponse.json(
        { error: "Permission code and module are required." },
        { status: 400 }
      );
    }

    const created = await createPermission({
      code: body.code,
      module: body.module,
      description: body.description,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating permission:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create permission" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Permission ID is required for updates." },
        { status: 400 }
      );
    }

    const updated = await updatePermission(body.id, {
      code: body.code,
      module: body.module,
      description: body.description,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating permission:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update permission" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let permId = searchParams.get("id");

    if (!permId) {
      try {
        const body = await request.json();
        permId = body.id;
      } catch {}
    }

    if (!permId) {
      return NextResponse.json(
        { error: "Permission ID is required for deletion." },
        { status: 400 }
      );
    }

    await deletePermission(permId);
    return NextResponse.json({ success: true, message: "Permission successfully deleted." });
  } catch (error: any) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete permission" },
      { status: 500 }
    );
  }
}
