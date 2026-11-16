import { NextRequest, NextResponse } from "next/server";
import {
  getUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from "@/lib/superadmin/service";

export async function GET() {
  try {
    const universities = await getUniversities();
    return NextResponse.json(universities);
  } catch (error: any) {
    console.error("Error fetching universities:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch universities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.code) {
      return NextResponse.json({ error: "University name and code are required." }, { status: 400 });
    }

    const created = await createUniversity({
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      short_name: body.short_name?.trim() || "",
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
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating university:", error);
    return NextResponse.json({ error: error.message || "Failed to create university" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "University ID is required for updating." }, { status: 400 });
    }

    const updated = await updateUniversity(body.id, {
      name: body.name?.trim(),
      code: body.code?.trim() ? body.code.trim().toUpperCase() : undefined,
      short_name: body.short_name?.trim(),
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
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating university:", error);
    return NextResponse.json({ error: error.message || "Failed to update university" }, { status: 500 });
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
      return NextResponse.json({ error: "University ID is required for deletion." }, { status: 400 });
    }

    const result = await deleteUniversity(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error deleting university:", error);
    return NextResponse.json({ error: error.message || "Failed to delete university" }, { status: 500 });
  }
}
