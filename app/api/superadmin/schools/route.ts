import { NextRequest, NextResponse } from "next/server";
import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
} from "@/lib/superadmin/service";

export async function GET() {
  try {
    const schools = await getSchools();
    return NextResponse.json(schools);
  } catch (error: any) {
    console.error("Error fetching schools:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch schools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.code) {
      return NextResponse.json({ error: "School name and code are required." }, { status: 400 });
    }

    const schoolType = body.school_type || body.institution_type || "university";

    const created = await createSchool({
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      short_name: body.short_name?.trim() || "",
      school_type: schoolType,
      institution_type: schoolType,
      country: body.country?.trim() || "Ghana",
      city: body.city?.trim() || "Accra",
      address: body.address?.trim() || "",
      postal_code: body.postal_code?.trim() || "",
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      website: body.website?.trim() || "",
      motto: body.motto?.trim() || "",
      logo_url: body.logo_url?.trim() || "",
      default_currency: body.default_currency || "USD",
      currency_symbol: body.currency_symbol || "$",
      established_year: body.established_year ? Number(body.established_year) : undefined,
      accreditation_code: body.accreditation_code?.trim() || "",
      status: body.status || "active",
      full_access: body.full_access !== undefined ? Boolean(body.full_access) : true,
      max_users: body.max_users !== undefined && body.max_users !== null && body.max_users !== "" ? Number(body.max_users) : null,
      max_departments: body.max_departments !== undefined && body.max_departments !== null && body.max_departments !== "" ? Number(body.max_departments) : null,
      max_roles: body.max_roles !== undefined && body.max_roles !== null && body.max_roles !== "" ? Number(body.max_roles) : null,
      allowed_roles: Array.isArray(body.allowed_roles) ? body.allowed_roles : undefined,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating school:", error);
    return NextResponse.json({ error: error.message || "Failed to create school" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "School ID is required for updating." }, { status: 400 });
    }

    const updated = await updateSchool(body.id, {
      name: body.name?.trim(),
      code: body.code?.trim() ? body.code.trim().toUpperCase() : undefined,
      short_name: body.short_name?.trim(),
      school_type: body.school_type || body.institution_type,
      institution_type: body.school_type || body.institution_type,
      country: body.country?.trim(),
      city: body.city?.trim(),
      address: body.address?.trim(),
      postal_code: body.postal_code?.trim(),
      email: body.email?.trim(),
      phone: body.phone?.trim(),
      website: body.website?.trim(),
      motto: body.motto?.trim(),
      logo_url: body.logo_url?.trim(),
      default_currency: body.default_currency,
      currency_symbol: body.currency_symbol,
      established_year: body.established_year ? Number(body.established_year) : undefined,
      accreditation_code: body.accreditation_code?.trim(),
      status: body.status,
      full_access: body.full_access !== undefined ? Boolean(body.full_access) : undefined,
      max_users: body.max_users !== undefined ? (body.max_users === null || body.max_users === "" ? null : Number(body.max_users)) : undefined,
      max_departments: body.max_departments !== undefined ? (body.max_departments === null || body.max_departments === "" ? null : Number(body.max_departments)) : undefined,
      max_roles: body.max_roles !== undefined ? (body.max_roles === null || body.max_roles === "" ? null : Number(body.max_roles)) : undefined,
      allowed_roles: Array.isArray(body.allowed_roles) ? body.allowed_roles : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating school:", error);
    return NextResponse.json({ error: error.message || "Failed to update school" }, { status: 500 });
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
      } catch {
        // No json body
      }
    }

    if (!id) {
      return NextResponse.json({ error: "School ID is required for deletion." }, { status: 400 });
    }

    const result = await deleteSchool(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting school:", error);
    return NextResponse.json({ error: error.message || "Failed to delete school" }, { status: 500 });
  }
}
