import { NextRequest, NextResponse } from "next/server";
import {
  getSystemAdmins,
  createSystemAdmin,
  updateSystemAdmin,
  deleteSystemAdmin,
} from "@/lib/superadmin/service";
import { verifySuperAdminRequest, mapSuperAdminErrorStatus } from "@/lib/superadmin/route-utils";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const admins = await getSystemAdmins();
    return NextResponse.json(admins);
  } catch (error: any) {
    console.error("Error fetching system admins:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch system admins" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySuperAdminRequest(request);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();

    if (!body.email || !body.password || !body.full_name || !body.university_id) {
      return NextResponse.json(
        { error: "Email, password, full name, and university assignment are required." },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const created = await createSystemAdmin({
      email: body.email.trim(),
      password: body.password,
      full_name: body.full_name.trim(),
      phone: body.phone?.trim(),
      university_id: body.university_id,
      university_name: body.university_name,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating system admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create system admin" },
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
      return NextResponse.json({ error: "System Admin ID is required for updating." }, { status: 400 });
    }

    const updated = await updateSystemAdmin(body.id, {
      full_name: body.full_name?.trim(),
      email: body.email?.trim() ? body.email.trim().toLowerCase() : undefined,
      phone: body.phone?.trim(),
      university_id: body.university_id,
      university_name: body.university_name,
      account_status: body.account_status,
      password: body.password?.trim() ? body.password : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating system admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update system admin" },
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
      return NextResponse.json({ error: "System Admin ID is required for deletion." }, { status: 400 });
    }

    const result = await deleteSystemAdmin(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting system admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete system admin" },
      { status: mapSuperAdminErrorStatus(error) }
    );
  }
}
