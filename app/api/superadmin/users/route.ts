import { NextRequest, NextResponse } from "next/server";
import {
  getDirectoryUsers,
  createDirectoryUser,
  updateDirectoryUser,
  deleteDirectoryUser,
} from "@/lib/superadmin/service";

export async function GET() {
  try {
    const users = await getDirectoryUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching directory users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch directory users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, password, phone, role, school_id, account_status } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    if (!role || !role.trim()) {
      return NextResponse.json(
        { error: "A functional role must be selected" },
        { status: 400 }
      );
    }

    const newUser = await createDirectoryUser({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password: password?.trim() || undefined,
      phone: phone?.trim() || undefined,
      role: role.trim(),
      school_id: school_id || null,
      account_status: account_status || "active",
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("Error creating directory user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to provision user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const result = await updateDirectoryUser(id, updates);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating directory user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required for deletion" },
        { status: 400 }
      );
    }

    const result = await deleteDirectoryUser(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting directory user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 400 }
    );
  }
}
