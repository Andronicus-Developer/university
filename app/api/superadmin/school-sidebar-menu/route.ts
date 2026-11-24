import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/superadmin/api-guard";
import {
  getSchoolSidebarMenuItems,
  saveSchoolSidebarMenuItem,
  deleteSchoolSidebarMenuItem,
  toggleSchoolSidebarMenuItem,
  type SchoolType,
} from "@/lib/superadmin/school-menu-service";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const schoolType = searchParams.get("school_type") as SchoolType | undefined;
    const activeOnly = searchParams.get("active_only") === "true";

    const items = await getSchoolSidebarMenuItems(schoolType || undefined, activeOnly);
    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Error fetching school sidebar menu items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch school sidebar menu items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;
    const body = await request.json();

    if (!body.label || !body.href) {
      return NextResponse.json(
        { error: "Menu item label and route path (href) are required." },
        { status: 400 }
      );
    }

    const { item, pageCreated } = await saveSchoolSidebarMenuItem({
      id: body.id,
      label: body.label.trim(),
      href: body.href.trim(),
      category: body.category?.trim() || "Academics & Schedule",
      icon: body.icon || "BookOpen",
      badge: body.badge?.trim() || null,
      description: body.description?.trim() || "",
      school_types:
        Array.isArray(body.school_types)
          ? body.school_types
          : ["university", "high_school", "vocational_school"],
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      display_order: body.display_order ? Number(body.display_order) : undefined,
    });

    return NextResponse.json({ item, pageCreated, success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating school sidebar menu item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create school sidebar menu item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Menu item ID is required for editing." },
        { status: 400 }
      );
    }

    const { item, pageCreated } = await saveSchoolSidebarMenuItem(body);
    return NextResponse.json({ item, pageCreated, success: true });
  } catch (error: any) {
    console.error("Error updating school sidebar menu item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update school sidebar menu item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;
    const body = await request.json();

    if (!body.id || body.is_active === undefined) {
      return NextResponse.json(
        { error: "Item ID and is_active status are required." },
        { status: 400 }
      );
    }

    const updated = await toggleSchoolSidebarMenuItem(body.id, Boolean(body.is_active));
    return NextResponse.json({ item: updated, success: true });
  } catch (error: any) {
    console.error("Error toggling school sidebar menu item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle school sidebar menu item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireSuperAdminApi(request);
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Menu item ID is required for deletion." },
        { status: 400 }
      );
    }

    const success = await deleteSchoolSidebarMenuItem(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("Error deleting school sidebar menu item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete school sidebar menu item" },
      { status: 500 }
    );
  }
}
