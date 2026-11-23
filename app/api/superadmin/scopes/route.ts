import { NextRequest, NextResponse } from "next/server";
import {
  getScopes,
  createScope,
  updateScope,
  deleteScope,
} from "@/lib/superadmin/service";

export async function GET() {
  try {
    const scopes = await getScopes();
    return NextResponse.json(scopes);
  } catch (error: any) {
    console.error("Error fetching scopes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch scopes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.scopeType) {
      return NextResponse.json(
        { error: "Scope name and scope type are required." },
        { status: 400 }
      );
    }

    const created = await createScope({
      name: body.name.trim(),
      code: body.code?.trim(),
      scopeType: body.scopeType,
      institution_id: body.institution_id?.trim() || "",
      institution: body.institution?.trim() || "Global Scope",
      description: body.description?.trim() || "",
      capacity: body.capacity ? Number(body.capacity) : 100,
      dualControlRequired: Boolean(body.dualControlRequired),
      isolationLevel: body.isolationLevel || "strict",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating scope:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create scope" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        { error: "Scope ID is required for update." },
        { status: 400 }
      );
    }

    const updated = await updateScope(id, {
      name: body.name?.trim(),
      code: body.code?.trim(),
      scopeType: body.scopeType,
      institution_id: body.institution_id?.trim(),
      institution: body.institution?.trim(),
      description: body.description?.trim(),
      status: body.status,
      capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
      dualControlRequired: body.dualControlRequired !== undefined ? Boolean(body.dualControlRequired) : undefined,
      isolationLevel: body.isolationLevel,
      assignedUsersCount: body.assignedUsersCount !== undefined ? Number(body.assignedUsersCount) : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating scope:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update scope" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
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
        { error: "Scope ID is required for deletion." },
        { status: 400 }
      );
    }

    const result = await deleteScope(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting scope:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete scope" },
      { status: 500 }
    );
  }
}
