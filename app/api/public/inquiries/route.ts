import { NextRequest, NextResponse } from "next/server";
import { submitLandingInquiry } from "@/lib/landing/inquiry-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const forwarded = req.headers.get("x-forwarded-for") || "";
    const clientIp = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "api";

    const result = await submitLandingInquiry(body, clientIp);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to submit inquiry." },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        referenceId: result.referenceId,
        message: result.message,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/public/inquiries error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit inquiry. Please try again." },
      { status: 500 }
    );
  }
}
