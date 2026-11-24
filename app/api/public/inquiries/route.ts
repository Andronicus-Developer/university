import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createDirectAdminClient } from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const type = String(body.type || "").trim();
    if (type !== "demo_request" && type !== "sales_chat") {
      return NextResponse.json(
        { error: "Inquiry type must be 'demo_request' or 'sales_chat'." },
        { status: 400 }
      );
    }

    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const institutionName = String(body.institution_name || "").trim();

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "A valid work or institutional email is required." },
        { status: 400 }
      );
    }
    if (!institutionName) {
      return NextResponse.json(
        { error: "School or institution name is required." },
        { status: 400 }
      );
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000);
    let referenceId = "";
    let subject = "";
    let messageBody = "";
    let recipientTo = "";
    let priority: "high" | "normal" = "normal";

    if (type === "demo_request") {
      if (!phone) {
        return NextResponse.json(
          { error: "Phone number is required for demo requests." },
          { status: 400 }
        );
      }

      const schoolType = String(body.school_type || "University / Tertiary").trim();
      const studentCount = String(body.student_count || "Not specified").trim();
      const role = String(body.role || "School Administrator").trim();
      const preferredDate = String(body.preferred_date || "Flexible").trim();
      const preferredTime = String(body.preferred_time || "Morning (9AM-12PM)").trim();
      const interests = Array.isArray(body.interests)
        ? body.interests.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];
      const notes = String(body.notes || "").trim();

      referenceId = `ERD-DEMO-${randomCode}`;
      recipientTo = "demo@erudian360.com";
      priority = "high";
      subject = `[${referenceId}] Demo Request — ${institutionName} (${schoolType})`;
      messageBody = [
        `Reference ID: ${referenceId}`,
        `Type: Request Demo`,
        `Contact: ${fullName} (${role})`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Institution: ${institutionName}`,
        `Institution Type: ${schoolType}`,
        `Estimated Students: ${studentCount}`,
        `Preferred Schedule: ${preferredDate} · ${preferredTime}`,
        `Modules of Interest: ${interests.length > 0 ? interests.join(", ") : "Full Platform Tour"}`,
        notes ? `Additional Notes: ${notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      const chatMessage = String(body.message || "").trim();
      if (!chatMessage) {
        return NextResponse.json(
          { error: "Please enter a message or question for our sales team." },
          { status: 400 }
        );
      }

      const schoolType = String(body.school_type || "Not specified").trim();
      const topic = String(body.topic || "General Sales Inquiry").trim();
      const preferredChannel = String(body.preferred_channel || "Email").trim();

      referenceId = `ERD-SALES-${randomCode}`;
      recipientTo = "sales@erudian360.com";
      priority = "normal";
      subject = `[${referenceId}] Sales Inquiry (${topic}) — ${institutionName}`;
      messageBody = [
        `Reference ID: ${referenceId}`,
        `Type: Chat with Sales`,
        `Contact: ${fullName}`,
        `Email: ${email}`,
        phone ? `Phone / WhatsApp: ${phone}` : "",
        `Institution: ${institutionName} (${schoolType})`,
        `Inquiry Topic: ${topic}`,
        `Preferred Channel: ${preferredChannel}`,
        `Message:\n${chatMessage}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      direction: "inbound",
      is_read: false,
      sender_email: email,
      sender_name: fullName,
      recipient_to: recipientTo,
      target_school: institutionName,
      subject,
      body: messageBody,
      category: "General",
      priority,
      status: "received",
      sent_at: now,
      created_at: now,
    };

    try {
      const directAdmin = createDirectAdminClient();
      const { error: liveErr } = await (directAdmin as any)
        .from("communications")
        .insert(record);
      if (liveErr) {
        console.error("[POST /api/public/inquiries] live communications insert error:", liveErr);
      }
    } catch (liveEx) {
      console.error("[POST /api/public/inquiries] live communications exception:", liveEx);
    }

    try {
      const virtualAdmin = createAdminClient();
      await (virtualAdmin as any).from("communications").insert(record);
    } catch (virtEx) {
      console.error("[POST /api/public/inquiries] virtual communications error:", virtEx);
    }

    return NextResponse.json(
      {
        success: true,
        referenceId,
        message:
          type === "demo_request"
            ? "Your demo request has been received. Our education specialist will confirm your session shortly."
            : "Thank you for reaching out! Our sales team has received your inquiry and will reply shortly.",
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
