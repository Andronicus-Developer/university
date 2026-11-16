import { NextRequest, NextResponse } from "next/server";
import { getUniversities, createUniversity } from "@/lib/superadmin/service";

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

