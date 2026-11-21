import { NextRequest, NextResponse } from "next/server";
import {
  loadAllCommunications,
  persistCommunicationRecord,
  type CommunicationRecord,
} from "@/app/api/superadmin/communications/route";
import { extractUserFromCookies, decodeUserFromJwt } from "@/lib/supabase/fetch";

/**
 * Resend Inbound Email Webhook Receiver (`/api/webhooks/resend-inbound`)
 *
 * Accepts Resend inbound email webhook events (`email.received`) as well as
 * authenticated dashboard test reply payloads when a receiver replies to a Super Admin email.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret (if RESEND_WEBHOOK_SECRET is configured) OR active authenticated session
    const configuredSecret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
    const headerSecret =
      request.headers.get("x-webhook-secret") ||
      request.headers.get("svix-signature") ||
      "";
    const authHeader = request.headers.get("authorization") || "";
    const sessionUser =
      decodeUserFromJwt(authHeader) ||
      extractUserFromCookies(request.cookies.getAll());

    if (configuredSecret && headerSecret !== configuredSecret && !sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized webhook request" },
        { status: 401 }
      );
    }

    const payload = await request.json();

    // Support both Resend Webhook envelope (`{ type: "email.received", data: { ... } }`) and flat payload
    const emailData =
      payload.data && typeof payload.data === "object" ? payload.data : payload;

    const rawFrom = String(
      emailData.from || emailData.sender_email || emailData.sender || ""
    ).slice(0, 320);
    const rawTo = String(
      (Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to) ||
        emailData.recipient_to ||
        "superadmin@university.edu.gh"
    ).slice(0, 500);
    const rawCc =
      (Array.isArray(emailData.cc) ? emailData.cc.join(", ") : emailData.cc) ||
      emailData.recipient_cc ||
      null;

    // Parse "Display Name <email@domain.com>"
    let senderEmail = rawFrom.trim();
    let senderName = String(
      emailData.sender_name || emailData.from_name || ""
    ).slice(0, 120);
    const angleMatch = senderEmail.match(/^(.+?)\s*<([^>]+)>$/);
    if (angleMatch) {
      if (!senderName) {
        senderName = angleMatch[1].replace(/^["']|["']$/g, "").trim();
      }
      senderEmail = angleMatch[2].trim();
    }
    if (!senderName && senderEmail) {
      senderName = senderEmail.split("@")[0];
    }

    if (!senderEmail || !senderEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid sender email address is required in inbound payload" },
        { status: 400 }
      );
    }

    const subject = String(
      emailData.subject || "Re: Super Admin Communication"
    )
      .trim()
      .slice(0, 300);

    const rawBody =
      emailData.text ||
      emailData.body ||
      (emailData.html
        ? String(emailData.html)
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .trim()
        : "") ||
      "(No content)";
    const textBody = String(rawBody).slice(0, 20000);

    const existing = await loadAllCommunications();
    const cleanSubject = subject
      .replace(/^(Re|Fwd):\s*/i, "")
      .trim()
      .toLowerCase();

    let parentId: string | null = emailData.parent_id || null;
    let targetSchool: string = String(
      emailData.target_school || "School Administrator"
    ).slice(0, 150);
    let category: string = String(emailData.category || "General").slice(0, 50);

    if (!parentId) {
      const inReplyTo =
        emailData.in_reply_to || emailData.headers?.["in-reply-to"] || null;
      const parentMatch = existing.find(
        (c) =>
          (inReplyTo && c.resend_id && c.resend_id === inReplyTo) ||
          c.subject.replace(/^(Re|Fwd):\s*/i, "").trim().toLowerCase() ===
            cleanSubject
      );

      if (parentMatch) {
        parentId = parentMatch.id;
        targetSchool =
          emailData.target_school ||
          parentMatch.target_school ||
          targetSchool;
        category = emailData.category || parentMatch.category || category;
      }
    }

    const now = new Date().toISOString();
    const inboundRecord: CommunicationRecord = {
      id: crypto.randomUUID(),
      direction: "inbound",
      is_read: false,
      parent_id: parentId,
      sender_email: senderEmail,
      sender_name: senderName,
      recipient_to: rawTo,
      recipient_cc: rawCc ? String(rawCc).slice(0, 500) : null,
      recipient_bcc: null,
      target_school: targetSchool,
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      body: textBody,
      category,
      priority:
        emailData.priority === "high" || emailData.priority === "urgent"
          ? emailData.priority
          : "normal",
      status: "received",
      attachments: Array.isArray(emailData.attachments)
        ? emailData.attachments
            .slice(0, 10)
            .map((a: any) =>
              String(typeof a === "string" ? a : a.filename || "Attachment").slice(
                0,
                120
              )
            )
        : [],
      resend_id: String(
        emailData.email_id ||
          emailData.id ||
          `re_in_${crypto.randomUUID().slice(0, 8)}`
      ).slice(0, 100),
      delivery_note: "Received via Resend Inbound Webhook",
      sent_at: emailData.created_at || now,
      created_at: now,
    };

    await persistCommunicationRecord(inboundRecord);

    return NextResponse.json(
      {
        received: true,
        item: inboundRecord,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Resend inbound webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process inbound email webhook" },
      { status: 500 }
    );
  }
}
