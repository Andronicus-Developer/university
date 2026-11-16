import { NextRequest, NextResponse } from "next/server";
import { getSystemAdmins, createSystemAdmin } from "@/lib/superadmin/service";

export async function GET() {
  try {
    const admins = await getSystemAdmins();
    return NextResponse.json(admins);
  } catch (error: any) {
    console.error("Error fetching system admins:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch system admins" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: error.message || "Failed to create system admin" }, { status: 500 });
  }
}

